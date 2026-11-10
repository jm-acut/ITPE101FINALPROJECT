import { z } from "zod";
import { ORDER_STATUSES } from "../patterns/orderStateMachine.js";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const adminOrdersQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(ORDER_STATUSES).optional(),
    flagged: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    from: day.optional(),
    to: day.optional()
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(ORDER_STATUSES),
    note: z.string().trim().max(200).optional()
});

export const stockAdjustSchema = z.object({
    change: z
        .number()
        .int("Change must be a whole number.")
        .refine((value) => value !== 0, "Change must not be zero.")
        .refine((value) => Math.abs(value) <= 100000, "Change is too large."),
    reason: z.string().trim().min(3, "Give a reason (at least 3 characters).").max(200)
});