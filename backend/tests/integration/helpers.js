import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../../src/app.js";
import supabase from "../../src/config/database.js";

// Real HTTP calls into the Express app, against the database configured in backend/.env.test.
export const api = () => request(app);
export const uniq = () => randomUUID().slice(0, 8);
export const bearer = (user) => ({ Authorization: `Bearer ${user.token}` });

export const SHIPPING = {
    name: "Test Buyer",
    phone: "09171234567",
    address: "123 Test Street, Barangay Uno, Iligan City"
};

// Everything a test creates is remembered here and removed by cleanup(). Tests never touch any other row.
const made = { users: [], products: [], categories: [], coupons: [] };
export const trackUser = (id) => made.users.push(id);
export const trackProduct = (id) => made.products.push(id);

function must({ data, error }, label) {
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
}

// A customer created through the real registration endpoint.
export async function newCustomer(label = "buyer") {
    const email = `itest-${label}-${uniq()}@nexuspc.test`;
    const password = "Itest12345";
    const res = await api().post("/api/v1/auth/register").send({ name: `Itest ${label}`, email, password });
    if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);

    trackUser(res.body.data.user.id);
    return { id: res.body.data.user.id, email, password, token: res.body.data.token };
}

// Admins cannot register themselves, so this one is inserted directly, then signs in through the API.
export async function newAdmin() {
    const email = `itest-admin-${uniq()}@nexuspc.test`;
    const password = "Itest12345";
    const row = must(
        await supabase
            .from("users")
            .insert({ name: "Itest Admin", email, password_hash: await bcrypt.hash(password, 4), role: "admin" })
            .select("id")
            .single(),
        "create admin"
    );
    trackUser(row.id);

    const login = await api().post("/api/v1/auth/login").send({ email, password });
    return { id: row.id, email, password, token: login.body.data.token };
}

export async function newCategory() {
    const tag = uniq();
    const row = must(
        await supabase.from("categories").insert({ name: `itest-category-${tag}`, slug: `itest-${tag}` }).select("id").single(),
        "create category"
    );
    made.categories.push(row.id);
    return row.id;
}

// items: [{ key, priceCents, stock, isActive? }]  ->  { categoryId, products: { [key]: { id, name, priceCents } } }
export async function newCatalog(items) {
    const categoryId = await newCategory();
    const tag = uniq();

    const rows = items.map((item) => ({
        category_id: categoryId,
        name: `itest-${item.key}-${tag}`,
        price_cents: item.priceCents,
        stock: item.stock,
        description: "integration test product",
        specs: {},
        is_active: item.isActive ?? true
    }));
    const data = must(await supabase.from("products").insert(rows).select("id, name"), "create products");
    data.forEach((p) => trackProduct(p.id));

    const products = Object.fromEntries(
        items.map((item) => {
            const row = data.find((p) => p.name === `itest-${item.key}-${tag}`);
            return [item.key, { id: row.id, name: row.name, priceCents: item.priceCents }];
        })
    );
    return { categoryId, products };
}

export async function newCoupon(overrides = {}) {
    const row = must(
        await supabase
            .from("coupons")
            .insert({
                code: `ITEST${uniq().toUpperCase()}`,
                type: "percentage",
                value: 10,
                min_spend_cents: 0,
                expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                usage_limit: null,
                per_customer_limit: 5,
                is_active: true,
                ...overrides
            })
            .select("id, code")
            .single(),
        "create coupon"
    );
    made.coupons.push(row.id);
    return row;
}

export const addToCart = (user, productId, quantity = 1, extra = {}) =>
    api().post("/api/v1/cart/items").set(bearer(user)).send({ productId, quantity, ...extra });

export const quote = (user, couponCode) =>
    api().post("/api/v1/orders/quote").set(bearer(user)).send({ couponCode });

export const placeOrder = (user, { key = randomUUID(), couponCode } = {}) =>
    api().post("/api/v1/orders").set(bearer(user)).set("Idempotency-Key", key).send({ shipping: SHIPPING, couponCode });

export async function stockOf(productId) {
    return must(await supabase.from("products").select("stock").eq("id", productId).single(), "read stock").stock;
}

export async function dbOrder(orderId) {
    return must(await supabase.from("orders").select("status, flagged, flag_reason").eq("id", orderId).single(), "read order");
}

// Removes only what the tests created, in a foreign-key-safe order. Safe to run many times.
export async function cleanup() {
    const steps = [
        ["orders", () => supabase.from("orders").delete().in("user_id", made.users), made.users],
        ["products", () => supabase.from("products").delete().in("id", made.products), made.products],
        ["pc_builds", () => supabase.from("pc_builds").delete().in("user_id", made.users), made.users],
        ["carts", () => supabase.from("carts").delete().in("user_id", made.users), made.users],
        ["users", () => supabase.from("users").delete().in("id", made.users), made.users],
        ["coupons", () => supabase.from("coupons").delete().in("id", made.coupons), made.coupons],
        ["categories", () => supabase.from("categories").delete().in("id", made.categories), made.categories],
        ["webhook_events", () => supabase.from("webhook_events").delete().like("event_id", "itest_pay_%"), [1]]
    ];

    for (const [name, run, ids] of steps) {
        if (ids.length === 0) continue;
        const { error } = await run();
        if (error) console.warn(`cleanup of ${name} failed: ${error.message}`);
    }
}