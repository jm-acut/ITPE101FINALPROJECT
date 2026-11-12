import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addToCart, api, bearer, cleanup, newCatalog, newCoupon, newCustomer, placeOrder, quote, stockOf } from "./helpers.js";

let p; // the test products
let coupons;

beforeAll(async () => {
    ({ products: p } = await newCatalog([
        { key: "hundred", priceCents: 100000, stock: 10 }, // PHP 1,000.00
        { key: "odd", priceCents: 33333, stock: 10 }, // PHP 333.33 (for rounding)
        { key: "big", priceCents: 600000, stock: 10 }, // PHP 6,000.00 (free shipping)
        { key: "last", priceCents: 50000, stock: 1 }, // exactly one in stock
        { key: "limited", priceCents: 50000, stock: 3 }
    ]));
    coupons = {
        percent: await newCoupon({ type: "percentage", value: 10 }),
        expired: await newCoupon({ expires_at: new Date(Date.now() - 86_400_000).toISOString() }),
        minSpend: await newCoupon({ value: 10, min_spend_cents: 500000 }),
        once: await newCoupon({ value: 10, per_customer_limit: 1 })
    };
});

afterAll(cleanup);

describe("checkout pricing is calculated on the server", () => {
    it("ignores a price sent by the client and prices from the database", async () => {
        const user = await newCustomer("price");
        const add = await addToCart(user, p.hundred.id, 2, { priceCents: 1, unitPriceCents: 1 }); // tampering attempt
        expect(add.status).toBe(200);
        expect(add.body.data.items[0].unitPriceCents).toBe(100000);

        const res = await quote(user);
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ subtotalCents: 200000, discountCents: 0, shippingCents: 15000, totalCents: 215000 });
    });

    it("rounds a percentage discount down to the centavo", async () => {
        const user = await newCustomer("round");
        await addToCart(user, p.odd.id, 1);

        const res = await quote(user, coupons.percent.code);
        // 10% of 33,333 = 3,333.3 -> 3,333
        expect(res.body.data).toMatchObject({ subtotalCents: 33333, discountCents: 3333, shippingCents: 15000, totalCents: 45000 });
    });

    it("makes shipping free from PHP 5,000", async () => {
        const user = await newCustomer("ship");
        await addToCart(user, p.big.id, 1);

        const res = await quote(user);
        expect(res.body.data).toMatchObject({ subtotalCents: 600000, shippingCents: 0, totalCents: 600000 });
    });

    it("refuses an empty cart (409)", async () => {
        const user = await newCustomer("empty");
        const res = await placeOrder(user);
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("CART_EMPTY");
    });
});

describe("coupon rules", () => {
    it("rejects an expired coupon, an unknown code and an unmet minimum spend (422)", async () => {
        const user = await newCustomer("coupon");
        await addToCart(user, p.hundred.id, 1);

        const expired = await quote(user, coupons.expired.code);
        expect(expired.status).toBe(422);
        expect(expired.body.error.code).toBe("COUPON_EXPIRED");

        const unknown = await quote(user, "NOSUCHCODE999");
        expect(unknown.status).toBe(422);
        expect(unknown.body.error.code).toBe("COUPON_INVALID");

        const minimum = await quote(user, coupons.minSpend.code);
        expect(minimum.status).toBe(422);
        expect(minimum.body.error.code).toBe("COUPON_MIN_SPEND");
    });

    it("enforces the per-customer limit and gives the coupon back when the order is cancelled", async () => {
        const user = await newCustomer("once");
        await addToCart(user, p.hundred.id, 1);

        const first = await placeOrder(user, { couponCode: coupons.once.code });
        expect(first.status).toBe(201);
        expect(first.body.data.discountCents).toBe(10000);

        await addToCart(user, p.hundred.id, 1);
        const second = await quote(user, coupons.once.code);
        expect(second.status).toBe(422);
        expect(second.body.error.code).toBe("COUPON_ALREADY_USED");

        const cancel = await api().post(`/api/v1/orders/${first.body.data.id}/cancel`).set(bearer(user));
        expect(cancel.status).toBe(200);
        expect((await quote(user, coupons.once.code)).status).toBe(200); // usable again
    });
});

describe("stock and orders", () => {
    it("refuses to put more in the cart than is in stock (409)", async () => {
        const user = await newCustomer("cartstock");
        const res = await addToCart(user, p.limited.id, 4);
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    });

    it("reserves stock when an order is placed and returns it when the order is cancelled", async () => {
        const user = await newCustomer("reserve");
        const before = await stockOf(p.hundred.id);
        await addToCart(user, p.hundred.id, 2);

        const order = await placeOrder(user);
        expect(order.status).toBe(201);
        expect(order.body.data.status).toBe("pending_payment");
        expect(order.body.data.totalCents).toBe(215000);
        expect(await stockOf(p.hundred.id)).toBe(before - 2);

        const cancel = await api().post(`/api/v1/orders/${order.body.data.id}/cancel`).set(bearer(user));
        expect(cancel.body.data.status).toBe("cancelled");
        expect(await stockOf(p.hundred.id)).toBe(before);
    });

    it("never oversells the last item when two customers check out at the same time", async () => {
        const one = await newCustomer("race1");
        const two = await newCustomer("race2");
        expect((await addToCart(one, p.last.id, 1)).status).toBe(200);
        expect((await addToCart(two, p.last.id, 1)).status).toBe(200);

        const [a, b] = await Promise.all([placeOrder(one), placeOrder(two)]);
        expect([a.status, b.status].sort()).toEqual([201, 409]);

        const loser = a.status === 409 ? a : b;
        const winner = a.status === 201 ? a : b;
        const winnerUser = a.status === 201 ? one : two;
        expect(loser.body.error.code).toBe("INSUFFICIENT_STOCK");
        expect(await stockOf(p.last.id)).toBe(0);

        // cancelling the winner puts the item back
        await api().post(`/api/v1/orders/${winner.body.data.id}/cancel`).set(bearer(winnerUser));
        expect(await stockOf(p.last.id)).toBe(1);
    });

    it("creates only one order when the same Idempotency-Key is sent twice", async () => {
        const user = await newCustomer("idem");
        const before = await stockOf(p.hundred.id);
        await addToCart(user, p.hundred.id, 1);

        const key = `itest-key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const first = await placeOrder(user, { key });
        const repeat = await placeOrder(user, { key });

        expect(first.status).toBe(201);
        expect(repeat.status).toBe(200);
        expect(repeat.body.data.id).toBe(first.body.data.id);
        expect(await stockOf(p.hundred.id)).toBe(before - 1); // reserved once, not twice

        const list = await api().get("/api/v1/orders").set(bearer(user));
        expect(list.body.data).toHaveLength(1);
    });

    it("requires an Idempotency-Key header (422)", async () => {
        const user = await newCustomer("nokey");
        const res = await api().post("/api/v1/orders").set(bearer(user)).send({ shipping: { name: "Test Buyer", phone: "09171234567", address: "123 Test Street, Iligan City" } });
        expect(res.status).toBe(422);
    });

    it("hides another customer's order (404)", async () => {
        const owner = await newCustomer("owner");
        const other = await newCustomer("other");
        await addToCart(owner, p.hundred.id, 1);
        const order = await placeOrder(owner);

        const peek = await api().get(`/api/v1/orders/${order.body.data.id}`).set(bearer(other));
        expect(peek.status).toBe(404);
        expect(peek.body.error.code).toBe("ORDER_NOT_FOUND");
    });
});