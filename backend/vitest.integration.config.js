import { existsSync, readFileSync } from "node:fs";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

if (!existsSync(".env.test")) {
    throw new Error("backend/.env.test is missing. Create it first (see docs/test-plan.md, 'Test database').");
}

// Credentials for the TEST database come from backend/.env.test (never committed).
const fileEnv = dotenv.parse(readFileSync(".env.test"));

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/integration/**/*.int.test.js"],
        testTimeout: 30_000,
        hookTimeout: 60_000,
        fileParallelism: false, // one file at a time keeps a shared database simple
        env: {
            ...fileEnv,
            NODE_ENV: "test", // turns rate limiting off
            CLIENT_URL: "http://localhost:5173",
            // These must NOT come from your real .env: tests never call the real AI or payment services.
            GEMINI_API_KEY: "",
            MAYA_PUBLIC_KEY: "pk-test-not-real",
            MAYA_SECRET_KEY: "sk-test-not-real",
            MAYA_BASE_URL: "https://pg-sandbox.paymaya.com"
        }
    }
});