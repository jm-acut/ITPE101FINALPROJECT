import { afterAll, describe, expect, it } from "vitest";
import { api, bearer, cleanup, newAdmin, newCategory, newCustomer, trackProduct, trackUser, uniq } from "./helpers.js";

afterAll(cleanup);

describe("authentication", () => {
    it("registers a customer, signs in and reads the profile", async () => {
        const email = `itest-reg-${uniq()}@nexuspc.test`;

        const register = await api().post("/api/v1/auth/register").send({ name: "Itest Person", email, password: "Itest12345" });
        expect(register.status).toBe(201);
        trackUser(register.body.data.user.id);
        expect(register.body.data.user.role).toBe("customer");
        expect(JSON.stringify(register.body)).not.toMatch(/password/i); // the hash is never returned

        const login = await api().post("/api/v1/auth/login").send({ email, password: "Itest12345" });
        expect(login.status).toBe(200);

        const me = await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.data.token}`);
        expect(me.status).toBe(200);
        expect(me.body.data.user.email).toBe(email);
    });

    it("rejects a duplicate email with 409", async () => {
        const customer = await newCustomer("dup");
        const again = await api().post("/api/v1/auth/register").send({ name: "Someone Else", email: customer.email, password: "Itest12345" });
        expect(again.status).toBe(409);
        expect(again.body.error.code).toBe("EMAIL_TAKEN");
    });

    it("gives the same generic answer for a wrong password and an unknown email", async () => {
        const customer = await newCustomer("wrongpw");

        const wrong = await api().post("/api/v1/auth/login").send({ email: customer.email, password: "WrongPass123" });
        const unknown = await api().post("/api/v1/auth/login").send({ email: `nobody-${uniq()}@nexuspc.test`, password: "WrongPass123" });

        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
        expect(unknown.body.error.message).toBe(wrong.body.error.message);
    });

    it("blocks an operator-injection login with 422", async () => {
        const res = await api().post("/api/v1/auth/login").send({ email: { $ne: null }, password: "anything" });
        expect(res.status).toBe(422);
    });
});

describe("role enforcement", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const adminCalls = [
        ["get", "/api/v1/admin/dashboard"],
        ["get", "/api/v1/admin/products"],
        ["post", "/api/v1/admin/products"],
        ["patch", `/api/v1/admin/products/${id}`],
        ["delete", `/api/v1/admin/products/${id}`],
        ["post", `/api/v1/admin/products/${id}/stock`],
        ["get", `/api/v1/admin/products/${id}/stock-movements`],
        ["get", "/api/v1/admin/orders"],
        ["get", `/api/v1/admin/orders/${id}`],
        ["patch", `/api/v1/admin/orders/${id}/status`],
        ["get", "/api/v1/admin/coupons"],
        ["post", "/api/v1/admin/coupons"],
        ["patch", `/api/v1/admin/coupons/${id}`],
        ["delete", `/api/v1/admin/coupons/${id}`]
    ];

    it("returns 401 on every admin route without a token", async () => {
        for (const [method, path] of adminCalls) {
            const res = await api()[method](path).send({});
            expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
        }
    });

    it("returns 403 on every admin route for a customer token, including nested routes", async () => {
        const customer = await newCustomer("roles");
        for (const [method, path] of adminCalls) {
            const res = await api()[method](path).set(bearer(customer)).send({});
            expect(res.status, `${method.toUpperCase()} ${path}`).toBe(403);
            expect(res.body.error.code).toBe("FORBIDDEN");
        }
    });

    it("lets an admin reach the dashboard", async () => {
        const admin = await newAdmin();
        const res = await api().get("/api/v1/admin/dashboard").set(bearer(admin));
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("grossSalesCents");
    });
});

describe("admin product management", () => {
    it("creates a product, keeps an audited stock trail, hides it and deletes it", async () => {
        const admin = await newAdmin();
        const categoryId = await newCategory();

        // create (the starting stock is also audited)
        const create = await api()
            .post("/api/v1/admin/products")
            .set(bearer(admin))
            .send({ categoryId, name: `itest-admin-${uniq()}`, priceCents: 250000, stock: 3, description: "test", specs: { socket: "AM5" } });
        expect(create.status).toBe(201);
        const product = create.body.data;
        trackProduct(product.id);
        expect(product.stock).toBe(3);

        // stock can be changed only through the audited endpoint, and never below zero
        const add = await api().post(`/api/v1/admin/products/${product.id}/stock`).set(bearer(admin)).send({ change: 4, reason: "Restock from supplier" });
        expect(add.status).toBe(200);
        expect(add.body.data).toMatchObject({ previousStock: 3, newStock: 7 });

        const tooMuch = await api().post(`/api/v1/admin/products/${product.id}/stock`).set(bearer(admin)).send({ change: -100, reason: "Impossible removal" });
        expect(tooMuch.status).toBe(409);
        expect(tooMuch.body.error.code).toBe("STOCK_NEGATIVE");

        const history = await api().get(`/api/v1/admin/products/${product.id}/stock-movements`).set(bearer(admin));
        expect(history.status).toBe(200);
        expect(history.body.data.map((m) => m.reason)).toEqual(expect.arrayContaining(["Initial stock", "Restock from supplier"]));

        // stock cannot be edited through PATCH
        const patchStock = await api().patch(`/api/v1/admin/products/${product.id}`).set(bearer(admin)).send({ stock: 50 });
        expect(patchStock.status).toBe(422);

        // hidden products disappear from the public catalog
        expect((await api().get(`/api/v1/products/${product.id}`)).status).toBe(200);
        const hide = await api().patch(`/api/v1/admin/products/${product.id}`).set(bearer(admin)).send({ isActive: false });
        expect(hide.status).toBe(200);
        const hidden = await api().get(`/api/v1/products/${product.id}`);
        expect(hidden.status).toBe(404);
        expect(hidden.body.error.code).toBe("PRODUCT_NOT_FOUND");

        // a product that was never ordered can be deleted
        expect((await api().delete(`/api/v1/admin/products/${product.id}`).set(bearer(admin))).status).toBe(204);
        expect((await api().get(`/api/v1/admin/products/${product.id}`).set(bearer(admin))).status).toBe(404);
    });

    it("validates product input (422)", async () => {
        const admin = await newAdmin();
        const categoryId = await newCategory();
        const bad = await api().post("/api/v1/admin/products").set(bearer(admin)).send({ categoryId, name: "x", priceCents: -5, stock: 1.5 });
        expect(bad.status).toBe(422);
        expect(bad.body.error.details.length).toBeGreaterThan(0);
    });
});