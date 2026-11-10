import AppError from "../utils/AppError.js";
import { couponRepository } from "../repositories/couponRepository.js";

const toCouponDto = (c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSpendCents: c.min_spend_cents,
    expiresAt: c.expires_at,
    usageLimit: c.usage_limit,
    perCustomerLimit: c.per_customer_limit,
    usedCount: c.used_count,
    isActive: c.is_active,
    createdAt: c.created_at
});

function toRow(body) {
    const map = {
        code: "code",
        type: "type",
        value: "value",
        minSpendCents: "min_spend_cents",
        expiresAt: "expires_at",
        usageLimit: "usage_limit",
        perCustomerLimit: "per_customer_limit",
        isActive: "is_active"
    };
    const row = {};
    for (const [apiKey, column] of Object.entries(map)) {
        if (body[apiKey] !== undefined) row[column] = body[apiKey];
    }
    return row;
}

const mapUnique = (error) =>
    error?.code === "23505" ? AppError.conflict("A coupon with this code already exists.", "COUPON_CODE_TAKEN") : error;

export const couponService = {
    async list(query) {
        const { rows, total } = await couponRepository.list(query);
        return {
            items: rows.map(toCouponDto),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) }
        };
    },

    async create(body) {
        try {
            return toCouponDto(await couponRepository.create(toRow(body)));
        } catch (error) {
            throw mapUnique(error);
        }
    },

    async update(id, body) {
        const existing = await couponRepository.findById(id);
        if (!existing) throw AppError.notFound("Coupon not found.", "COUPON_NOT_FOUND");

        // A partial update can still break the percentage rule, so check the final combination.
        const type = body.type ?? existing.type;
        const value = body.value ?? existing.value;
        if (type === "percentage" && value > 100) {
            throw AppError.validation([{ in: "body", field: "value", message: "A percentage cannot be above 100." }]);
        }

        try {
            return toCouponDto(await couponRepository.update(id, toRow(body)));
        } catch (error) {
            throw mapUnique(error);
        }
    },

    // A coupon that was ever used stays for the order history. Deactivate it instead of deleting.
    async remove(id) {
        const existing = await couponRepository.findById(id);
        if (!existing) throw AppError.notFound("Coupon not found.", "COUPON_NOT_FOUND");

        if ((await couponRepository.countOrders(id)) > 0) {
            throw AppError.conflict("This coupon was used on orders and cannot be deleted. Deactivate it instead.", "COUPON_IN_USE");
        }
        await couponRepository.remove(id);
    }
};