import { z } from "zod";

// z.email() only accepts strings, so a payload like { "$ne": null } is rejected.
const email = z
    .email({ message: "Enter a valid email address." })
    .max(254)
    .transform((v) => v.trim().toLowerCase());

export const registerSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    email,
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .max(72, "Password must be 72 characters or fewer.")
        .regex(/[A-Za-z]/, "Password needs at least one letter.")
        .regex(/[0-9]/, "Password needs at least one number.")
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1, "Password is required.").max(72)
});