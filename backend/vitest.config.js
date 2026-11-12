import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // Dummy values so the app can load. These tests never touch the real database:
        // they exercise pure rules, validation, authentication and role checks.
        env: {
            NODE_ENV: "test",
            SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real-0000",
            JWT_SECRET: "test-secret-test-secret-test-secret-123456",
            CLIENT_URL: "http://localhost:5173"
        }
    }
});