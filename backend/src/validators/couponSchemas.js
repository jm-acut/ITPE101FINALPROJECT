import { z } from "zod";

const base = {
    code: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3 to 30 letters, numbers, - or _.")),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().int("Value must be a whole number.").min(1, "Value must be at least 1.").max(100_000_000),
    minSpendCents: z.number().int().min(0).max(100_000_000),
    expiresAt: z.iso.datetime({ message: "Use an ISO date like 2027-12-31T00:00:00.000Z." }).nullable(),
    usageLimit: z.number().int().min(1).max(1_000_000).nullable(),
    perCustomerLimit: z.number().int().min(1).max(100),
    isActive: z.boolean()
};

export const createCouponSchema = z
    .object({
        code: base.code,
        type: base.type,
        value: base.value,
        minSpendCents: base.minSpendCents.default(0),
        expiresAt: base.expiresAt.default(null),
        usageLimit: base.usageLimit.default(null),
        perCustomerLimit: base.perCustomerLimit.default(1),
        isActive: base.isActive.default(true)
    })
    .refine((c) => c.type !== "percentage" || c.value <= 100, {
        path: ["value"],
        message: "A percentage cannot be above 100."
    });

export const updateCouponSchema = z
    .object(Object.fromEntries(Object.entries(base).map(([key, schema]) => [key, schema.optional()])))
    .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to update." });