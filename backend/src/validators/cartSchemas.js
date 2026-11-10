import { z } from "zod";

const quantity = z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(99, "You can buy at most 99 of one item.");

export const productIdParam = z.object({
    productId: z.uuid({ message: "Invalid product id." })
});

export const addItemSchema = z.object({
    productId: z.uuid({ message: "Invalid product id." }),
    quantity: quantity.default(1)
});

export const updateItemSchema = z.object({ quantity });