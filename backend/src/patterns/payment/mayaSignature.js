import { createVerify } from "node:crypto";

export const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

// Step 1 of Maya's algorithm: turn the payload into "key=value" lines, using dots for nesting.
// Entries that are null, undefined, "", [] or {} are left out.
export function flattenPayload(obj, prefix = "", out = []) {
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        const empty =
            value === null ||
            value === undefined ||
            value === "" ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === "object" && Object.keys(value).length === 0);
        if (empty) continue;

        if (typeof value === "object") flattenPayload(value, fullKey, out);
        else out.push(`${fullKey}=${String(value)}`);
    }
    return out;
}

// "nonce=abc,v1=0a1b..." -> { nonce, v1 }
export function parseSignatureHeader(header) {
    const parts = {};
    for (const segment of String(header).split(",")) {
        const index = segment.indexOf("=");
        if (index > 0) parts[segment.slice(0, index).trim()] = segment.slice(index + 1).trim();
    }
    return parts;
}

// The signed text is: sorted "key=value" pairs joined by "&", then "&nonce=<nonce>".
export function verifySignatureV1(payload, signatureHex, nonce, publicKeys) {
    const signedText = `${flattenPayload(payload).sort().join("&")}&nonce=${nonce}`;

    return publicKeys.some((publicKey) => {
        try {
            const verifier = createVerify("RSA-SHA256");
            verifier.update(signedText);
            return verifier.verify(publicKey, signatureHex, "hex");
        } catch {
            return false;
        }
    });
}

// Maya sends Unix time in MILLISECONDS. Old webhooks are rejected to limit replay attacks.
export function isTimestampFresh(timestamp, now = Date.now()) {
    const value = Number(timestamp);
    return Number.isFinite(value) && Math.abs(now - value) <= TIMESTAMP_TOLERANCE_MS;
}

export function verifyMayaWebhook({ payload, signatureHeader, timestamp, publicKeys, now = Date.now() }) {
    if (!signatureHeader || timestamp === undefined) {
        return { ok: false, reason: "Missing webhook signature headers." };
    }
    if (!isTimestampFresh(timestamp, now)) {
        return { ok: false, reason: "Webhook timestamp is outside the allowed window." };
    }

    const { nonce, v1 } = parseSignatureHeader(signatureHeader);
    if (!nonce || !v1) return { ok: false, reason: "Malformed webhook signature header." };

    if (!verifySignatureV1(payload, v1, nonce, publicKeys)) {
        return { ok: false, reason: "Webhook signature does not match." };
    }
    return { ok: true };
}