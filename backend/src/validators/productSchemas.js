import { z } from "zod";

const MAX_PRICE_CENTS = 100_000_000; // PHP 1,000,000
const MAX_STOCK = 100_000;

export const idParamSchema = z.object({
    id: z.uuid({ message: "Invalid id format." })
});

// Allowed sort keys. The client can never choose an arbitrary column.
export const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "name_asc"];

export const listProductsQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().max(60).optional(),
    category: z.string().trim().max(60).optional(),
    minPriceCents: z.coerce.number().int().min(0).optional(),
    maxPriceCents: z.coerce.number().int().min(0).optional(),
    sort: z.enum(SORT_OPTIONS).default("newest"),
    status: z.enum(["active", "inactive", "all"]).default("active")
});

// Field rules WITHOUT defaults, so PATCH never overwrites data with default values.
const base = {
    categoryId: z.uuid({ message: "Pick a valid category." }),
    name: z.string().trim().min(2).max(120),
    brand: z.string().trim().max(60),
    description: z.string().trim().max(2000),
    priceCents: z.number().int("Price must be whole centavos.").min(0).max(MAX_PRICE_CENTS),
    stock: z.number().int("Stock must be a whole number.").min(0).max(MAX_STOCK),
    imageUrl: z.union([z.url({ message: "Image must be a valid URL." }).max(500), z.literal("")]),
    specs: z.record(z.string(), z.union([z.string().max(100), z.number(), z.boolean()])),
    isActive: z.boolean()
};

export const createProductSchema = z.object({
    categoryId: base.categoryId,
    name: base.name,
    priceCents: base.priceCents,
    stock: base.stock,
    brand: base.brand.optional(),
    imageUrl: base.imageUrl.optional(),
    description: base.description.default(""),
    specs: base.specs.default({}),
    isActive: base.isActive.default(true)
});

export const updateProductSchema = z
    .object(Object.fromEntries(Object.entries(base).map(([key, schema]) => [key, schema.optional()])))
    .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to update." });