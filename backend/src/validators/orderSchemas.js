import { z } from "zod";

const phone = z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+639|09)\d{9}$/, "Enter a Philippine mobile number like 0917 123 4567."));

const couponCode = z.string().trim().max(40).optional();

export const quoteSchema = z.object({ couponCode });

export const createOrderSchema = z.object({
    couponCode,
    shipping: z.object({
        name: z.string().trim().min(2, "Enter the receiver's full name.").max(80),
        phone,
        address: z.string().trim().min(10, "Enter your full address (street, barangay, city).").max(300)
    })
});

export const listOrdersQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
});