import env from "../config/env.js";
import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { getPaymentProvider } from "../patterns/payment/paymentFactory.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import { orderService } from "./orderService.js";

async function loadOwned(userId, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order || order.user_id !== userId) throw AppError.notFound("Order not found.", "ORDER_NOT_FOUND");
    return order;
}

function tryProvider() {
    try {
        return getPaymentProvider();
    } catch {
        return null; // payments are not configured
    }
}

// Applies a payment that the gateway confirmed. One database function decides the outcome.
const applyPaid = (orderId, found) =>
    paymentRepository.markPaid({
        orderId,
        paymentId: found.paymentId,
        amountCents: found.amountCents,
        currency: found.currency,
        raw: found.raw
    });

export const paymentService = {
    // Creates (or reuses) a hosted checkout session for an unpaid order.
    async startPayment(userId, orderId) {
        const order = await loadOwned(userId, orderId);

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
        const existing = await paymentRepository.findPendingByOrder(orderId);
        if (existing?.raw?.checkoutUrl) return { checkoutUrl: existing.raw.checkoutUrl };

        const provider = getPaymentProvider();
        const base = env.allowedOrigins[0];
        const session = await provider.createCheckout({
            order,
            urls: {
                success: `${base}/orders/${orderId}?payment=success`,
                failure: `${base}/orders/${orderId}?payment=failed`,
                cancel: `${base}/orders/${orderId}?payment=cancelled`
            }
        });

        const attached = await paymentRepository.attachSession({
            orderId,
            provider: provider.name,
            reference: session.reference,
            amountCents: order.total_cents,
            checkoutUrl: session.checkoutUrl
        });

        // Two simultaneous clicks: the database kept the first session, so close the extra one.
        if (!attached.created) provider.cancelCheckout(session.reference).catch(() => {});

        return { checkoutUrl: attached.checkoutUrl };
    },

    // Retrieve-on-return: when the customer comes back, ask the gateway directly.
    // Used when a webhook is slow or missing. Goes through the same safe database function.
    async syncPayment(userId, orderId) {
        const order = await loadOwned(userId, orderId);

        if (order.status === "pending_payment" && (await paymentRepository.findPendingByOrder(orderId))) {
            const found = await getPaymentProvider().findPayment({ id: orderId });
            if (found.paid) {
                const result = await applyPaid(orderId, found);
                logger.info(`Order ${orderId} confirmed by retrieval: ${result.outcome}`);
            }
        }
        return orderService.getOwn(userId, orderId);
    },

    // Called by the webhook controller AFTER the signature and timestamp were verified.
    async handleEvent(event) {
        if (event.type !== "payment.paid") return "ignored";

        let orderId = event.orderId;
        if (!orderId) orderId = (await paymentRepository.findByReference(event.paymentId))?.order_id ?? null;

        // The shared sandbox also sends events for other people's orders: acknowledge and ignore them.
        if (!orderId || !(await paymentRepository.orderExists(orderId))) return "unknown_order";

        const record = await paymentRepository.recordWebhook({
            eventId: event.eventId,
            eventType: "PAYMENT_SUCCESS",
            payload: event.raw
        });
        // Already handled: acknowledge so the gateway stops retrying. (If an earlier attempt failed midway it is retried.)
        if (record.duplicate && record.processed) return "duplicate";

        const result = await applyPaid(orderId, event);
        await paymentRepository.markWebhookProcessed(event.eventId);

        logger.info(`Payment event ${event.eventId}: ${result.outcome}`);
        return result.outcome;
    },

    // Scheduled check: recovers orders whose webhook never arrived.
    async reconcilePending() {
        const provider = tryProvider();
        if (!provider) return 0;

        let recovered = 0;
        for (const payment of await paymentRepository.listPendingForReconcile()) {
            try {
                const found = await provider.findPayment({ id: payment.order_id });
                if (!found.paid) continue;
                const result = await applyPaid(payment.order_id, found);
                logger.info(`Order ${payment.order_id} confirmed by scheduled check: ${result.outcome}`);
                if (result.outcome === "paid") recovered += 1;
            } catch (error) {
                logger.warn(`Reconciliation failed for order ${payment.order_id}`, error.message);
            }
        }
        return recovered;
    },

    // Closes sessions that belong to cancelled or expired orders, so nobody can pay for them later.
    // If money already arrived, it is recorded as a late payment and the order is flagged for a refund.
    async cleanupDeadSessions() {
        const provider = tryProvider();
        if (!provider) return 0;

        let closed = 0;
        for (const payment of await paymentRepository.listDeadPending()) {
            try {
                const found = await provider.findPayment({ id: payment.order_id });
                if (found.paid) {
                    const result = await applyPaid(payment.order_id, found);
                    logger.warn(`Late payment for order ${payment.order_id}: ${result.outcome}`);
                    continue;
                }
                const cancelled = await provider.cancelCheckout(payment.gateway_reference);
                await paymentRepository.setStatus(payment.id, cancelled ? "expired" : "expire_refused");
                if (cancelled) closed += 1;
            } catch (error) {
                logger.warn(`Could not close payment session ${payment.gateway_reference}`, error.message);
            }
        }
        return closed;
    }
};