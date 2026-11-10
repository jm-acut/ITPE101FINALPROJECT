import AppError from "../utils/AppError.js";
import { adminOrderRepository } from "../repositories/adminOrderRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { allowedNext, assertTransition } from "../patterns/orderStateMachine.js";
import { toOrderDto } from "./orderService.js";

// Only the system moves an order to these: "paid" comes from a verified payment, "expired" from the timer.
const SYSTEM_ONLY = ["paid", "expired"];

// What an admin may do next from a given status (the UI shows only these buttons).
const adminTargets = (status) =>
    allowedNext(status).filter((to) => !SYSTEM_ONLY.includes(to) && (to !== "cancelled" || status === "pending_payment"));

function toAdminDto(row) {
    return {
        ...toOrderDto(row),
        customer: row.customer,
        flagged: row.flagged,
        flagReason: row.flag_reason,
        adminActions: adminTargets(row.status)
    };
}

export const adminService = {
    dashboard: () => adminOrderRepository.stats(),

    async listOrders(query) {
        const { rows, total } = await adminOrderRepository.list(query);
        return {
            items: rows.map((r) => ({
                id: r.id,
                status: r.status,
                totalCents: r.total_cents,
                flagged: r.flagged,
                customer: r.customer,
                itemCount: (r.items ?? []).reduce((sum, i) => sum + i.quantity, 0),
                createdAt: r.created_at
            })),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) }
        };
    },

    async getOrder(id) {
        const row = await adminOrderRepository.findDetail(id);
        if (!row) throw AppError.notFound("Order not found.", "ORDER_NOT_FOUND");
        return toAdminDto(row);
    },

    async updateStatus(id, { status: to, note }, actorId) {
        const row = await adminOrderRepository.findDetail(id);
        if (!row) throw AppError.notFound("Order not found.", "ORDER_NOT_FOUND");

        if (SYSTEM_ONLY.includes(to)) {
            throw AppError.conflict(`The "${to}" status is set automatically and cannot be set by hand.`, "SYSTEM_STATUS");
        }
        assertTransition(row.status, to); // illegal move -> 409

        if (to === "cancelled") {
            if (row.status !== "pending_payment") {
                throw AppError.conflict(
                    "A paid order must be refunded through the payment gateway before it can be cancelled.",
                    "REFUND_REQUIRED"
                );
            }
            // Cancelling an unpaid order also returns its stock and its coupon.
            const released = await orderRepository.release(id, "cancelled", actorId, note || "Cancelled by admin");
            if (!released) throw AppError.conflict("The order changed. Reload and try again.", "STALE_STATUS");
        } else {
            const moved = await adminOrderRepository.transition(id, row.status, to, actorId, note);
            if (!moved) throw AppError.conflict("The order changed. Reload and try again.", "STALE_STATUS");
        }

        return this.getOrder(id);
    }
};