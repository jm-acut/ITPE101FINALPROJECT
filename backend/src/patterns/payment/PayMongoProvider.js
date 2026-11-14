import { createHmac, timingSafeEqual } from "node:crypto";
import PaymentProvider from "./PaymentProvider.js";
import AppError from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";

const API_BASE = "https://api.paymongo.com/v1";
const PAYMENT_METHODS = ["card", "gcash", "paymaya"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const safeEqual = (a, b) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

// Second concrete provider. Written from PayMongo's documentation (hosted Checkout Sessions and signed webhooks).
// PayMongo amounts are already in centavos, so no conversion is needed here.
export default class PayMongoProvider extends PaymentProvider {
    #secretKey;
    #webhookSecret;
    #baseUrl;

    constructor({ secretKey, webhookSecret, baseUrl = API_BASE }) {
        super();
        this.#secretKey = secretKey;
        this.#webhookSecret = webhookSecret;
        this.#baseUrl = baseUrl;
    }

    get name() {
        return "paymongo";
    }

    async #call(method, path, body) {
        try {
            const response = await fetch(`${this.#baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Basic ${Buffer.from(`${this.#secretKey}:`).toString("base64")}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(15000)
            });
            const json = await response.json().catch(() => null);
            return { ok: response.ok, status: response.status, json };
        } catch (error) {
            logger.error(`PayMongo ${method} ${path} failed`, error.message);
            throw new AppError(502, "PAYMENT_PROVIDER_UNREACHABLE", "The payment provider could not be reached. Please try again.");
        }
    }

    async createCheckout({ order, urls }) {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const shortId = order.id.slice(0, 8).toUpperCase();

        // One line item for the full total: PayMongo line items cannot be negative, so a single line
        // is the only way discounts and shipping always add up to the exact order total.
        const { ok, status, json } = await this.#call("POST", "/checkout_sessions", {
            data: {
                attributes: {
                    line_items: [
                        {
                            name: `NEXUS PC order #${shortId}`,
                            description: `${itemCount} item(s), shipping and discounts included`,
                            amount: order.total_cents,
                            currency: "PHP",
                            quantity: 1
                        }
                    ],
                    payment_method_types: PAYMENT_METHODS,
                    description: `NEXUS PC order #${shortId}`,
                    reference_number: order.id,
                    metadata: { order_id: order.id },
                    success_url: urls.success,
                    cancel_url: urls.cancel,
                    send_email_receipt: false,
                    show_description: true,
                    show_line_items: true
                }
            }
        });

        if (!ok || !json?.data?.id || !json?.data?.attributes?.checkout_url) {
            logger.error(`PayMongo create checkout -> ${status}`, JSON.stringify(json?.errors ?? json));
            throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider rejected this payment request.");
        }
        return { reference: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
    }

    async findPayment({ reference }) {
        const { ok, status, json } = await this.#call("GET", `/checkout_sessions/${encodeURIComponent(reference)}`);
        if (status === 404) return { paid: false, paymentId: null, amountCents: null, currency: null, status: null, raw: null };
        if (!ok) {
            logger.error(`PayMongo find payment -> ${status}`, JSON.stringify(json?.errors ?? json));
            throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "Could not check the payment status. Please try again.");
        }

        const attributes = json?.data?.attributes ?? {};
        const paid = (attributes.payments ?? []).find((p) => p.attributes?.status === "paid");
        if (!paid) return { paid: false, paymentId: null, amountCents: null, currency: null, status: attributes.status ?? null, raw: json };

        return {
            paid: true,
            paymentId: paid.id,
            amountCents: paid.attributes.amount,
            currency: paid.attributes.currency ?? "PHP",
            status: "paid",
            raw: json
        };
    }

    async cancelCheckout(reference) {
        const { ok } = await this.#call("POST", `/checkout_sessions/${encodeURIComponent(reference)}/expire`);
        return ok;
    }

    parseWebhook(rawBody, headers) {
        if (!this.#webhookSecret) {
            throw new AppError(503, "WEBHOOK_NOT_CONFIGURED", "The webhook secret is not configured on this server.");
        }
        const header = headers["paymongo-signature"];
        if (!header) throw new AppError(401, "INVALID_SIGNATURE", "Missing webhook signature.");

        // Header looks like: t=<timestamp>,te=<test signature>,li=<live signature>
        const parts = {};
        for (const segment of String(header).split(",")) {
            const index = segment.indexOf("=");
            if (index > 0) parts[segment.slice(0, index).trim()] = segment.slice(index + 1).trim();
        }

        // The signature covers "<timestamp>.<raw body>", so it is computed on the untouched bytes.
        const expected = createHmac("sha256", this.#webhookSecret)
            .update(Buffer.concat([Buffer.from(`${parts.t}.`), rawBody]))
            .digest("hex");
        const valid = [parts.te, parts.li].filter(Boolean).some((candidate) => safeEqual(candidate, expected));
        if (!valid) throw new AppError(401, "INVALID_SIGNATURE", "Webhook signature does not match.");

        let payload;
        try {
            payload = JSON.parse(rawBody.toString("utf8"));
        } catch {
            throw AppError.badRequest("Webhook body is not valid JSON.", "INVALID_JSON");
        }

        // ---- the signature is valid from here on ----
        // PayMongo documents two envelope shapes. Support both.
        const root = payload?.data ?? {};
        const classic = root.type === "event" || root.attributes?.type !== undefined;
        const type = classic ? root.attributes?.type : root.type;
        const resource = classic ? root.attributes?.data : root.data;
        const livemode = classic ? root.attributes?.livemode : root.livemode;

        // A test-mode key must never process live events, or the other way around.
        const expectedLive = !this.#secretKey?.startsWith("sk_test_");
        const ignored = { eventId: null, type: "ignored", orderId: null, paymentId: null, amountCents: null, currency: null, raw: payload };
        if (livemode !== undefined && livemode !== expectedLive) return ignored;
        if (type !== "checkout_session.payment.paid" || !resource?.id) return ignored;

        const payments = resource.attributes?.payments ?? [];
        const paidPayment = payments.find((p) => p.attributes?.status === "paid") ?? payments[0];
        const reference = resource.attributes?.reference_number ?? resource.attributes?.metadata?.order_id;

        return {
            eventId: classic && root.id ? root.id : `${type}:${paidPayment?.id ?? resource.id}`,
            type: "payment.paid",
            orderId: typeof reference === "string" && UUID_PATTERN.test(reference) ? reference : null,
            paymentId: paidPayment?.id ?? resource.id,
            amountCents: paidPayment?.attributes?.amount ?? null,
            currency: paidPayment?.attributes?.currency ?? "PHP",
            raw: payload
        };
    }
}