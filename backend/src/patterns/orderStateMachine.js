import AppError from "../utils/AppError.js";

export const ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"];

// status -> statuses it is allowed to move to
const TRANSITIONS = {
    pending_payment: ["paid", "cancelled", "expired"],
    paid: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    expired: []
};

// A customer may only cancel an order that has not been paid yet.
export const CUSTOMER_CANCELLABLE = ["pending_payment"];

export const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

export const allowedNext = (from) => [...(TRANSITIONS[from] ?? [])];

export function assertTransition(from, to) {
    if (!canTransition(from, to)) {
        throw AppError.conflict(`An order cannot move from "${from}" to "${to}".`, "INVALID_TRANSITION");
    }
}