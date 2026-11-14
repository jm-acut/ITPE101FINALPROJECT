import { createHmac, createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import AppError from "../src/utils/AppError.js";
import PaymentProvider from "../src/patterns/payment/PaymentProvider.js";
import MayaProvider from "../src/patterns/payment/MayaProvider.js";
import PayMongoProvider from "../src/patterns/payment/PayMongoProvider.js";
import { createPaymentProvider, PROVIDER_NAMES } from "../src/patterns/payment/createPaymentProvider.js";
import { flattenPayload } from "../src/patterns/payment/mayaSignature.js";

// ---------- helpers ----------
const ORDER = { id: randomUUID(), total_cents: 115000, items: [{ quantity: 2 }] };
const URLS = { success: "http://localhost:5173/s", failure: "http://localhost:5173/f", cancel: "http://localhost:5173/c" };

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Replaces the network for one test and records every request.
async function withFetch(handler, run) {
    const original = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url, method: options.method, headers: options.headers, body: options.body ? JSON.parse(options.body) : undefined });
        return handler(url, options);
    };
    try {
        await run(calls);
    } finally {
        globalThis.fetch = original;
    }
}

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const rsaPem = rsa.publicKey.export({ type: "spki", format: "pem" });

const settings = {
    maya: { publicKey: "pk-test", secretKey: "sk-test", baseUrl: "https://maya.test", webhookPublicKeys: [rsaPem] },
    paymongo: { secretKey: "sk_test_abc", webhookSecret: "whsk_test_secret", baseUrl: "https://paymongo.test/v1" }
};

// A Maya webhook, signed the way Maya signs it.
function mayaWebhook(payload, { timestamp = Date.now(), nonce = "n-1" } = {}) {
    const text = `${flattenPayload(payload).sort().join("&")}&nonce=${nonce}`;
    const signature = createSign("RSA-SHA256").update(text).sign(rsa.privateKey, "hex");
    return {
        raw: Buffer.from(JSON.stringify(payload)),
        headers: { "x-maya-webhook-signature": `nonce=${nonce},v1=${signature}`, "x-maya-webhook-timestamp": String(timestamp) }
    };
}
const mayaPaid = (overrides = {}) => ({ id: "pay_1", isPaid: true, status: "PAYMENT_SUCCESS", amount: 1150, currency: "PHP", requestReferenceNumber: ORDER.id, ...overrides });

// A PayMongo webhook, signed the way PayMongo signs it.
function payMongoWebhook(payload, { secret = "whsk_test_secret", t = "1700000000" } = {}) {
    const raw = Buffer.from(JSON.stringify(payload));
    const signature = createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${t}.`), raw])).digest("hex");
    return { raw, headers: { "paymongo-signature": `t=${t},te=${signature},li=` } };
}
const payMongoPaid = ({ amount = 115000, livemode = false, type = "checkout_session.payment.paid" } = {}) => ({
    data: {
        id: "evt_1", type: "event",
        attributes: {
            type, livemode,
            data: { id: "cs_1", type: "checkout_session", attributes: { reference_number: ORDER.id, payments: [{ id: "pay_pm_1", type: "payment", attributes: { status: "paid", amount, currency: "PHP" } }] } }
        }
    }
});

// ---------- the abstract contract ----------
describe("PaymentProvider (abstract base class)", () => {
    it("cannot be created directly", () => {
        expect(() => new PaymentProvider()).toThrow(TypeError);
    });

    it("makes a subclass implement every method", async () => {
        class Incomplete extends PaymentProvider {}
        const provider = new Incomplete();
        expect(() => provider.name).toThrow(/Not implemented/);
        await expect(provider.createCheckout()).rejects.toThrow(/Not implemented/);
        await expect(provider.findPayment()).rejects.toThrow(/Not implemented/);
        await expect(provider.cancelCheckout()).rejects.toThrow(/Not implemented/);
        expect(() => provider.parseWebhook()).toThrow(/Not implemented/);
    });
});

describe("the factory (Factory Method)", () => {
    it("builds a different concrete class for each name, all usable as the base type", () => {
        expect(PROVIDER_NAMES).toEqual(["maya", "paymongo"]);

        const maya = createPaymentProvider("maya", settings);
        const paymongo = createPaymentProvider("paymongo", settings);

        expect(maya).toBeInstanceOf(MayaProvider);
        expect(paymongo).toBeInstanceOf(PayMongoProvider);
        for (const provider of [maya, paymongo]) {
            expect(provider).toBeInstanceOf(PaymentProvider);
            expect(typeof provider.createCheckout).toBe("function");
            expect(typeof provider.findPayment).toBe("function");
            expect(typeof provider.cancelCheckout).toBe("function");
            expect(typeof provider.parseWebhook).toBe("function");
        }
        expect(maya.name).toBe("maya");
        expect(paymongo.name).toBe("paymongo");
    });

    it("refuses an unknown provider name with a controlled 503", () => {
        expect(() => createPaymentProvider("stripe", settings)).toThrow(AppError);
        try {
            createPaymentProvider("stripe", settings);
        } catch (error) {
            expect(error.statusCode).toBe(503);
            expect(error.code).toBe("PAYMENT_NOT_CONFIGURED");
        }
    });

    it("refuses a provider whose keys are missing with a controlled 503", () => {
        for (const kind of PROVIDER_NAMES) {
            try {
                createPaymentProvider(kind, {});
                expect("should have thrown").toBe("it threw");
            } catch (error) {
                expect(error.code).toBe("PAYMENT_NOT_CONFIGURED");
            }
        }
    });
});

// ---------- polymorphism: the same calls, two gateways ----------
describe("both providers answer the same contract", () => {
    const gateway = (url) => {
        if (url.includes("maya.test")) return jsonResponse(200, { checkoutId: "chk_maya_1", redirectUrl: "https://maya.test/pay/1" });
        return jsonResponse(200, { data: { id: "cs_pm_1", attributes: { checkout_url: "https://paymongo.test/pay/1" } } });
    };

    it("creates a checkout through the base type, each gateway in its own units", async () => {
        await withFetch(gateway, async (calls) => {
            for (const kind of PROVIDER_NAMES) {
                const provider = createPaymentProvider(kind, settings); // the caller only knows PaymentProvider
                const session = await provider.createCheckout({ order: ORDER, urls: URLS });
                expect(session.reference).toBeTruthy();
                expect(session.checkoutUrl).toContain("https://");
            }

            const maya = calls.find((c) => c.url.includes("maya.test"));
            const paymongo = calls.find((c) => c.url.includes("paymongo.test"));

            // Maya talks in pesos, PayMongo in centavos. The service never sees the difference.
            expect(maya.body.totalAmount.value).toBe(1150);
            expect(maya.body.requestReferenceNumber).toBe(ORDER.id);
            expect(maya.headers.Authorization).toBe(`Basic ${Buffer.from("pk-test:").toString("base64")}`); // public key

            expect(paymongo.body.data.attributes.line_items[0].amount).toBe(115000);
            expect(paymongo.body.data.attributes.reference_number).toBe(ORDER.id);
            expect(paymongo.headers.Authorization).toBe(`Basic ${Buffer.from("sk_test_abc:").toString("base64")}`); // secret key
        });
    });

    it("turns a gateway refusal into a controlled 502 for both", async () => {
        await withFetch(() => jsonResponse(400, { errors: [{ detail: "bad" }] }), async () => {
            for (const kind of PROVIDER_NAMES) {
                const provider = createPaymentProvider(kind, settings);
                await expect(provider.createCheckout({ order: ORDER, urls: URLS })).rejects.toMatchObject({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR" });
            }
        });
    });

    it("finds a paid payment and reports centavos for both", async () => {
        const handler = (url) =>
            url.includes("maya.test")
                ? jsonResponse(200, [{ id: "pay_1", isPaid: true, status: "PAYMENT_SUCCESS", amount: 1150, currency: "PHP" }])
                : jsonResponse(200, { data: { attributes: { status: "active", payments: [{ id: "pay_pm_1", attributes: { status: "paid", amount: 115000, currency: "PHP" } }] } } });

        await withFetch(handler, async () => {
            for (const kind of PROVIDER_NAMES) {
                const found = await createPaymentProvider(kind, settings).findPayment({ orderId: ORDER.id, reference: "cs_1" });
                expect(found.paid).toBe(true);
                expect(found.amountCents).toBe(115000);
                expect(found.currency).toBe("PHP");
            }
        });
    });

    it("reports 'not paid' for an unknown payment and fails clearly when the gateway is down", async () => {
        await withFetch(() => jsonResponse(404, {}), async () => {
            for (const kind of PROVIDER_NAMES) {
                const found = await createPaymentProvider(kind, settings).findPayment({ orderId: ORDER.id, reference: "cs_1" });
                expect(found.paid).toBe(false);
            }
        });
        await withFetch(() => jsonResponse(500, {}), async () => {
            for (const kind of PROVIDER_NAMES) {
                await expect(createPaymentProvider(kind, settings).findPayment({ orderId: ORDER.id, reference: "cs_1" })).rejects.toMatchObject({ statusCode: 502 });
            }
        });
    });

    it("closes a session and reports whether the gateway agreed", async () => {
        for (const accepted of [true, false]) {
            await withFetch(() => jsonResponse(accepted ? 200 : 400, {}), async () => {
                for (const kind of PROVIDER_NAMES) {
                    expect(await createPaymentProvider(kind, settings).cancelCheckout("cs_1")).toBe(accepted);
                }
            });
        }
    });
});

// ---------- webhook verification, one test group per gateway ----------
describe("MayaProvider webhooks", () => {
    const provider = createPaymentProvider("maya", settings);

    it("accepts a signed payment and converts pesos to centavos", () => {
        const { raw, headers } = mayaWebhook(mayaPaid());
        const event = provider.parseWebhook(raw, headers);
        expect(event).toMatchObject({ type: "payment.paid", orderId: ORDER.id, paymentId: "pay_1", amountCents: 115000, currency: "PHP", eventId: "pay_1:PAYMENT_SUCCESS" });
    });

    it("rounds a fractional peso amount to the exact centavo", () => {
        const { raw, headers } = mayaWebhook(mayaPaid({ amount: 1150.55 }));
        expect(provider.parseWebhook(raw, headers).amountCents).toBe(115055);
    });

    it("rejects a missing, altered, or stale signature with 401", () => {
        const signed = mayaWebhook(mayaPaid());
        expect(() => provider.parseWebhook(signed.raw, {})).toThrow(AppError);

        const altered = Buffer.from(JSON.stringify(mayaPaid({ amount: 1 })));
        expect(() => provider.parseWebhook(altered, signed.headers)).toThrow(/does not match/);

        const stale = mayaWebhook(mayaPaid(), { timestamp: Date.now() - 10 * 60 * 1000 });
        expect(() => provider.parseWebhook(stale.raw, stale.headers)).toThrow(/timestamp/);
    });

    it("acknowledges and ignores other event types", () => {
        const { raw, headers } = mayaWebhook(mayaPaid({ status: "PAYMENT_FAILED", isPaid: false }));
        expect(provider.parseWebhook(raw, headers).type).toBe("ignored");
    });

    it("does not treat a reference that is not ours as an order", () => {
        const { raw, headers } = mayaWebhook(mayaPaid({ requestReferenceNumber: "someone-elses-order" }));
        expect(provider.parseWebhook(raw, headers).orderId).toBeNull();
    });
});

describe("PayMongoProvider webhooks", () => {
    const provider = createPaymentProvider("paymongo", settings);

    it("accepts a signed payment, already in centavos", () => {
        const { raw, headers } = payMongoWebhook(payMongoPaid());
        const event = provider.parseWebhook(raw, headers);
        expect(event).toMatchObject({ type: "payment.paid", orderId: ORDER.id, paymentId: "pay_pm_1", amountCents: 115000, currency: "PHP", eventId: "evt_1" });
    });

    it("rejects a missing, altered, or wrongly signed body with 401", () => {
        const signed = payMongoWebhook(payMongoPaid());
        expect(() => provider.parseWebhook(signed.raw, {})).toThrow(/Missing/);
        expect(() => provider.parseWebhook(Buffer.from(JSON.stringify(payMongoPaid({ amount: 1 }))), signed.headers)).toThrow(/does not match/);

        const wrongSecret = payMongoWebhook(payMongoPaid(), { secret: "whsk_someone_else" });
        expect(() => provider.parseWebhook(wrongSecret.raw, wrongSecret.headers)).toThrow(/does not match/);
    });

    it("ignores other event types and live events sent to a test-mode key", () => {
        const failed = payMongoWebhook(payMongoPaid({ type: "payment.failed" }));
        expect(provider.parseWebhook(failed.raw, failed.headers).type).toBe("ignored");

        const live = payMongoWebhook(payMongoPaid({ livemode: true }));
        expect(provider.parseWebhook(live.raw, live.headers).type).toBe("ignored");
    });

    it("reads the newer envelope shape and builds a stable event id", () => {
        const newer = {
            data: { type: "checkout_session.payment.paid", livemode: false, data: { id: "cs_9", attributes: { reference_number: ORDER.id, payments: [{ id: "pay_pm_9", attributes: { status: "paid", amount: 115000 } }] } } }
        };
        const { raw, headers } = payMongoWebhook(newer);
        expect(provider.parseWebhook(raw, headers)).toMatchObject({ type: "payment.paid", eventId: "checkout_session.payment.paid:pay_pm_9", orderId: ORDER.id });
    });

    it("refuses to verify anything when no webhook secret is configured", () => {
        const unconfigured = new PayMongoProvider({ secretKey: "sk_test_abc" });
        const { raw, headers } = payMongoWebhook(payMongoPaid());
        expect(() => unconfigured.parseWebhook(raw, headers)).toThrow(/not configured/);
    });
});