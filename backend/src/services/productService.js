import AppError from "../utils/AppError.js";
import { productRepository } from "../repositories/productRepository.js";
import { categoryRepository } from "../repositories/categoryRepository.js";

// Database row -> API shape (camelCase, money in centavos)
export const toProductDto = (row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
    imageUrl: row.image_url,
    specs: row.specs ?? {},
    isActive: row.is_active,
    category: row.category ? { id: row.category.id, name: row.category.name, slug: row.category.slug } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// API body -> database columns. Only keys that were sent are included, so PATCH stays partial.
function toRow(body) {
    const map = {
        categoryId: "category_id",
        name: "name",
        brand: "brand",
        description: "description",
        priceCents: "price_cents",
        stock: "stock",
        specs: "specs",
        isActive: "is_active"
    };
    const row = {};
    for (const [apiKey, column] of Object.entries(map)) {
        if (body[apiKey] !== undefined) row[column] = body[apiKey];
    }
    if (body.imageUrl !== undefined) row.image_url = body.imageUrl === "" ? null : body.imageUrl;
    return row;
}

async function assertCategory(categoryId) {
    if (categoryId && !(await categoryRepository.exists(categoryId))) {
        throw AppError.validation([{ in: "body", field: "categoryId", message: "Category does not exist." }]);
    }
}

function mapUniqueViolation(error) {
    if (error?.code === "23505") {
        return AppError.conflict("A product with this name already exists.", "PRODUCT_NAME_TAKEN");
    }
    return error;
}

async function listProducts(filters) {
    const { rows, total } = await productRepository.list(filters);
    return {
        items: rows.map(toProductDto),
        meta: {
            total,
            page: filters.page,
            limit: filters.limit,
            totalPages: Math.max(1, Math.ceil(total / filters.limit))
        }
    };
}

export const productService = {
    // Customers always get active products only, whatever the query string says.
    listPublic: (filters) => listProducts({ ...filters, status: "active" }),

    // Admins may filter by status (active / inactive / all).
    listForAdmin: (filters) => listProducts(filters),

    async getPublic(id) {
        const row = await productRepository.findById(id);
        if (!row || !row.is_active) throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
        return toProductDto(row);
    },

    async getForAdmin(id) {
        const row = await productRepository.findById(id);
        if (!row) throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
        return toProductDto(row);
    },

    async create(body) {
        await assertCategory(body.categoryId);
        try {
            return toProductDto(await productRepository.create(toRow(body)));
        } catch (error) {
            throw mapUniqueViolation(error);
        }
    },

    async update(id, body) {
        await assertCategory(body.categoryId);
        try {
            const row = await productRepository.update(id, toRow(body));
            if (!row) throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
            return toProductDto(row);
        } catch (error) {
            throw mapUniqueViolation(error);
        }
    },

    // Hard delete only if the product was never sold. Otherwise deactivate it.
    async remove(id) {
        const existing = await productRepository.findById(id);
        if (!existing) throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

        if ((await productRepository.countOrderItems(id)) > 0) {
            throw AppError.conflict(
                "This product appears in past orders and cannot be deleted. Deactivate it instead.",
                "PRODUCT_HAS_ORDERS"
            );
        }
        await productRepository.remove(id);
    }
};