// Generates the Postman collection and environment. Run from the project root:  node postman/generate.mjs
// Import both generated files into Postman, pick the "NEXUS PC (local)" environment, and run the collection in order.
import { writeFileSync } from "node:fs";

const OUT = new URL("./", import.meta.url);

// ---------- assertion snippets ----------
const T = {
    status: (code) => `pm.test("Status is ${code}", () => pm.response.to.have.status(${code}));`,
    oneOf: (codes) => `pm.test("Status is one of ${codes.join(", ")}", () => pm.expect(${JSON.stringify(codes)}).to.include(pm.response.code));`,
    envelope: `pm.test("Uses the success envelope", () => { const b = pm.response.json(); pm.expect(b.success).to.eql(true); pm.expect(b).to.have.property("data"); });`,
    error: (code) => `pm.test("Error code is ${code} and the error shape is correct", () => { const b = pm.response.json(); pm.expect(b.success).to.eql(false); pm.expect(b.error.code).to.eql("${code}"); pm.expect(b.error.message).to.be.a("string"); pm.expect(b.requestId).to.be.a("string"); });`,
    fast: `pm.test("Responds in under 5 seconds", () => pm.expect(pm.response.responseTime).to.be.below(5000));`,
    check: (name, body) => `pm.test(${JSON.stringify(name)}, () => { const b = pm.response.json(); ${body} });`,
    set: (scope, key, expr) => `{ const b = pm.response.json(); pm.${scope}.set("${key}", ${expr}); }`
};

const AUTH = {
    customer: "{{customerToken}}",
    admin: "{{adminToken}}",
    other: "{{otherToken}}"
};

// ---------- request builder ----------
function req(name, method, path, { auth = "customer", body, headers = {}, pre = [], tests = [] } = {}) {
    const [pathOnly, queryString] = path.split("?");
    const request = {
        method: method.toUpperCase(),
        header: [
            ...(body ? [{ key: "Content-Type", value: "application/json" }] : []),
            ...Object.entries(headers).map(([key, value]) => ({ key, value }))
        ],
        url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: pathOnly.split("/").filter(Boolean),
            ...(queryString ? { query: queryString.split("&").map((pair) => ({ key: pair.split("=")[0], value: pair.split("=").slice(1).join("=") })) } : {})
        },
        auth: auth === "none" ? { type: "noauth" } : { type: "bearer", bearer: [{ key: "token", value: AUTH[auth], type: "string" }] },
        ...(body ? { body: { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } } } : {})
    };
    const event = [];
    if (pre.length) event.push({ listen: "prerequest", script: { type: "text/javascript", exec: pre } });
    event.push({ listen: "test", script: { type: "text/javascript", exec: tests } });
    return { name, event, request };
}
const folder = (name, ...items) => ({ name, item: items });

const shipping = { name: "Postman Tester", phone: "09171234567", address: "123 Test Street, Barangay Uno, Iligan City" };
const NIL = "00000000-0000-4000-8000-000000000000";

// ---------- the collection ----------
const items = [
    folder(
        "00 System",
        req("Health check", "GET", "/health", { auth: "none", tests: [T.status(200), T.envelope, T.check("Database is connected", `pm.expect(b.data.database).to.eql("connected");`), T.fast] })
    ),

    folder(
        "01 Auth",
        req("Register a new customer", "POST", "/auth/register", {
            auth: "none",
            pre: [`pm.collectionVariables.set("regEmail", "postman-" + Date.now() + "@nexuspc.test");`],
            body: { name: "Postman Tester", email: "{{regEmail}}", password: "Postman1234" },
            tests: [T.status(201), T.envelope, T.check("Role is customer and no password is returned", `pm.expect(b.data.user.role).to.eql("customer"); pm.expect(JSON.stringify(b)).to.not.match(/password/i);`), T.set("environment", "otherToken", "b.data.token")]
        }),
        req("Register with the same email again (duplicate)", "POST", "/auth/register", {
            auth: "none", body: { name: "Postman Tester", email: "{{regEmail}}", password: "Postman1234" }, tests: [T.status(409), T.error("EMAIL_TAKEN")]
        }),
        req("Register with invalid input", "POST", "/auth/register", {
            auth: "none", body: { name: "x", email: "not-an-email", password: "short" },
            tests: [T.status(422), T.error("VALIDATION_ERROR"), T.check("Lists the invalid fields", `const fields = b.error.details.map((d) => d.field); pm.expect(fields).to.include.members(["name", "email", "password"]);`)]
        }),
        req("Login as customer", "POST", "/auth/login", {
            auth: "none", body: { email: "{{customerEmail}}", password: "{{customerPassword}}" },
            tests: [T.status(200), T.envelope, T.set("environment", "customerToken", "b.data.token")]
        }),
        req("Login as admin", "POST", "/auth/login", {
            auth: "none", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
            tests: [T.status(200), T.check("Role is admin", `pm.expect(b.data.user.role).to.eql("admin");`), T.set("environment", "adminToken", "b.data.token")]
        }),
        req("Login with a wrong password", "POST", "/auth/login", {
            auth: "none", body: { email: "{{customerEmail}}", password: "WrongPassword1" }, tests: [T.status(401), T.error("INVALID_CREDENTIALS")]
        }),
        req("Get my profile", "GET", "/auth/me", { tests: [T.status(200), T.check("Returns the signed-in user", `pm.expect(b.data.user.email).to.eql(pm.environment.get("customerEmail"));`)] }),
        req("Get my profile without a token (unauthenticated)", "GET", "/auth/me", { auth: "none", tests: [T.status(401), T.error("UNAUTHENTICATED")] })
    ),

    folder(
        "02 Catalog",
        req("List categories", "GET", "/categories", { auth: "none", tests: [T.status(200), T.check("Has categories", `pm.expect(b.data).to.be.an("array").that.is.not.empty;`)] }),
        req("Search products", "GET", "/products?search=ryzen&sort=price_asc&limit=5", {
            auth: "none",
            tests: [T.status(200), T.check("Returns products with pagination", `pm.expect(b.data).to.be.an("array").that.is.not.empty; pm.expect(b.meta).to.have.property("totalPages");`), T.set("collectionVariables", "productId", "b.data[0].id")]
        }),
        req("Get one product", "GET", "/products/{{productId}}", { auth: "none", tests: [T.status(200), T.check("Price is whole centavos", `pm.expect(Number.isInteger(b.data.priceCents)).to.eql(true);`)] }),
        req("Get a product that does not exist (not found)", "GET", `/products/${NIL}`, { auth: "none", tests: [T.status(404), T.error("PRODUCT_NOT_FOUND")] }),
        req("Get a product with a malformed id (invalid input)", "GET", "/products/not-a-uuid", { auth: "none", tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("List products with an invalid sort (invalid input)", "GET", "/products?sort=password_hash", { auth: "none", tests: [T.status(422), T.error("VALIDATION_ERROR")] })
    ),

    folder(
        "03 Cart",
        req("Empty my cart", "DELETE", "/cart", { tests: [T.status(200), T.check("Cart is empty", `pm.expect(b.data.itemCount).to.eql(0);`)] }),
        req("Add a product to the cart", "POST", "/cart/items", {
            body: { productId: "{{productId}}", quantity: 1 }, tests: [T.status(200), T.check("Cart has the item, priced by the server", `pm.expect(b.data.itemCount).to.eql(1); pm.expect(b.data.items[0].unitPriceCents).to.be.a("number");`)]
        }),
        req("Add more than is in stock (out of stock)", "POST", "/cart/items", { body: { productId: "{{productId}}", quantity: 50 }, tests: [T.status(409), T.error("INSUFFICIENT_STOCK")] }),
        req("Add an item with an invalid quantity (invalid input)", "POST", "/cart/items", { body: { productId: "{{productId}}", quantity: 0 }, tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("Read my cart without a token (unauthenticated)", "GET", "/cart", { auth: "none", tests: [T.status(401), T.error("UNAUTHENTICATED")] })
    ),

    folder(
        "04 Checkout and orders",
        req("Quote my cart", "POST", "/orders/quote", { body: {}, tests: [T.status(200), T.check("Totals add up", `const d = b.data; pm.expect(d.totalCents).to.eql(d.subtotalCents - d.discountCents + d.shippingCents);`)] }),
        req("Quote with an unknown coupon (invalid coupon)", "POST", "/orders/quote", { body: { couponCode: "NOSUCHCODE999" }, tests: [T.status(422), T.error("COUPON_INVALID")] }),
        req("Quote with an expired coupon (invalid coupon)", "POST", "/orders/quote", { body: { couponCode: "{{expiredCoupon}}" }, tests: [T.status(422), T.error("COUPON_EXPIRED")] }),
        req("Place an order", "POST", "/orders", {
            pre: [`pm.collectionVariables.set("idemKey", "pm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));`],
            headers: { "Idempotency-Key": "{{idemKey}}" }, body: { shipping },
            tests: [T.status(201), T.check("Order is awaiting payment with a payment window", `pm.expect(b.data.status).to.eql("pending_payment"); pm.expect(b.data.expiresAt).to.be.a("string");`), T.set("collectionVariables", "orderId", "b.data.id")]
        }),
        req("Place the same order again (duplicate idempotency key)", "POST", "/orders", {
            headers: { "Idempotency-Key": "{{idemKey}}" }, body: { shipping },
            tests: [T.status(200), T.check("Returns the SAME order, not a second one", `pm.expect(b.data.id).to.eql(pm.collectionVariables.get("orderId"));`)]
        }),
        req("Place an order without an Idempotency-Key (invalid input)", "POST", "/orders", { body: { shipping }, tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("Read my order", "GET", "/orders/{{orderId}}", { tests: [T.status(200), T.check("Is the order I placed", `pm.expect(b.data.id).to.eql(pm.collectionVariables.get("orderId"));`)] }),
        req("Another customer reads my order (hidden)", "GET", "/orders/{{orderId}}", { auth: "other", tests: [T.status(404), T.error("ORDER_NOT_FOUND")] }),
        req("Read an order that does not exist (not found)", "GET", `/orders/${NIL}`, { tests: [T.status(404), T.error("ORDER_NOT_FOUND")] }),
        req("List my orders", "GET", "/orders?page=1&limit=5", { tests: [T.status(200), T.check("Contains my order", `pm.expect(b.data.map((o) => o.id)).to.include(pm.collectionVariables.get("orderId"));`)] }),
        req("Cancel my order", "POST", "/orders/{{orderId}}/cancel", { tests: [T.status(200), T.check("Order is cancelled", `pm.expect(b.data.status).to.eql("cancelled");`)] }),
        req("Cancel it again (not allowed)", "POST", "/orders/{{orderId}}/cancel", { tests: [T.status(409), T.error("ORDER_NOT_CANCELLABLE")] })
    ),

    folder(
        "05 Payments and webhook",
        req("Pay for a cancelled order (not payable)", "POST", "/orders/{{orderId}}/pay", { tests: [T.status(409), T.error("ORDER_NOT_PAYABLE")] }),
        req("Webhook without a signature (invalid webhook signature)", "POST", "/webhooks/maya", {
            auth: "none", body: { id: "pm_pay_1", status: "PAYMENT_SUCCESS", amount: 1, currency: "PHP", requestReferenceNumber: "{{orderId}}" }, tests: [T.status(401), T.error("INVALID_SIGNATURE")]
        }),
        req("Webhook with a forged signature (invalid webhook signature)", "POST", "/webhooks/maya", {
            auth: "none", pre: [`pm.collectionVariables.set("nowMs", String(Date.now()));`],
            headers: { "X-Maya-Webhook-Signature": "nonce=forged,v1=00ff00ff", "X-Maya-Webhook-Timestamp": "{{nowMs}}" },
            body: { id: "pm_pay_2", status: "PAYMENT_SUCCESS", amount: 1, currency: "PHP", requestReferenceNumber: "{{orderId}}" },
            tests: [T.status(401), T.error("INVALID_SIGNATURE"), T.check("The order is still cancelled, not paid", `pm.expect(b.success).to.eql(false);`)]
        })
    ),

    folder(
        "06 PC builds",
        req("Check parts for compatibility", "POST", "/builds/check", { auth: "none", body: { partIds: ["{{productId}}"] }, tests: [T.status(200), T.check("Returns a report", `pm.expect(b.data).to.have.property("compatible"); pm.expect(b.data.issues).to.be.an("array");`)] }),
        req("Check with no parts (invalid input)", "POST", "/builds/check", { auth: "none", body: { partIds: [] }, tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("Save a build", "POST", "/builds", { body: { name: "Postman build", partIds: ["{{productId}}"] }, tests: [T.status(201), T.set("collectionVariables", "buildId", "b.data.id")] }),
        req("Another customer reads my build (hidden)", "GET", "/builds/{{buildId}}", { auth: "other", tests: [T.status(404), T.error("BUILD_NOT_FOUND")] }),
        req("Share my build", "POST", "/builds/{{buildId}}/share", { tests: [T.status(200), T.set("collectionVariables", "shareCode", "b.data.shareCode")] }),
        req("Open the shared build (public)", "GET", "/builds/shared/{{shareCode}}", { auth: "none", tests: [T.status(200), T.check("Owner is not exposed", `pm.expect(JSON.stringify(b)).to.not.match(/email|userId|user_id/i);`)] }),
        req("Delete my build", "DELETE", "/builds/{{buildId}}", { tests: [T.status(204)] }),
        req("Open the shared build after deleting it (not found)", "GET", "/builds/shared/{{shareCode}}", { auth: "none", tests: [T.status(404), T.error("SHARE_NOT_FOUND")] })
    ),

    folder(
        "07 AI assistant",
        req("Ask the assistant without a token (unauthenticated)", "POST", "/assistant/recommend", { auth: "none", body: { prompt: "A gaming PC for 1080p games" }, tests: [T.status(401), T.error("UNAUTHENTICATED")] }),
        req("Ask the assistant with a too-short request (invalid input)", "POST", "/assistant/recommend", { body: { prompt: "hi" }, tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("Ask the assistant for a build (needs a Gemini key)", "POST", "/assistant/recommend", {
            body: { prompt: "A gaming PC for smooth 1080p games", budgetPesos: 60000 },
            tests: [T.oneOf([200, 503]), T.check("Either a grounded answer or a controlled fallback", `if (pm.response.code === 503) { pm.expect(b.error.code).to.eql("AI_UNAVAILABLE"); } else { pm.expect(["ok", "no_match"]).to.include(b.data.status); pm.expect(b.data.aiAssisted).to.eql(true); }`)]
        })
    ),

    folder(
        "08 Admin",
        req("A customer opens the admin dashboard (forbidden)", "GET", "/admin/dashboard", { tests: [T.status(403), T.error("FORBIDDEN")] }),
        req("Open the admin dashboard without a token (unauthenticated)", "GET", "/admin/dashboard", { auth: "none", tests: [T.status(401), T.error("UNAUTHENTICATED")] }),
        req("Admin dashboard", "GET", "/admin/dashboard", { auth: "admin", tests: [T.status(200), T.check("Has the summary numbers", `pm.expect(b.data).to.include.keys("paidOrders", "grossSalesCents", "flaggedOrders", "lowStock");`)] }),
        req("Admin lists all products", "GET", "/admin/products?status=all&limit=5", { auth: "admin", tests: [T.status(200), T.check("Paginated", `pm.expect(b.meta.limit).to.eql(5);`)] }),
        req("Admin removes more stock than exists (stock cannot go negative)", "POST", "/admin/products/{{productId}}/stock", { auth: "admin", body: { change: -100000, reason: "Postman negative stock test" }, tests: [T.status(409), T.error("STOCK_NEGATIVE")] }),
        req("Admin lists orders", "GET", "/admin/orders?limit=5", { auth: "admin", tests: [T.status(200), T.check("Paginated", `pm.expect(b.meta).to.have.property("total");`)] }),
        req("Admin reads an order that does not exist (not found)", "GET", `/admin/orders/${NIL}`, { auth: "admin", tests: [T.status(404), T.error("ORDER_NOT_FOUND")] }),
        req("Admin moves a cancelled order to shipped (illegal transition)", "PATCH", "/admin/orders/{{orderId}}/status", { auth: "admin", body: { status: "shipped" }, tests: [T.status(409), T.error("INVALID_TRANSITION")] }),
        req("Admin sets an order to paid by hand (system only)", "PATCH", "/admin/orders/{{orderId}}/status", { auth: "admin", body: { status: "paid" }, tests: [T.status(409), T.error("SYSTEM_STATUS")] }),
        req("Admin creates a coupon", "POST", "/admin/coupons", {
            auth: "admin", pre: [`pm.collectionVariables.set("couponCode", "PM" + Date.now().toString(36).toUpperCase());`],
            body: { code: "{{couponCode}}", type: "percentage", value: 15, minSpendCents: 100000, usageLimit: 10 },
            tests: [T.status(201), T.check("Code is stored in capitals", `pm.expect(b.data.code).to.eql(pm.collectionVariables.get("couponCode"));`), T.set("collectionVariables", "couponId", "b.data.id")]
        }),
        req("Admin creates the same coupon again (duplicate)", "POST", "/admin/coupons", { auth: "admin", body: { code: "{{couponCode}}", type: "percentage", value: 15 }, tests: [T.status(409), T.error("COUPON_CODE_TAKEN")] }),
        req("Admin creates a coupon of 150 percent (invalid input)", "POST", "/admin/coupons", { auth: "admin", body: { code: "TOOBIG150", type: "percentage", value: 150 }, tests: [T.status(422), T.error("VALIDATION_ERROR")] }),
        req("Admin deletes the coupon", "DELETE", "/admin/coupons/{{couponId}}", { auth: "admin", tests: [T.status(204)] })
    )
];

const collection = {
    info: {
        name: "NEXUS PC API",
        description: "Requests with assertions for every module, including negative cases. Run the folders in order with the 'NEXUS PC (local)' environment. The database must be seeded (npm run seed). No secrets are stored here: tokens are filled in by the login requests.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{customerToken}}", type: "string" }] },
    variable: ["regEmail", "productId", "orderId", "idemKey", "buildId", "shareCode", "couponId", "couponCode", "nowMs"].map((key) => ({ key, value: "" })),
    item: items
};

// Demo accounts are the test-only seed users from the README. Tokens stay empty and are never saved.
const environment = {
    id: "nexus-pc-local",
    name: "NEXUS PC (local)",
    values: [
        { key: "baseUrl", value: "http://localhost:5000/api/v1", enabled: true },
        { key: "customerEmail", value: "juan@nexuspc.test", enabled: true },
        { key: "customerPassword", value: "Customer1234", enabled: true },
        { key: "adminEmail", value: "admin@nexuspc.test", enabled: true },
        { key: "adminPassword", value: "Admin1234", enabled: true },
        { key: "expiredCoupon", value: "EXPIRED20", enabled: true },
        { key: "customerToken", value: "", enabled: true },
        { key: "adminToken", value: "", enabled: true },
        { key: "otherToken", value: "", enabled: true }
    ],
    _postman_variable_scope: "environment"
};

writeFileSync(new URL("nexus-pc.postman_collection.json", OUT), JSON.stringify(collection, null, 2));
writeFileSync(new URL("nexus-pc.local.postman_environment.json", OUT), JSON.stringify(environment, null, 2));

const requests = items.flatMap((f) => f.item);
console.log(`Wrote ${requests.length} requests in ${items.length} folders to postman/`);