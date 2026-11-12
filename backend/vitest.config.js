import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // Unit and validation tests only. The integration tests have their own config (vitest.integration.config.js).
        exclude: ["node_modules/**", "tests/integration/**", "tests/.out/**"],
        // Dummy values so the app can load. These tests never touch a real database:
        // they exercise pure rules, validation, authentication and role checks.
        env: {
            NODE_ENV: "test",
            SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real-0000",
            JWT_SECRET: "test-secret-test-secret-test-secret-123456",
            CLIENT_URL: "http://localhost:5173",
            GEMINI_API_KEY: "",
            MAYA_PUBLIC_KEY: "pk-test-not-real",
            MAYA_SECRET_KEY: "sk-test-not-real"
        }
    }
});