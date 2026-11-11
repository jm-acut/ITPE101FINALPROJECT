// Abstract payment provider. Every gateway implements this same contract,
// so the services never import a specific gateway.
export default class PaymentProvider {
    constructor() {
        if (new.target === PaymentProvider) {
            throw new TypeError("PaymentProvider is abstract and cannot be created directly.");
        }
    }

    get name() {
        throw new Error("Not implemented: name");
    }

    // -> { reference, checkoutUrl }
    async createCheckout(/* { order, urls: { success, failure, cancel } } */) {
        throw new Error("Not implemented: createCheckout");
    }

    // Asks the gateway whether an order was paid (reconciliation).
    // -> { paid, paymentId, amountCents, currency, status, raw }
    async findPayment(/* { id } */) {
        throw new Error("Not implemented: findPayment");
    }

    // -> true if the gateway cancelled the session, false if it refused
    async cancelCheckout(/* reference */) {
        throw new Error("Not implemented: cancelCheckout");
    }

    // Verifies the signature and returns a normalized event:
    // { eventId, type: "payment.paid" | "ignored", orderId, paymentId, amountCents, currency, raw }
    // Must throw an AppError (401) when the signature is invalid.
    parseWebhook(/* rawBody, headers */) {
        throw new Error("Not implemented: parseWebhook");
    }
}