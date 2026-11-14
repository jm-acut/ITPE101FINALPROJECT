// Abstract payment provider. Every gateway implements this same contract,
// so the services never import a specific gateway.
//
// Money rule for the contract: every amount that leaves a provider is an integer number of CENTAVOS.
// A provider that talks in pesos (Maya) converts inside itself.
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
    // Maya looks the payment up by orderId; PayMongo by the checkout session reference. Each uses what it needs.
    // -> { paid, paymentId, amountCents, currency, status, raw }
    async findPayment(/* { orderId, reference } */) {
        throw new Error("Not implemented: findPayment");
    }

    // -> true if the gateway closed the session, false if it refused (for example it is already paid)
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