import { z } from "zod";

export const recommendSchema = z.object({
    prompt: z
        .string()
        .trim()
        .min(5, "Describe what you need (at least 5 characters).")
        .max(500, "Keep your request under 500 characters."),
    budgetPesos: z
        .number()
        .int("Enter the budget in whole pesos.")
        .min(15000, "The minimum budget is ₱15,000.")
        .max(1000000, "The maximum budget is ₱1,000,000.")
        .optional()
});