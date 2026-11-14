import AppError from "../utils/AppError.js";

// COMPOSITION: this service owns no database code and no gateway code. It is built from collaborators that are
// handed in (dependency injection): a provider getter, the payment and order repositories, the order service,
// the client address, and a logger. Tests build it with fakes. Production builds it in paymentService.js.
export default class PaymentService {
    #getProvider;
    #payments;
    #orders;
    #orderService;
    #clientBaseUrl;
    #log;

    constructor({ getProvider, payments, orders, orderService, clientBaseUrl, logger }) {
        this.#getProvider = getProvider;
        this.#payments = payments;
        this.#orders = orders;
        this.#orderService = orderService;
        this.#clientBaseUrl = clientBaseUrl;
        this.#log = logger;
    }

    async #loadOwned(userId, orderId) {
        const order = await this.#orders.findById(orderId);
        if (!order || order.user_id !== userId) throw AppError.notFound("Order not found.", "ORDER_NOT_FOUND");
        return order;
    }

    #tryProvider() {
        try {
            return this.#getProvider();
        } catch {
            return null; // payments are not configured
        }
    }

    // Applies a payment that the gateway confirmed. One database function decides the outcome.
    #applyPaid(orderId, found) {
        return this.#payments.markPaid({
            orderId,
            paymentId: found.paymentId,
            amountCents: found.amountCents,
            currency: found.currency,
            raw: found.raw
        });
    }

    // Creates (or reuses) a hosted checkout session for an unpaid order.
    async startPayment(userId, orderId) {
        const order = await this.#loadOwned(userId, orderId);

        if (order.status !== "pending_payment") {
            throw AppError.conflict("This order is not awaiting payment.", "ORDER_NOT_PAYABLE");
        }
        const windowEnded = (order.reservations ?? []).some(
            (r) => r.status === "active" && new Date(r.expires_at) <= new Date()
        );
        if (windowEnded) {
            throw AppError.conflict("The payment window for this order has ended.", "PAYMENT_WINDOW_ENDED");
        }

        // Clicking Pay twice sends the customer to the same session.
        const existing = await this.#payments.findPendingByOrder(orderId);
        if (existing?.raw?.checkoutUrl) return { checkoutUrl: existing.raw.checkoutUrl };

        const provider = this.#getProvider();
        const base = this.#clientBaseUrl();
        const session = await provider.createCheckout({
            order,
            urls: {
                success: `${base}/orders/${orderId}?payment=success`,
                failure: `${base}/orders/${orderId}?payment=failed`,
                cancel: `${base}/orders/${orderId}?payment=cancelled`
            }
        });

        const attached = await this.#payments.attachSession({
            orderId,
            provider: provider.name,
            reference: session.reference,
            amountCents: order.total_cents,
            checkoutUrl: session.checkoutUrl
        });

        // Two simultaneous clicks: the database kept the first session, so close the extra one.
        if (!attached.created) provider.cancelCheckout(session.reference).catch(() => {});

        return { checkoutUrl: attached.checkoutUrl };
    }

    // Retrieve-on-return: when the customer comes back, ask the gateway directly.
    // Used when a webhook is slow or missing. Goes through the same safe database function.
    async syncPayment(userId, orderId) {
        const order = await this.#loadOwned(userId, orderId);

        if (order.status === "pending_payment") {
            const pending = await this.#payments.findPendingByOrder(orderId);
            if (pending) {
                const found = await this.#getProvider().findPayment({ orderId, reference: pending.gateway_reference });
                if (found.paid) {
                    const result = await this.#applyPaid(orderId, found);
                    this.#log.info(`Order ${orderId} confirmed by retrieval: ${result.outcome}`);
                }
            }
        }
        return this.#orderService.getOwn(userId, orderId);
    }

    // Called by the webhook controller AFTER the signature was verified.
    async handleEvent(event) {
        if (event.type !== "payment.paid") return "ignored";

        let orderId = event.orderId;
        if (!orderId) orderId = (await this.#payments.findByReference(event.paymentId))?.order_id ?? null;

        // Events for orders that are not ours (the shared sandbox sends those too) are acknowledged and ignored.
        if (!orderId || !(await this.#payments.orderExists(orderId))) return "unknown_order";

        const record = await this.#payments.recordWebhook({
            eventId: event.eventId,
            eventType: "PAYMENT_SUCCESS",
            payload: event.raw
        });
        // Already handled: acknowledge so the gateway stops retrying. (If an earlier attempt failed midway it is retried.)
        if (record.duplicate && record.processed) return "duplicate";

        const result = await this.#applyPaid(orderId, event);
        await this.#payments.markWebhookProcessed(event.eventId);

        this.#log.info(`Payment event ${event.eventId}: ${result.outcome}`);
        return result.outcome;
    }

    // Scheduled check: recovers orders whose webhook never arrived.
    async reconcilePending() {
        const provider = this.#tryProvider();
        if (!provider) return 0;

        let recovered = 0;
        for (const payment of await this.#payments.listPendingForReconcile()) {
            try {
                const found = await provider.findPayment({ orderId: payment.order_id, reference: payment.gateway_reference });
                if (!found.paid) continue;
                const result = await this.#applyPaid(payment.order_id, found);
                this.#log.info(`Order ${payment.order_id} confirmed by scheduled check: ${result.outcome}`);
                if (result.outcome === "paid") recovered += 1;
            } catch (error) {
                this.#log.warn(`Reconciliation failed for order ${payment.order_id}`, error.message);
            }
        }
        return recovered;
    }

    // Closes sessions that belong to cancelled or expired orders, so nobody can pay for them later.
    // If money already arrived, it is recorded as a late payment and the order is flagged for a refund.
    async cleanupDeadSessions() {
        const provider = this.#tryProvider();
        if (!provider) return 0;

        let closed = 0;
        for (const payment of await this.#payments.listDeadPending()) {
            try {
                const found = await provider.findPayment({ orderId: payment.order_id, reference: payment.gateway_reference });
                if (found.paid) {
                    const result = await this.#applyPaid(payment.order_id, found);
                    this.#log.warn(`Late payment for order ${payment.order_id}: ${result.outcome}`);
                    continue;
                }
                const cancelled = await provider.cancelCheckout(payment.gateway_reference);
                await this.#payments.setStatus(payment.id, cancelled ? "expired" : "expire_refused");
                if (cancelled) closed += 1;
            } catch (error) {
                this.#log.warn(`Could not close payment session ${payment.gateway_reference}`, error.message);
            }
        }
        return closed;
    }
}