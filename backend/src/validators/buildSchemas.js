import { z } from "zod";

const partIds = z
    .array(z.uuid({ message: "Invalid part id." }))
    .min(1, "Pick at least one part.")
    .max(12, "A build can have at most 12 parts.");

export const checkSchema = z.object({ partIds });

export const createBuildSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(60),
    partIds
});

export const updateBuildSchema = z
    .object({
        name: z.string().trim().min(2).max(60).optional(),
        partIds: partIds.optional()
    })
    .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to update." });

export const shareCodeParam = z.object({
    code: z.string().regex(/^[A-Za-z0-9_-]{8,16}$/, "Invalid share code.")
});