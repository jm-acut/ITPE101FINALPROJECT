import AppError from "../utils/AppError.js";
import { productRepository } from "../repositories/productRepository.js";
import { stockRepository } from "../repositories/stockRepository.js";

export const inventoryService = {
    adjust: (productId, { change, reason }, actorId) => stockRepository.adjust(productId, change, reason, actorId),

    async movements(productId, query) {
        if (!(await productRepository.findById(productId))) {
            throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
        }
        const { rows, total } = await stockRepository.listMovements(productId, query);
        return {
            items: rows.map((m) => ({
                id: m.id,
                previousStock: m.previous_stock,
                newStock: m.new_stock,
                change: m.new_stock - m.previous_stock,
                reason: m.reason,
                actor: m.actor?.name ?? "System",
                createdAt: m.created_at
            })),
            meta: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) }
        };
    }
};