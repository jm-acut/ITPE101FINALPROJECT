import AppError from "../utils/AppError.js";

// Requires a unique Idempotency-Key header on order creation, so a retry or double-click never creates two orders.
export default function requireIdempotencyKey(req, res, next) {
    const key = req.get("Idempotency-Key")?.trim();

    if (!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
        return next(
            AppError.validation([
                {
                    in: "header",
                    field: "Idempotency-Key",
                    message: "Send a unique Idempotency-Key header (8 to 100 letters, numbers, - or _)."
                }
            ])
        );
    }

    req.idempotencyKey = key;
    next();
}