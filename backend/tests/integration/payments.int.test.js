import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supabase from "../../src/config/database.js";
import { flattenPayload } from "../../src/patterns/payment/mayaSignature.js";
import { addToCart, api, bearer, cleanup, dbOrder, newCatalog, newCustomer, placeOrder, uniq } from "./helpers.js";

// The tests sign webhooks with their OWN key pair. The factory trusts this public key only when NODE_ENV is "test".
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.TEST_WEBHOOK_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" });

// Signs a payload the way Maya does: sorted "key=value" pairs joined by "&", plus "&nonce=...", RSA-SHA256.
function sign(payload, { nonce = `n-${uniq()}`, timestamp = Date.now() } = {}) {
    const text = `${flattenPayload(payload).sort().join("&")}&nonce=${nonce}`;
    const signature = createSign("RSA-SHA256").update(text).sign(privateKey, "hex");
    return {
        "X-Maya-Webhook-Signature": `nonce=${nonce},v1=${signature}`,
        "X-Maya-Webhook-Timestamp": String(timestamp)
    };
}

const post = (payload, headers = {}) => api().post("/api/v1/webhooks/maya").set(headers).send(payload);

const eventFor = (order, { paymentId = `itest_pay_${uniq()}`, amountCents = order.totalCents, status = "PAYMENT_SUCCESS" } = {}) => ({
    id: paymentId,
    isPaid: status === "PAYMENT_SUCCESS",
    status,
    amount: amountCents / 100,
    currency: "PHP",
    requestReferenceNumber: order.id
});

let product;

beforeAll(async () => {
    ({ products: { item: product } } = await newCatalog([{ key: "item", priceCents: 100000, stock: 100 }]));
});

afterAll(cleanup);

// An unpaid order with a payment session, as if the customer had clicked "Pay" (no call to Maya is made).
async function orderAwaitingPayment() {
    const user = await newCustomer("pay");
    await addToCart(user, product.id, 1);
    const res = await placeOrder(user);
    expect(res.status).toBe(201);
    const order = res.body.data;

    const reference = `cs_itest_${uniq()}`;
    const { error } = await supabase.from("payments").insert({
        order_id: order.id,
        provider: "maya",
        gateway_reference: reference,
        amount_cents: order.totalCents,
        currency: "PHP",
        status: "pending",
        raw: { checkoutUrl: "https://example.test/pay" }
    });
    if (error) throw new Error(error.message);
    await supabase.from("orders").update({ gateway_reference: reference }).eq("id", order.id);

    return { user, order };
}

describe("webhook signature verification", () => {
    it("rejects a webhook with no signature (401) and changes nothing", async () => {
        const { order } = await orderAwaitingPayment();
        const res = await post(eventFor(order));
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("INVALID_SIGNATURE");
        expect((await dbOrder(order.id)).status).toBe("pending_payment");
    });

    it("rejects a webhook whose body was changed after signing (401)", async () => {
        const { order } = await orderAwaitingPayment();
        const original = eventFor(order);
        const headers = sign(original);

        const res = await post({ ...original, amount: 1 }, headers); // attacker lowers the amount
        expect(res.status).toBe(401);
        expect((await dbOrder(order.id)).status).toBe("pending_payment");
    });

    it("rejects an old timestamp (401), which blocks replays of captured requests", async () => {
        const { order } = await orderAwaitingPayment();
        const payload = eventFor(order);
        const res = await post(payload, sign(payload, { timestamp: Date.now() - 10 * 60 * 1000 }));
        expect(res.status).toBe(401);
        expect((await dbOrder(order.id)).status).toBe("pending_payment");
    });
});

describe("verified payment events", () => {
    it("marks the order paid, consumes the reservation, and ignores a replay of the same event", async () => {
        const { order } = await orderAwaitingPayment();
        const payload = eventFor(order);

        const first = await post(payload, sign(payload));
        expect(first.status).toBe(200);
        expect(first.body.outcome).toBe("paid");
        expect((await dbOrder(order.id)).status).toBe("paid");

        const { data: payment } = await supabase.from("payments").select("status").eq("order_id", order.id).single();
        expect(payment.status).toBe("paid");
        const { data: holds } = await supabase.from("stock_reservations").select("status").eq("order_id", order.id);
        expect(holds.every((h) => h.status === "consumed")).toBe(true);

        // replay: the same event again (a new signature is fine, the event id is what counts)
        const replay = await post(payload, sign(payload));
        expect(replay.status).toBe(200);
        expect(replay.body.outcome).toBe("duplicate");

        const { data: events } = await supabase.from("webhook_events").select("id").eq("event_id", `${payload.id}:PAYMENT_SUCCESS`);
        expect(events).toHaveLength(1);
        const { data: history } = await supabase.from("order_status_history").select("id").eq("order_id", order.id).eq("to_status", "paid");
        expect(history).toHaveLength(1);
    });

    it("flags a payment with the wrong amount and does not mark the order paid", async () => {
        const { order } = await orderAwaitingPayment();
        const payload = eventFor(order, { amountCents: order.totalCents - 100 });

        const res = await post(payload, sign(payload));
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("amount_mismatch");

        const row = await dbOrder(order.id);
        expect(row.status).toBe("pending_payment");
        expect(row.flagged).toBe(true);
    });

    it("never marks a cancelled order paid; it flags it for a refund instead", async () => {
        const { user, order } = await orderAwaitingPayment();
        const cancel = await api().post(`/api/v1/orders/${order.id}/cancel`).set(bearer(user));
        expect(cancel.body.data.status).toBe("cancelled");

        const payload = eventFor(order);
        const res = await post(payload, sign(payload));
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("late_payment");

        const row = await dbOrder(order.id);
        expect(row.status).toBe("cancelled");
        expect(row.flagged).toBe(true);
        expect(row.flag_reason).toMatch(/refund/i);
    });

    it("acknowledges an event for an unknown order without crashing", async () => {
        const payload = { id: `itest_pay_${uniq()}`, isPaid: true, status: "PAYMENT_SUCCESS", amount: 10, currency: "PHP", requestReferenceNumber: randomUUID() };
        const res = await post(payload, sign(payload));
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("unknown_order");
    });

    it("acknowledges and ignores other event types", async () => {
        const { order } = await orderAwaitingPayment();
        const payload = eventFor(order, { status: "PAYMENT_FAILED" });

        const res = await post(payload, sign(payload));
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("ignored");
        expect((await dbOrder(order.id)).status).toBe("pending_payment");
    });
});

describe("paying", () => {
    it("refuses to start a payment for an order that is already paid (409)", async () => {
        const { user, order } = await orderAwaitingPayment();
        const payload = eventFor(order);
        await post(payload, sign(payload));

        const res = await api().post(`/api/v1/orders/${order.id}/pay`).set(bearer(user));
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("ORDER_NOT_PAYABLE");
    });
});