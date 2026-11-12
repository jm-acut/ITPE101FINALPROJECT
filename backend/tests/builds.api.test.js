import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";

const token = jwt.sign({ role: "customer" }, process.env.JWT_SECRET, {
    subject: "11111111-1111-4111-8111-111111111111",
    expiresIn: "1h"
});

describe("builds API (rules that run before any database query)", () => {
    it("requires sign-in to save a build (401)", async () => {
        const res = await request(app).post("/api/v1/builds").send({ name: "My PC", partIds: ["22222222-2222-4222-8222-222222222222"] });
        expect(res.status).toBe(401);
    });

    it("requires sign-in to add a build to the cart (401)", async () => {
        const res = await request(app).post("/api/v1/builds/22222222-2222-4222-8222-222222222222/add-to-cart");
        expect(res.status).toBe(401);
    });

    it("rejects an empty parts list on the public checker (422)", async () => {
        const res = await request(app).post("/api/v1/builds/check").send({ partIds: [] });
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a malformed part id (422)", async () => {
        const res = await request(app).post("/api/v1/builds/check").send({ partIds: ["not-a-uuid"] });
        expect(res.status).toBe(422);
    });

    it("rejects an invalid share code (422)", async () => {
        const res = await request(app).get("/api/v1/builds/shared/!!");
        expect(res.status).toBe(422);
    });

    it("validates the build name for a signed-in customer (422)", async () => {
        const res = await request(app)
            .post("/api/v1/builds")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "x", partIds: ["22222222-2222-4222-8222-222222222222"] });
        expect(res.status).toBe(422);
    });
});