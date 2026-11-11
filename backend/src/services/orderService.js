import AppError from "../utils/AppError.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { CUSTOMER_CANCELLABLE, assertTransition } from "../patterns/orderStateMachine.js";

export function toOrderDto(row) {
    const activeHolds = (row.reservations ?? []).filter((r) => r.status === "active");
    const expiresAt = activeHolds.length
        ? activeHolds.map((r) => r.expires_at).sort()[0]
        : null;

    return {
        id: row.id,
        status: row.status,
        subtotalCents: row.subtotal_cents,
        discountCents: row.discount_cents,
        shippingCents: row.shipping_cents,
        totalCents: row.total_cents,
        currency: row.currency,
        flagged: row.flagged,
        couponCode: row.coupon?.code ?? null,
        shipping: { name: row.shipping_name, phone: row.shipping_phone, address: row.shipping_address },
        items: (row.items ?? []).map((i) => ({
            productId: i.product_id,
            name: i.product_name,
            unitPriceCents: i.unit_price_cents,
            quantity: i.quantity,
            lineTotalCents: i.unit_price_cents * i.quantity
        })),
        history: [...(row.history ?? [])]
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map((h) => ({ from: h.from_status, to: h.to_status, note: h.note, createdAt: h.created_at })),
        expiresAt: row.status === "pending_payment" ? expiresAt : null,
        createdAt: row.created_at
    };
}

// Another customer's order looks exactly like a missing one (404), so ids cannot be probed.
async function loadOwned(userId, orderId) {
    const row = await orderRepository.findById(orderId);
    if (!row || row.user_id !== userId) throw AppError.notFound("Order not found.", "ORDER_NOT_FOUND");
    return row;
}

const holdEnded = (row) =>
    (row.reservations ?? []).some((r) => r.status === "active" && new Date(r.expires_at) <= new Date());

export const orderService = {
    quote: (userId, couponCode) => orderRepository.quote(userId, couponCode || null),

    async create(userId, idempotencyKey, { shipping, couponCode }) {
        const { orderId, replayed } = await orderRepository.place({
            userId,
            idempotencyKey,
            couponCode: couponCode || null,
            shipping
        });
        return { order: toOrderDto(await loadOwned(userId, orderId)), replayed };
    },

    async list(userId, query) {
        const { rows, total } = await orderRepository.listByUser(userId, query);
        return {
            items: rows.map((r) => ({
                id: r.id,
                status: r.status,
                totalCents: r.total_cents,
                itemCount: (r.items ?? []).reduce((sum, i) => sum + i.quantity, 0),
                createdAt: r.created_at
            })),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) }
        };
    },

    async getOwn(userId, orderId) {
        let row = await loadOwned(userId, orderId);

        // If the payment window ended, release the stock now instead of waiting for the background job.
        if (row.status === "pending_payment" && holdEnded(row)) {
            await orderRepository.release(orderId, "expired", null, "Payment window expired");
            row = await loadOwned(userId, orderId);
        }
        return toOrderDto(row);
    },

    async cancel(userId, orderId) {
        const row = await loadOwned(userId, orderId);

        if (!CUSTOMER_CANCELLABLE.includes(row.status)) {
            throw AppError.conflict("This order can no longer be cancelled.", "ORDER_NOT_CANCELLABLE");
        }
        assertTransition(row.status, "cancelled");

        const released = await orderRepository.release(orderId, "cancelled", userId, "Cancelled by customer");
        if (!released) {
            throw AppError.conflict("This order can no longer be cancelled.", "ORDER_NOT_CANCELLABLE");
        }
        return toOrderDto(await loadOwned(userId, orderId));
    },

    expireStale: () => orderRepository.expireStale()
};