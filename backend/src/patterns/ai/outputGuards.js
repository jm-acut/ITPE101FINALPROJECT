import { z } from "zod";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Text that looks like a price. Prices must come from the database, so such model text is thrown away.
const PRICE_LIKE = /(₱|\$|\busd\b|\bphp\b|\bpesos?\b)\s*\d|\d[\d,.]*\s*(₱|\bphp\b|\bpesos?\b|k\b)/i;

// Customer text is DATA. Remove the characters that could fake our <tags> and any control characters.
export const sanitizePrompt = (text) =>
    String(text)
        .replace(/[<>]/g, " ")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

// Model text is untrusted. It is shown as plain text only, never as HTML, and never if it quotes a price.
export function cleanText(text, fallback = "", max = 400) {
    const flat = String(text ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
    if (!flat || PRICE_LIKE.test(flat)) return fallback;
    return flat.slice(0, max);
}

// The shape the model must answer in. Anything else is rejected.
const modelOutputSchema = z.object({
    summary: z.string().trim().min(1).max(800),
    parts: z
        .array(
            z.object({
                partId: z.string(),
                reason: z.string().max(400).optional().default("")
            })
        )
        .min(1)
        .max(12)
});

export function parseModelOutput(data) {
    const result = modelOutputSchema.safeParse(data);
    return result.success ? result.data : null;
}

// Keeps only ids that are real UUIDs AND were in the catalog we retrieved from the database.
// Everything else is discarded and counted.
export function selectGrounded(modelParts, catalogById) {
    const accepted = [];
    let discarded = 0;

    for (const item of modelParts) {
        if (!UUID_PATTERN.test(item.partId) || !catalogById.has(item.partId)) {
            discarded += 1;
            continue;
        }
        accepted.push({ id: item.partId, reason: cleanText(item.reason, "", 160) });
    }
    return { accepted: accepted.slice(0, 10), discarded };
}