// Usage: npm run maya:webhook -- https://YOUR-PUBLIC-HOST/api/v1/webhooks/maya [--replace]
import env from "../config/env.js";

const EVENTS = ["PAYMENT_SUCCESS", "PAYMENT_FAILED"];
const [callbackUrl, flag] = process.argv.slice(2);
const replace = flag === "--replace";

if (!callbackUrl?.startsWith("https://")) {
    console.error("Give the public HTTPS URL of your webhook, for example:");
    console.error("  npm run maya:webhook -- https://abc123.ngrok-free.app/api/v1/webhooks/maya");
    process.exit(1);
}
if (!env.MAYA_SECRET_KEY) {
    console.error("MAYA_SECRET_KEY is missing in backend/.env");
    process.exit(1);
}

const auth = `Basic ${Buffer.from(`${env.MAYA_SECRET_KEY}:`).toString("base64")}`;

async function call(method, path, body) {
    const response = await fetch(`${env.MAYA_BASE_URL}${path}`, {
        method,
        headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
        body: body ? JSON.stringify(body) : undefined
    });
    return { ok: response.ok, status: response.status, json: await response.json().catch(() => null) };
}

const hostOf = (url) => {
    try {
        return new URL(url).host;
    } catch {
        return "(unknown)";
    }
};

const list = await call("GET", "/payments/v1/webhooks");
if (!list.ok) {
    console.error(`Could not list webhooks (status ${list.status}):`, JSON.stringify(list.json));
    process.exit(1);
}
const existing = Array.isArray(list.json) ? list.json : [];

for (const name of EVENTS) {
    const current = existing.find((w) => w.name === name);

    if (!current) {
        const created = await call("POST", "/payments/v1/webhooks", { name, callbackUrl });
        console.log(created.ok ? `${name}: registered` : `${name}: failed (${created.status}) ${JSON.stringify(created.json)}`);
    } else if (current.callbackUrl === callbackUrl) {
        console.log(`${name}: already points to your URL`);
    } else if (!replace) {
        console.log(`${name}: already registered by someone else (${hostOf(current.callbackUrl)}).`);
        console.log("  The sandbox keys are shared. Re-run with --replace to point it to YOUR URL (their notifications will move to you).");
    } else {
        const updated = await call("PUT", `/payments/v1/webhooks/${current.id}`, { callbackUrl });
        console.log(updated.ok ? `${name}: updated to your URL` : `${name}: failed (${updated.status}) ${JSON.stringify(updated.json)}`);
    }
}