import PaymentProvider from "./PaymentProvider.js";
import AppError from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { verifyMayaWebhook } from "./mayaSignature.js";
import { SANDBOX_WEBHOOK_PUBLIC_KEYS } from "./mayaPublicKeys.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maya amounts are in pesos (10 = PHP 10.00). Our database uses centavos.
const toCents = (pesos) => Math.round(Number(pesos) * 100);

export default class MayaProvider extends PaymentProvider {
    #publicKey;
    #secretKey;
    #baseUrl;
    #webhookKeys;

    constructor({ publicKey, secretKey, baseUrl, webhookPublicKeys = SANDBOX_WEBHOOK_PUBLIC_KEYS }) {
        super();
        this.#publicKey = publicKey;
        this.#secretKey = secretKey;
        this.#baseUrl = baseUrl;
        this.#webhookKeys = webhookPublicKeys;
    }

    get name() {
        return "maya";
    }

    // Creating a checkout uses the PUBLIC key. Everything else uses the SECRET key.
    async #call(method, path, { key, body } = {}) {
        try {
            const response = await fetch(`${this.#baseUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(15000)
            });
            const json = await response.json().catch(() => null);
            return { ok: response.ok, status: response.status, json };
        } catch (error) {
            logger.error(`Maya ${method} ${path} failed`, error.message);
            throw new AppError(502, "PAYMENT_PROVIDER_UNREACHABLE", "The payment provider could not be reached. Please try again.");
        }
    }

    async createCheckout({ order, urls }) {
        const { ok, status, json } = await this.#call("POST", "/checkout/v1/checkouts", {
            key: this.#publicKey,
            body: {
                totalAmount: { value: order.total_cents / 100, currency: "PHP" },
                requestReferenceNumber: order.id, // our order id comes back in the webhook
                redirectUrl: { success: urls.success, failure: urls.failure, cancel: urls.cancel }
            }
        });

        if (!ok || !json?.checkoutId || !json?.redirectUrl) {
            logger.error(`Maya create checkout -> ${status}`, JSON.stringify(json));
            throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "The payment provider rejected this payment request.");
        }
        return { reference: json.checkoutId, checkoutUrl: json.redirectUrl };
    }

    // Reconciliation: look the payment up by our order id (Maya calls it the request reference number).
    async findPayment(order) {
        const { ok, status, json } = await this.#call("GET", `/payments/v1/payment-rrns/${encodeURIComponent(order.id)}`, {
            key: this.#secretKey
        });

        if (status === 404) return { paid: false, paymentId: null, amountCents: null, currency: null, status: null, raw: null };
        if (!ok) {
            logger.error(`Maya find payment -> ${status}`, JSON.stringify(json));
            throw new AppError(502, "PAYMENT_PROVIDER_ERROR", "Could not check the payment status. Please try again.");
        }

        const payments = Array.isArray(json) ? json : [];
        const paid = payments.find((p) => p.isPaid === true || p.status === "PAYMENT_SUCCESS");
        if (!paid) {
            return { paid: false, paymentId: null, amountCents: null, currency: null, status: payments[0]?.status ?? null, raw: payments };
        }

        return {
            paid: true,
            paymentId: paid.id,
            amountCents: toCents(paid.amount ?? paid.totalAmount?.value),
            currency: paid.currency ?? paid.totalAmount?.currency,
            status: paid.status,
            raw: paid
        };
    }

    // Best effort: stops a customer from paying for an order that is already closed.
    async cancelCheckout(reference) {
        const { ok } = await this.#call("POST", `/payments/v1/payments/${encodeURIComponent(reference)}/cancel`, {
            key: this.#secretKey
        });
        return ok;
    }

    parseWebhook(rawBody, headers) {
        const signatureHeader = headers["x-maya-webhook-signature"];
        const timestamp = headers["x-maya-webhook-timestamp"];
        if (!signatureHeader || timestamp === undefined) {
            throw new AppError(401, "INVALID_SIGNATURE", "Missing webhook signature headers.");
        }

        let payload;
        try {
            payload = JSON.parse(rawBody.toString("utf8"));
        } catch {
            throw AppError.badRequest("Webhook body is not valid JSON.", "INVALID_JSON");
        }
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
            throw AppError.badRequest("Webhook body must be a JSON object.", "INVALID_JSON");
        }

        const check = verifyMayaWebhook({ payload, signatureHeader, timestamp, publicKeys: this.#webhookKeys });
        if (!check.ok) throw new AppError(401, "INVALID_SIGNATURE", check.reason);

        // ---- the signature is valid from here on ----
        const status = payload.status ?? payload.paymentStatus;
        const eventId = payload.id && status ? `${payload.id}:${status}` : null;

        // Only a successful payment changes an order. Every other event type is acknowledged and ignored.
        if (status !== "PAYMENT_SUCCESS" || !eventId) {
            return { eventId, type: "ignored", orderId: null, paymentId: payload.id ?? null, amountCents: null, currency: null, raw: payload };
        }

        const reference = payload.requestReferenceNumber;
        return {
            eventId,
            type: "payment.paid",
            // The shared sandbox sends us other people's payments too. Only UUID references can be ours.
            orderId: typeof reference === "string" && UUID_PATTERN.test(reference) ? reference : null,
            paymentId: payload.id,
            amountCents: toCents(payload.amount ?? payload.totalAmount?.value),
            currency: payload.currency ?? payload.totalAmount?.currency,
            raw: payload
        };
    }
}