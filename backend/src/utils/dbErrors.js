import AppError from "./AppError.js";

// The SQL functions raise errors shaped like "CODE|Readable message". This turns them into API errors.
const STATUS = {
    CART_EMPTY: 409,
    INSUFFICIENT_STOCK: 409,
    PRODUCT_UNAVAILABLE: 409,
    ORDER_NOT_FOUND: 404,
    ORDER_TOO_LARGE: 422
};

export function mapDbError(error) {
    const match = /^([A-Z_]+)\|([\s\S]*)$/.exec(error?.message ?? "");
    if (!match) return error; // unknown database error: handled as a generic 500

    const [, code, message] = match;
    if (code.startsWith("COUPON_")) {
        return new AppError(422, code, message, [{ in: "body", field: "couponCode", message }]);
    }
    return new AppError(STATUS[code] ?? 400, code, message);
}