// The API contract. Single source of truth: Swagger UI (/api-docs) and openapi.yaml are both generated from this file.
// A test (tests/openapi.test.js) checks it for completeness, and an integration test checks that every documented route exists.

const UUID = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const UUID2 = "7a2b9c1d-4e3f-4a5b-9c6d-1e2f3a4b5c6d";
const UUID3 = "b8d4e6f0-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const NOW = "2026-11-12T08:30:00.000Z";
const LATER = "2026-11-12T08:45:00.000Z";

// ---------- tiny schema helpers ----------
const str = (example, extra = {}) => ({ type: "string", example, ...extra });
const int = (example, extra = {}) => ({ type: "integer", example, ...extra });
const bool = (example) => ({ type: "boolean", example });
const uuid = (example = UUID) => ({ type: "string", format: "uuid", example });
const date = (example = NOW) => ({ type: "string", format: "date-time", example });
const obj = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required });
const arr = (items) => ({ type: "array", items });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const refResponse = (name) => ({ $ref: `#/components/responses/${name}` });
const nullable = (schema) => ({ ...schema, nullable: true });

const ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"];

// ---------- response helpers ----------
const json = (description, schema, example) => ({ description, content: { "application/json": { schema, example } } });
const envelope = (schema) => obj({ success: bool(true), data: schema });
const listEnvelope = (item) => obj({ success: bool(true), data: arr(item), meta: ref("PageMeta") });
const success = (schema, data, description = "Success") => json(description, envelope(schema), { success: true, data });
const list = (item, data, total = data.length) =>
    json("Success", listEnvelope(item), { success: true, data, meta: { total, page: 1, limit: 12, totalPages: 1 } });
const noContent = () => ({ description: "Done. No response body." });
const errorExample = (status, code, message, details) =>
    json(`Error ${status}: ${code}`, ref("ErrorResponse"), {
        success: false,
        error: { code, message, ...(details ? { details } : {}) },
        requestId: UUID2
    });

// ---------- example data ----------
const user = { id: UUID, name: "Juan Dela Cruz", email: "juan@nexuspc.test", role: "customer", createdAt: NOW };
const category = { id: UUID2, name: "Processors", slug: "processors" };
const product = {
    id: UUID, name: "AMD Ryzen 5 7600", brand: "AMD", description: "6-core Zen 4 processor.", priceCents: 1399000, stock: 25,
    imageUrl: null, specs: { socket: "AM5", cores: 6, tdp: 65, ramType: "DDR5" }, isActive: true, category, createdAt: NOW, updatedAt: NOW
};
const cartItem = {
    productId: UUID, name: "AMD Ryzen 5 7600", brand: "AMD", imageUrl: null, categorySlug: "processors", unitPriceCents: 1399000,
    quantity: 1, lineTotalCents: 1399000, stock: 25, issue: null
};
const cart = { items: [cartItem], itemCount: 1, subtotalCents: 1399000, hasIssues: false };
const quoteData = { subtotalCents: 1399000, discountCents: 139900, shippingCents: 0, totalCents: 1259100, coupon: { couponId: UUID3, code: "WELCOME10", discountCents: 139900 } };
const shipping = { name: "Juan Dela Cruz", phone: "09171234567", address: "123 Rizal St, Barangay Uno, Iligan City" };
const order = {
    id: UUID, status: "pending_payment", subtotalCents: 1399000, discountCents: 0, shippingCents: 0, totalCents: 1399000, currency: "PHP",
    couponCode: null, flagged: false, shipping,
    items: [{ productId: UUID, name: "AMD Ryzen 5 7600", unitPriceCents: 1399000, quantity: 1, lineTotalCents: 1399000 }],
    history: [{ from: null, to: "pending_payment", note: "Order placed", createdAt: NOW }], expiresAt: LATER, createdAt: NOW
};
const orderSummary = { id: UUID, status: "paid", totalCents: 1399000, itemCount: 1, createdAt: NOW };
const adminOrder = { ...order, customer: { name: "Juan Dela Cruz", email: "juan@nexuspc.test" }, flagReason: null, adminActions: ["cancelled"] };
const adminOrderSummary = { id: UUID, status: "paid", totalCents: 1399000, flagged: false, customer: { name: "Juan Dela Cruz", email: "juan@nexuspc.test" }, itemCount: 1, createdAt: NOW };
const couponData = {
    id: UUID3, code: "WELCOME10", type: "percentage", value: 10, minSpendCents: 500000, expiresAt: "2027-12-31T00:00:00.000Z",
    usageLimit: 500, perCustomerLimit: 1, usedCount: 3, isActive: true, createdAt: NOW
};
const issue = { code: "SOCKET_MISMATCH", severity: "error", message: "AMD Ryzen 5 7600 uses socket AM5, but ASUS TUF B550 uses socket AM4.", partIds: [UUID, UUID2] };
const reportBase = {
    compatible: false, complete: false, issues: [issue],
    summary: { partCount: 2, totalPriceCents: 2589000, estimatedWatts: 140, recommendedPsuW: 200, psuWattage: null }
};
const report = { ...reportBase, parts: [product] };
const build = { id: UUID, name: "My 1080p build", partIds: [UUID], shareCode: null, createdAt: NOW, updatedAt: NOW, ...report };
const dashboard = { paidOrders: 12, grossSalesCents: 25400000, pendingOrders: 2, flaggedOrders: 1, lowStock: [{ id: UUID, name: "Seasonic Focus GX-750", stock: 3 }] };

// ---------- component schemas ----------
const schemas = {
    ErrorResponse: obj({
        success: bool(false),
        error: obj({ code: str("VALIDATION_ERROR"), message: str("Validation failed."), details: arr(obj({ in: str("body"), field: str("email"), message: str("Enter a valid email address.") }, ["field", "message"])) }, ["code", "message"]),
        requestId: uuid(UUID2)
    }),
    PageMeta: obj({ total: int(24), page: int(1), limit: int(12), totalPages: int(2) }),
    Category: obj({ id: uuid(UUID2), name: str("Processors"), slug: str("processors"), description: str("Desktop CPUs.") }, ["id", "name", "slug"]),
    User: obj({ id: uuid(), name: str("Juan Dela Cruz"), email: str("juan@nexuspc.test"), role: { type: "string", enum: ["customer", "admin"], example: "customer" }, createdAt: date() }),
    AuthResult: obj({ user: ref("User"), token: str("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", { description: "JWT for the Authorization: Bearer header." }) }),
    RegisterInput: obj({ name: str("Juan Dela Cruz", { minLength: 2, maxLength: 80 }), email: str("juan@nexuspc.test", { format: "email" }), password: str("Secret1234", { minLength: 8, maxLength: 72, description: "At least one letter and one number." }) }),
    LoginInput: obj({ email: str("juan@nexuspc.test", { format: "email" }), password: str("Customer1234") }),
    Product: obj({
        id: uuid(), name: str("AMD Ryzen 5 7600"), brand: nullable(str("AMD")), description: str("6-core Zen 4 processor."), priceCents: int(1399000, { description: "Whole centavos. 1399000 = PHP 13,990.00." }),
        stock: int(25), imageUrl: nullable(str("https://example.com/cpu.jpg")), specs: { type: "object", additionalProperties: true, example: { socket: "AM5", tdp: 65 } },
        isActive: bool(true), category: ref("Category"), createdAt: date(), updatedAt: date()
    }),
    ProductInput: obj({
        categoryId: uuid(UUID2), name: str("AMD Ryzen 5 7600", { minLength: 2, maxLength: 120 }), brand: str("AMD"), description: str("6-core processor."),
        priceCents: int(1399000, { minimum: 0 }), stock: int(25, { minimum: 0, description: "Starting stock (audited as 'Initial stock'). Cannot be set by PATCH." }),
        imageUrl: str("https://example.com/cpu.jpg"), specs: { type: "object", additionalProperties: true, example: { socket: "AM5" } }, isActive: bool(true)
    }, ["categoryId", "name", "priceCents", "stock"]),
    ProductUpdate: { type: "object", description: "Send at least one field. Stock cannot be changed here.", properties: { categoryId: uuid(UUID2), name: str("New name"), brand: str("AMD"), description: str("Text"), priceCents: int(1299000), imageUrl: str("https://example.com/x.jpg"), specs: { type: "object", additionalProperties: true }, isActive: bool(false) } },
    StockAdjustInput: obj({ change: int(10, { description: "Positive adds stock, negative removes it. Not zero." }), reason: str("Restock from supplier", { minLength: 3, maxLength: 200 }) }),
    StockAdjustResult: obj({ productId: uuid(), previousStock: int(25), newStock: int(35) }),
    StockMovement: obj({ id: uuid(), previousStock: int(25), newStock: int(35), change: int(10), reason: str("Restock from supplier"), actor: str("NEXUS Admin"), createdAt: date() }),
    CartItem: obj({
        productId: uuid(), name: str("AMD Ryzen 5 7600"), brand: nullable(str("AMD")), imageUrl: nullable(str("https://example.com/cpu.jpg")), categorySlug: nullable(str("processors")),
        unitPriceCents: int(1399000), quantity: int(1), lineTotalCents: int(1399000), stock: int(25),
        issue: { type: "string", nullable: true, description: "UNAVAILABLE, OUT_OF_STOCK, INSUFFICIENT_STOCK, or null when the item is fine.", example: null }
    }),
    Cart: obj({ items: arr(ref("CartItem")), itemCount: int(1), subtotalCents: int(1399000), hasIssues: bool(false) }),
    CartAddInput: obj({ productId: uuid(), quantity: int(1, { minimum: 1, maximum: 99, default: 1 }) }, ["productId"]),
    CartQuantityInput: obj({ quantity: int(2, { minimum: 1, maximum: 99 }) }),
    QuoteInput: obj({ couponCode: str("WELCOME10", { maxLength: 40 }) }, []),
    QuoteResult: obj({
        subtotalCents: int(1399000), discountCents: int(139900), shippingCents: int(0, { description: "PHP 150 (15000), free from a PHP 5,000 subtotal." }), totalCents: int(1259100),
        coupon: nullable(obj({ couponId: uuid(UUID3), code: str("WELCOME10"), discountCents: int(139900) }))
    }),
    ShippingInput: obj({ name: str("Juan Dela Cruz", { minLength: 2, maxLength: 80 }), phone: str("09171234567", { description: "Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX." }), address: str("123 Rizal St, Barangay Uno, Iligan City", { minLength: 10, maxLength: 300 }) }),
    OrderInput: obj({ shipping: ref("ShippingInput"), couponCode: str("WELCOME10") }, ["shipping"]),
    OrderItem: obj({ productId: uuid(), name: str("AMD Ryzen 5 7600"), unitPriceCents: int(1399000), quantity: int(1), lineTotalCents: int(1399000) }),
    OrderHistory: obj({ from: nullable(str("pending_payment")), to: str("paid"), note: nullable(str("Payment confirmed by maya")), createdAt: date() }),
    Order: obj({
        id: uuid(), status: { type: "string", enum: ORDER_STATUSES, example: "pending_payment" }, subtotalCents: int(1399000), discountCents: int(0), shippingCents: int(0), totalCents: int(1399000),
        currency: str("PHP"), couponCode: nullable(str("WELCOME10")), flagged: bool(false), shipping: obj({ name: str("Juan Dela Cruz"), phone: str("09171234567"), address: str("123 Rizal St, Iligan City") }),
        items: arr(ref("OrderItem")), history: arr(ref("OrderHistory")), expiresAt: nullable(date(LATER)), createdAt: date()
    }),
    OrderSummary: obj({ id: uuid(), status: { type: "string", enum: ORDER_STATUSES, example: "paid" }, totalCents: int(1399000), itemCount: int(1), createdAt: date() }),
    PaymentLink: obj({ checkoutUrl: str("https://payments-web-sandbox.paymaya.com/v2/checkout?id=...") }),
    WebhookResult: obj({ received: bool(true), outcome: { type: "string", enum: ["paid", "already_paid", "amount_mismatch", "late_payment", "no_payment_session", "unknown_order", "duplicate", "ignored"], example: "paid" } }),
    Issue: obj({ code: str("SOCKET_MISMATCH"), severity: { type: "string", enum: ["error", "warning"], example: "error" }, message: str("AMD Ryzen 5 7600 uses socket AM5, but ASUS TUF B550 uses socket AM4."), partIds: arr(uuid()) }),
    ReportSummary: obj({ partCount: int(2), totalPriceCents: int(2589000), estimatedWatts: nullable(int(140)), recommendedPsuW: nullable(int(200)), psuWattage: nullable(int(650)) }),
    CompatibilityReport: obj({ compatible: bool(false), complete: bool(false), issues: arr(ref("Issue")), summary: ref("ReportSummary"), parts: arr(ref("Product")) }),
    PartIdsInput: obj({ partIds: arr(uuid()) }),
    BuildInput: obj({ name: str("My 1080p build", { minLength: 2, maxLength: 60 }), partIds: { type: "array", items: uuid(), minItems: 1, maxItems: 12 } }),
    BuildUpdate: { type: "object", description: "Send at least one field.", properties: { name: str("Renamed build"), partIds: { type: "array", items: uuid(), minItems: 1, maxItems: 12 } } },
    Build: { allOf: [obj({ id: uuid(), name: str("My 1080p build"), partIds: arr(uuid()), shareCode: nullable(str("Xk3p9QmZ7aB")), createdAt: date(), updatedAt: date() }), ref("CompatibilityReport")] },
    SharedBuild: { allOf: [obj({ name: str("My 1080p build"), createdAt: date() }), ref("CompatibilityReport")] },
    ShareResult: obj({ shareCode: str("Xk3p9QmZ7aB") }),
    BuildCartResult: obj({ addedProducts: int(6), addedUnits: int(6) }),
    AssistantInput: obj({ prompt: str("A gaming PC for smooth 1080p games", { minLength: 5, maxLength: 500 }), budgetPesos: int(60000, { minimum: 15000, maximum: 1000000 }) }, ["prompt"]),
    AssistantOk: obj({
        status: str("ok", { enum: ["ok"] }), summary: str("A balanced 1080p gaming build."), parts: arr({ allOf: [ref("Product"), obj({ reason: str("Good value for 1080p.") })] }),
        report: ref("CompatibilityReport"), budgetPesos: nullable(int(60000)), discardedCount: int(0), aiAssisted: bool(true), model: str("gemini-3.5-flash-lite")
    }),
    AssistantNoMatch: obj({ status: str("no_match", { enum: ["no_match"] }), message: str("I could not put together a fully compatible build for that request."), problems: arr(str("The total (₱65,000) is above the budget (₱60,000).")), aiAssisted: bool(true) }),
    Dashboard: obj({
        paidOrders: int(12), grossSalesCents: int(25400000), pendingOrders: int(2), flaggedOrders: int(1),
        lowStock: arr(obj({ id: uuid(), name: str("Seasonic Focus GX-750"), stock: int(3) }))
    }),
    AdminOrderSummary: obj({
        id: uuid(), status: { type: "string", enum: ORDER_STATUSES }, totalCents: int(1399000), flagged: bool(false), customer: obj({ name: str("Juan Dela Cruz"), email: str("juan@nexuspc.test") }), itemCount: int(1), createdAt: date()
    }),
    AdminOrder: { allOf: [ref("Order"), obj({ customer: obj({ name: str("Juan Dela Cruz"), email: str("juan@nexuspc.test") }), flagReason: nullable(str("Payment received after the order was cancelled. Refund required.")), adminActions: arr(str("processing")) })] },
    OrderStatusInput: obj({ status: { type: "string", enum: ORDER_STATUSES, example: "processing" }, note: str("Packed and ready", { maxLength: 200 }) }, ["status"]),
    Coupon: obj({
        id: uuid(UUID3), code: str("WELCOME10"), type: { type: "string", enum: ["percentage", "fixed"], example: "percentage" }, value: int(10, { description: "Percent (1-100) or centavos for a fixed coupon." }),
        minSpendCents: int(500000), expiresAt: nullable(date("2027-12-31T00:00:00.000Z")), usageLimit: nullable(int(500)), perCustomerLimit: int(1), usedCount: int(3), isActive: bool(true), createdAt: date()
    }),
    CouponInput: obj({
        code: str("SUMMER15", { description: "3-30 letters, numbers, - or _. Stored in capitals." }), type: { type: "string", enum: ["percentage", "fixed"], example: "percentage" }, value: int(15),
        minSpendCents: int(0, { default: 0 }), expiresAt: nullable(date("2027-12-31T00:00:00.000Z")), usageLimit: nullable(int(100)), perCustomerLimit: int(1, { default: 1 }), isActive: bool(true, { default: true })
    }, ["code", "type", "value"]),
    CouponUpdate: { type: "object", description: "Send at least one field.", properties: { code: str("SUMMER20"), type: { type: "string", enum: ["percentage", "fixed"] }, value: int(20), minSpendCents: int(0), expiresAt: nullable(date()), usageLimit: nullable(int(100)), perCustomerLimit: int(1), isActive: bool(false) } },
    Health: obj({ status: str("ok"), database: str("connected") })
};
schemas.CouponInput.properties.isActive = { type: "boolean", example: true, default: true };

// ---------- paths ----------
const paths = {};
const pathParam = (name) => {
    if (name === "code") return { name, in: "path", required: true, description: "Share code of a build.", schema: { type: "string", pattern: "^[A-Za-z0-9_-]{8,16}$", example: "Xk3p9QmZ7aB" } };
    return { name, in: "path", required: true, description: name === "productId" ? "Product id." : "Resource id.", schema: { type: "string", format: "uuid", example: UUID } };
};
const q = (name, schema, description) => ({ name, in: "query", required: false, description, schema });
const productQuery = (admin = false) => [
    q("page", { type: "integer", minimum: 1, default: 1 }, "Page number."),
    q("limit", { type: "integer", minimum: 1, maximum: 50, default: 12 }, "Items per page."),
    q("search", { type: "string", maxLength: 60 }, "Matches product name or brand."),
    q("category", { type: "string" }, "Category slug, for example processors."),
    q("minPriceCents", { type: "integer", minimum: 0 }, "Minimum price in centavos."),
    q("maxPriceCents", { type: "integer", minimum: 0 }, "Maximum price in centavos."),
    q("sort", { type: "string", enum: ["newest", "price_asc", "price_desc", "name_asc"], default: "newest" }, "Sort order (fixed list)."),
    ...(admin ? [q("status", { type: "string", enum: ["active", "inactive", "all"], default: "active" }, "Admin only: which products to list.")] : [])
];
const pageQuery = (limitDefault = 10) => [
    q("page", { type: "integer", minimum: 1, default: 1 }, "Page number."),
    q("limit", { type: "integer", minimum: 1, maximum: 50, default: limitDefault }, "Items per page.")
];
const idempotencyHeader = {
    name: "Idempotency-Key", in: "header", required: true, description: "Unique per checkout attempt, 8-100 characters (letters, numbers, - or _). Repeating the same key returns the same order.",
    schema: { type: "string", pattern: "^[A-Za-z0-9_-]{8,100}$", example: "5b1c7c0e-9f55-4a0f-8a0e-2d1f4b7c9a11" }
};

function add(method, path, o) {
    const params = [...[...path.matchAll(/\{(\w+)\}/g)].map((m) => pathParam(m[1])), ...(o.headers ?? []), ...(o.query ?? [])];
    const responses = { [o.ok[0]]: o.ok[1], ...(o.alsoOk ?? {}) };

    if (o.auth === "user" || o.auth === "admin") responses[401] = refResponse("Unauthorized");
    if (o.auth === "admin") responses[403] = refResponse("Forbidden");
    if (o.body || params.some((p) => p.in !== "header" || o.headers?.includes(p))) responses[422] = refResponse("ValidationError");
    for (const [status, code, message] of o.errors ?? []) responses[status] = errorExample(status, code, message);

    paths[path] ??= {};
    paths[path][method] = {
        tags: [o.tag],
        operationId: o.id,
        summary: o.summary,
        ...(o.description ? { description: o.description } : {}),
        security: o.auth === "user" || o.auth === "admin" ? [{ bearerAuth: [] }] : [],
        ...(params.length ? { parameters: params } : {}),
        ...(o.body ? { requestBody: { required: true, content: { "application/json": { schema: o.body[0], example: o.body[1] } } } } : {}),
        responses
    };
}

// Health
add("get", "/health", { tag: "System", id: "health", summary: "Check that the API and database are up", ok: [200, success(ref("Health"), { status: "ok", database: "connected" })] });

// Auth
add("post", "/auth/register", {
    tag: "Auth", id: "register", summary: "Create a customer account", body: [ref("RegisterInput"), { name: "Juan Dela Cruz", email: "juan@nexuspc.test", password: "Secret1234" }],
    ok: [201, success(ref("AuthResult"), { user, token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }, "Account created")],
    errors: [[409, "EMAIL_TAKEN", "An account with this email already exists."], [429, "AUTH_RATE_LIMITED", "Too many sign-in attempts. Try again in a few minutes."]]
});
add("post", "/auth/login", {
    tag: "Auth", id: "login", summary: "Sign in and receive a token", body: [ref("LoginInput"), { email: "juan@nexuspc.test", password: "Customer1234" }],
    ok: [200, success(ref("AuthResult"), { user, token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })],
    errors: [[401, "INVALID_CREDENTIALS", "Invalid email or password."], [429, "AUTH_RATE_LIMITED", "Too many sign-in attempts. Try again in a few minutes."]]
});
add("get", "/auth/me", { tag: "Auth", id: "me", summary: "Get the signed-in user", auth: "user", ok: [200, success(obj({ user: ref("User") }), { user })] });

// Catalog
add("get", "/categories", { tag: "Catalog", id: "listCategories", summary: "List product categories", ok: [200, success(arr(ref("Category")), [{ ...category, description: "Desktop CPUs." }])] });
add("get", "/products", { tag: "Catalog", id: "listProducts", summary: "Search and filter active products", description: "Only active products are returned.", query: productQuery(), ok: [200, list(ref("Product"), [product], 24)] });
add("get", "/products/{id}", { tag: "Catalog", id: "getProduct", summary: "Get one active product", ok: [200, success(ref("Product"), product)], errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."]] });

// Cart
add("get", "/cart", { tag: "Cart", id: "getCart", summary: "Get my cart", auth: "user", ok: [200, success(ref("Cart"), cart)] });
add("post", "/cart/items", {
    tag: "Cart", id: "addCartItem", summary: "Add a product to my cart", auth: "user", body: [ref("CartAddInput"), { productId: UUID, quantity: 1 }], ok: [200, success(ref("Cart"), cart)],
    errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."], [409, "INSUFFICIENT_STOCK", "Only 3 left in stock."]]
});
add("patch", "/cart/items/{productId}", {
    tag: "Cart", id: "setCartItemQuantity", summary: "Change the quantity of a cart item", auth: "user", body: [ref("CartQuantityInput"), { quantity: 2 }], ok: [200, success(ref("Cart"), cart)],
    errors: [[404, "CART_ITEM_NOT_FOUND", "That item is not in your cart."], [409, "INSUFFICIENT_STOCK", "Only 3 left in stock."]]
});
add("delete", "/cart/items/{productId}", { tag: "Cart", id: "removeCartItem", summary: "Remove an item from my cart", auth: "user", ok: [200, success(ref("Cart"), { items: [], itemCount: 0, subtotalCents: 0, hasIssues: false })] });
add("delete", "/cart", { tag: "Cart", id: "clearCart", summary: "Empty my cart", auth: "user", ok: [200, success(ref("Cart"), { items: [], itemCount: 0, subtotalCents: 0, hasIssues: false })] });

// Orders
add("post", "/orders/quote", {
    tag: "Orders", id: "quoteOrder", summary: "Price my cart with an optional coupon", description: "Prices always come from the database.", auth: "user",
    body: [ref("QuoteInput"), { couponCode: "WELCOME10" }], ok: [200, success(ref("QuoteResult"), quoteData)],
    errors: [[409, "CART_EMPTY", "Your cart is empty."], [422, "COUPON_EXPIRED", "This coupon has expired."]]
});
add("post", "/orders", {
    tag: "Orders", id: "createOrder", summary: "Place an order from my cart",
    description: "Reserves stock for 15 minutes. Needs an Idempotency-Key header. Repeating the same key returns the original order with status 200.", auth: "user", headers: [idempotencyHeader],
    body: [ref("OrderInput"), { shipping, couponCode: "WELCOME10" }], ok: [201, success(ref("Order"), order, "Order created")], alsoOk: { 200: success(ref("Order"), order, "Same Idempotency-Key repeated: the original order") },
    errors: [[409, "INSUFFICIENT_STOCK", "Only 0 of AMD Ryzen 5 7600 left in stock."]]
});
add("get", "/orders", { tag: "Orders", id: "listOrders", summary: "List my orders", auth: "user", query: pageQuery(), ok: [200, list(ref("OrderSummary"), [orderSummary], 1)] });
add("get", "/orders/{id}", { tag: "Orders", id: "getOrder", summary: "Get one of my orders", auth: "user", ok: [200, success(ref("Order"), order)], errors: [[404, "ORDER_NOT_FOUND", "Order not found."]] });
add("post", "/orders/{id}/cancel", {
    tag: "Orders", id: "cancelOrder", summary: "Cancel an unpaid order", auth: "user", ok: [200, success(ref("Order"), { ...order, status: "cancelled" })],
    errors: [[404, "ORDER_NOT_FOUND", "Order not found."], [409, "ORDER_NOT_CANCELLABLE", "This order can no longer be cancelled."]]
});
add("post", "/orders/{id}/pay", {
    tag: "Payments", id: "payOrder", summary: "Start a Maya checkout for an unpaid order", description: "Returns the hosted payment page address. Clicking twice returns the same session.", auth: "user",
    ok: [200, success(ref("PaymentLink"), { checkoutUrl: "https://payments-web-sandbox.paymaya.com/v2/checkout?id=abc" })],
    errors: [[404, "ORDER_NOT_FOUND", "Order not found."], [409, "ORDER_NOT_PAYABLE", "This order is not awaiting payment."], [502, "PAYMENT_PROVIDER_ERROR", "The payment provider rejected this payment request."], [503, "PAYMENT_NOT_CONFIGURED", "Online payment is not configured on this server."]]
});
add("post", "/orders/{id}/sync-payment", {
    tag: "Payments", id: "syncPayment", summary: "Ask the payment provider whether the order was paid", description: "Recovery path for a missed webhook. Uses the same safe database function as the webhook.", auth: "user",
    ok: [200, success(ref("Order"), { ...order, status: "paid" })], errors: [[404, "ORDER_NOT_FOUND", "Order not found."], [502, "PAYMENT_PROVIDER_ERROR", "Could not check the payment status. Please try again."]]
});
add("post", "/webhooks/maya", {
    tag: "Payments", id: "mayaWebhook", summary: "Receive Maya payment events (called by Maya, not by the frontend)",
    description: "The signature (RSA-SHA256 over the sorted flattened payload plus the nonce) and a 5-minute timestamp window are verified before anything changes. The response is NOT wrapped in the usual envelope.",
    headers: [
        { name: "X-Maya-Webhook-Signature", in: "header", required: true, description: "nonce=<nonce>,v1=<hex signature>", schema: { type: "string", example: "nonce=abc123,v1=9f8e7d..." } },
        { name: "X-Maya-Webhook-Timestamp", in: "header", required: true, description: "Unix time in milliseconds.", schema: { type: "string", example: "1794470000000" } }
    ],
    body: [{ type: "object", description: "Maya payment object.", additionalProperties: true }, { id: "pay_123", isPaid: true, status: "PAYMENT_SUCCESS", amount: 13990, currency: "PHP", requestReferenceNumber: UUID }],
    ok: [200, json("Event processed, duplicate, or ignored", ref("WebhookResult"), { received: true, outcome: "paid" })],
    errors: [[400, "INVALID_JSON", "Webhook body is not valid JSON."], [401, "INVALID_SIGNATURE", "Webhook signature does not match."], [503, "PAYMENT_NOT_CONFIGURED", "Online payment is not configured on this server."]]
});

// Builds
add("post", "/builds/check", { tag: "Builds", id: "checkBuild", summary: "Check whether parts work together", description: "Public. Rules: socket, memory type, power supply, part limits.", body: [ref("PartIdsInput"), { partIds: [UUID, UUID2] }], ok: [200, success(ref("CompatibilityReport"), report)] });
add("get", "/builds/shared/{code}", { tag: "Builds", id: "getSharedBuild", summary: "Open a shared build (read-only)", description: "Hides the owner. Prices and stock are live.", ok: [200, success(ref("SharedBuild"), { name: "My 1080p build", createdAt: NOW, ...report })], errors: [[404, "SHARE_NOT_FOUND", "This shared build does not exist or is no longer shared."]] });
add("get", "/builds", { tag: "Builds", id: "listBuilds", summary: "List my saved builds", auth: "user", ok: [200, success(arr(ref("Build")), [build])] });
add("post", "/builds", { tag: "Builds", id: "createBuild", summary: "Save a build", auth: "user", body: [ref("BuildInput"), { name: "My 1080p build", partIds: [UUID] }], ok: [201, success(ref("Build"), build, "Build saved")], errors: [[409, "BUILD_LIMIT", "You can save at most 20 builds. Delete one first."]] });
add("get", "/builds/{id}", { tag: "Builds", id: "getBuild", summary: "Get one of my builds", auth: "user", ok: [200, success(ref("Build"), build)], errors: [[404, "BUILD_NOT_FOUND", "Build not found."]] });
add("patch", "/builds/{id}", { tag: "Builds", id: "updateBuild", summary: "Rename a build or change its parts", auth: "user", body: [ref("BuildUpdate"), { name: "Renamed build" }], ok: [200, success(ref("Build"), build)], errors: [[404, "BUILD_NOT_FOUND", "Build not found."]] });
add("delete", "/builds/{id}", { tag: "Builds", id: "deleteBuild", summary: "Delete a build", auth: "user", ok: [204, noContent()], errors: [[404, "BUILD_NOT_FOUND", "Build not found."]] });
add("post", "/builds/{id}/share", { tag: "Builds", id: "shareBuild", summary: "Create a share link for a build", auth: "user", ok: [200, success(ref("ShareResult"), { shareCode: "Xk3p9QmZ7aB" })], errors: [[404, "BUILD_NOT_FOUND", "Build not found."]] });
add("delete", "/builds/{id}/share", { tag: "Builds", id: "unshareBuild", summary: "Stop sharing a build", auth: "user", ok: [204, noContent()], errors: [[404, "BUILD_NOT_FOUND", "Build not found."]] });
add("post", "/builds/{id}/add-to-cart", {
    tag: "Builds", id: "addBuildToCart", summary: "Add every part of a build to my cart", description: "All or nothing. Refused if the build has compatibility errors or not enough stock.", auth: "user",
    ok: [200, success(ref("BuildCartResult"), { addedProducts: 6, addedUnits: 6 })], errors: [[404, "BUILD_NOT_FOUND", "Build not found."], [409, "BUILD_INCOMPATIBLE", "This build has compatibility problems, so it cannot be added to the cart."]]
});

// Assistant
add("post", "/assistant/recommend", {
    tag: "AI assistant", id: "recommendBuild", summary: "Ask the AI advisor for a build", description: "8 requests per minute and 40 per day per user. Names, prices and stock always come from the database.", auth: "user",
    body: [ref("AssistantInput"), { prompt: "A gaming PC for smooth 1080p games", budgetPesos: 60000 }],
    ok: [200, json("A suggestion, or an honest 'no match'", { oneOf: [ref("AssistantOk"), ref("AssistantNoMatch")] }, { success: true, data: { status: "no_match", message: "I could not put together a fully compatible build for that request.", problems: ["The total (₱65,000) is above the budget (₱60,000)."], aiAssisted: true } })],
    errors: [[429, "AI_RATE_LIMITED", "You are asking the assistant too quickly. Wait a moment and try again."], [503, "AI_UNAVAILABLE", "The assistant is not available right now. You can still browse the shop or use the Build PC page."]]
});

// Admin
add("get", "/admin/dashboard", { tag: "Admin", id: "adminDashboard", summary: "Store summary", auth: "admin", ok: [200, success(ref("Dashboard"), dashboard)] });
add("get", "/admin/products", { tag: "Admin", id: "adminListProducts", summary: "List products including hidden ones", auth: "admin", query: productQuery(true), ok: [200, list(ref("Product"), [product], 24)] });
add("post", "/admin/products", { tag: "Admin", id: "adminCreateProduct", summary: "Create a product", auth: "admin", body: [ref("ProductInput"), { categoryId: UUID2, name: "AMD Ryzen 5 7600", brand: "AMD", description: "6-core processor.", priceCents: 1399000, stock: 25, specs: { socket: "AM5" } }], ok: [201, success(ref("Product"), product, "Product created")], errors: [[409, "PRODUCT_NAME_TAKEN", "A product with this name already exists."]] });
add("get", "/admin/products/{id}", { tag: "Admin", id: "adminGetProduct", summary: "Get any product", auth: "admin", ok: [200, success(ref("Product"), product)], errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."]] });
add("patch", "/admin/products/{id}", { tag: "Admin", id: "adminUpdateProduct", summary: "Edit a product (not its stock)", auth: "admin", body: [ref("ProductUpdate"), { isActive: false }], ok: [200, success(ref("Product"), { ...product, isActive: false })], errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."]] });
add("delete", "/admin/products/{id}", { tag: "Admin", id: "adminDeleteProduct", summary: "Delete a product that was never ordered", auth: "admin", ok: [204, noContent()], errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."], [409, "PRODUCT_HAS_ORDERS", "This product appears in past orders and cannot be deleted. Deactivate it instead."]] });
add("post", "/admin/products/{id}/stock", { tag: "Admin", id: "adminAdjustStock", summary: "Change stock with a recorded reason", auth: "admin", body: [ref("StockAdjustInput"), { change: 10, reason: "Restock from supplier" }], ok: [200, success(ref("StockAdjustResult"), { productId: UUID, previousStock: 25, newStock: 35 })], errors: [[409, "STOCK_NEGATIVE", "Stock cannot go below zero (current stock is 25)."], [404, "PRODUCT_NOT_FOUND", "Product not found."]] });
add("get", "/admin/products/{id}/stock-movements", { tag: "Admin", id: "adminStockMovements", summary: "Stock audit trail of a product", auth: "admin", query: pageQuery(10), ok: [200, list(ref("StockMovement"), [{ id: UUID, previousStock: 25, newStock: 35, change: 10, reason: "Restock from supplier", actor: "NEXUS Admin", createdAt: NOW }], 1)], errors: [[404, "PRODUCT_NOT_FOUND", "Product not found."]] });
add("get", "/admin/orders", {
    tag: "Admin", id: "adminListOrders", summary: "List all orders", auth: "admin",
    query: [...pageQuery(10), q("status", { type: "string", enum: ORDER_STATUSES }, "Filter by status."), q("flagged", { type: "string", enum: ["true", "false"] }, "Only orders that need attention."), q("from", { type: "string", example: "2026-11-01" }, "From date (YYYY-MM-DD, Philippine time)."), q("to", { type: "string", example: "2026-11-30" }, "To date (YYYY-MM-DD, Philippine time).")],
    ok: [200, list(ref("AdminOrderSummary"), [adminOrderSummary], 1)]
});
add("get", "/admin/orders/{id}", { tag: "Admin", id: "adminGetOrder", summary: "Get any order", auth: "admin", ok: [200, success(ref("AdminOrder"), adminOrder)], errors: [[404, "ORDER_NOT_FOUND", "Order not found."]] });
add("patch", "/admin/orders/{id}/status", {
    tag: "Admin", id: "adminUpdateOrderStatus", summary: "Move an order to its next status", description: "Allowed moves only. 'paid' and 'expired' are set by the system, never by hand.", auth: "admin",
    body: [ref("OrderStatusInput"), { status: "processing", note: "Packed and ready" }], ok: [200, success(ref("AdminOrder"), { ...adminOrder, status: "processing" })],
    errors: [[404, "ORDER_NOT_FOUND", "Order not found."], [409, "INVALID_TRANSITION", 'An order cannot move from "cancelled" to "shipped".']]
});
add("get", "/admin/coupons", { tag: "Admin", id: "adminListCoupons", summary: "List coupons", auth: "admin", query: pageQuery(10), ok: [200, list(ref("Coupon"), [couponData], 1)] });
add("post", "/admin/coupons", { tag: "Admin", id: "adminCreateCoupon", summary: "Create a coupon", auth: "admin", body: [ref("CouponInput"), { code: "SUMMER15", type: "percentage", value: 15, minSpendCents: 100000, expiresAt: "2027-12-31T00:00:00.000Z", usageLimit: 100 }], ok: [201, success(ref("Coupon"), couponData, "Coupon created")], errors: [[409, "COUPON_CODE_TAKEN", "A coupon with this code already exists."]] });
add("patch", "/admin/coupons/{id}", { tag: "Admin", id: "adminUpdateCoupon", summary: "Edit or turn a coupon on or off", auth: "admin", body: [ref("CouponUpdate"), { isActive: false }], ok: [200, success(ref("Coupon"), { ...couponData, isActive: false })], errors: [[404, "COUPON_NOT_FOUND", "Coupon not found."]] });
add("delete", "/admin/coupons/{id}", { tag: "Admin", id: "adminDeleteCoupon", summary: "Delete a coupon that was never used", auth: "admin", ok: [204, noContent()], errors: [[404, "COUPON_NOT_FOUND", "Coupon not found."], [409, "COUPON_IN_USE", "This coupon was used on orders and cannot be deleted. Deactivate it instead."]] });

export function buildSpec() {
    return {
        openapi: "3.0.3",
        info: {
            title: "NEXUS PC API",
            version: "1.0.0",
            description: [
                "REST API for the NEXUS PC store: catalog, cart, checkout, Maya payments, admin tools, PC compatibility checks, build saving and sharing, and an AI build advisor.",
                "",
                "**Conventions**",
                "- Success: `{ \"success\": true, \"data\": ..., \"meta\": ... }`. Errors: `{ \"success\": false, \"error\": { \"code\", \"message\", \"details\" }, \"requestId\" }`.",
                "- Money is always an integer number of centavos (`1399000` = PHP 13,990.00). Prices are calculated on the server.",
                "- Authenticated routes need `Authorization: Bearer <token>` (use the Authorize button). Admin routes need an admin token.",
                "- Lists are paginated with `page` and `limit`."
            ].join("\n")
        },
        servers: [{ url: "/api/v1", description: "This server" }, { url: "http://localhost:5000/api/v1", description: "Local development" }],
        tags: ["System", "Auth", "Catalog", "Cart", "Orders", "Payments", "Builds", "AI assistant", "Admin"].map((name) => ({ name })),
        paths,
        components: {
            securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Token from POST /auth/login." } },
            schemas,
            responses: {
                Unauthorized: errorExample(401, "UNAUTHENTICATED", "Missing or malformed Authorization header."),
                Forbidden: errorExample(403, "FORBIDDEN", "You do not have permission to do that."),
                ValidationError: json("Error 422: VALIDATION_ERROR", ref("ErrorResponse"), {
                    success: false,
                    error: { code: "VALIDATION_ERROR", message: "Validation failed.", details: [{ in: "body", field: "email", message: "Enter a valid email address." }] },
                    requestId: UUID2
                })
            }
        }
    };
}