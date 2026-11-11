import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    CLIENT_URL: z.string().default("http://localhost:5173"),
    SUPABASE_URL: z.url({ message: "SUPABASE_URL must be a valid URL" }),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY is missing"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("2h"),
    GEMINI_API_KEY: z.string().optional(),
    // Maya Checkout (sandbox by default)
    MAYA_PUBLIC_KEY: z.string().optional(),
    MAYA_SECRET_KEY: z.string().optional(),
    MAYA_BASE_URL: z.url().default("https://pg-sandbox.paymaya.com")
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    const problems = parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nCheck backend/.env`);
}

// Singleton: validated once, frozen, imported everywhere.
const env = Object.freeze({
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === "production",
    isTest: parsed.data.NODE_ENV === "test",
    allowedOrigins: parsed.data.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean)
});

export default env;