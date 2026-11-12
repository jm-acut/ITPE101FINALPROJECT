import { afterAll, describe, expect, it } from "vitest";
import { api, bearer, cleanup, newCustomer } from "./helpers.js";

afterAll(cleanup);

// GEMINI_API_KEY is empty in the test configuration, so the assistant is "down" for these tests.
describe("AI fallback", () => {
    it("answers with a controlled 503 and no internal details when the assistant is unavailable", async () => {
        const user = await newCustomer("ai");
        const res = await api().post("/api/v1/assistant/recommend").set(bearer(user)).send({ prompt: "A gaming PC for 1080p games", budgetPesos: 60000 });

        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("AI_UNAVAILABLE");
        expect(res.body.requestId).toBeTruthy();

        const text = JSON.stringify(res.body);
        expect(text).not.toMatch(/stack|gemini|api key|GEMINI_API_KEY|at .*\.js/i);
    });

    it("keeps the rest of the store working while the assistant is down", async () => {
        const catalog = await api().get("/api/v1/products?limit=1");
        expect(catalog.status).toBe(200);

        const check = await api().post("/api/v1/builds/check").send({ partIds: [] });
        expect(check.status).toBe(422); // the compatibility checker still answers (it validates its input)
    });

    it("still requires sign-in for the assistant (401)", async () => {
        const res = await api().post("/api/v1/assistant/recommend").send({ prompt: "A gaming PC for 1080p games" });
        expect(res.status).toBe(401);
    });
});