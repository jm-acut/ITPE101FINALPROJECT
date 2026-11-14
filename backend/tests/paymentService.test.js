import { describe, expect, it } from "vitest";
import PaymentService from "../src/services/PaymentService.class.js";
import PaymentProvider from "../src/patterns/payment/PaymentProvider.js";

// ---------- fakes: the service is composed of these, so no database and no gateway are needed ----------
class FakeProvider extends PaymentProvider {
    calls = [];
    constructor(script = {}) {
        super();
        this.script = script;
    }
    get name() {
        return "fake";
    }
    async createCheckout(args) {
        this.calls.push(["createCheckout", args]);
        return { reference: "cs_fake_1", checkoutUrl: "https://pay.test/1" };
    }
    async findPayment(args) {
        this.calls.push(["findPayment", args]);
        return this.script.found ?? { paid: false, paymentId: null, amountCents: null, currency: null, raw: null };
    }
    async cancelCheckout(reference) {
        this.calls.push(["cancelCheckout", reference]);
        return this.script.cancel ?? true;
    }
}

const USER = "user-1";
const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const pendingOrder = (overrides = {}) => ({
    id: ORDER_ID, user_id: USER, status: "pending_payment", total_cents: 115000, items: [{ quantity: 1 }],
    reservations: [{ status: "active", expires_at: new Date(Date.now() + 600_000).toISOString() }], ...overrides
});

function build({ order = pendingOrder(), provider = new FakeProvider(), existingSession, orderExists = true, webhook = { duplicate: false, processed: false }, deadSessions = [], pendingSessions = [], markPaidOutcome = "paid" } = {}) {
    const log = [];
    const payments = {
        findPendingByOrder: async () => existingSession ?? null,
        findByReference: async () => null,
        orderExists: async () => orderExists,
        attachSession: async (args) => { log.push(["attachSession", args]); return { created: true, checkoutUrl: args.checkoutUrl }; },
        markPaid: async (args) => { log.push(["markPaid", args]); return { outcome: markPaidOutcome }; },
        recordWebhook: async (args) => { log.push(["recordWebhook", args]); return webhook; },
        markWebhookProcessed: async (id) => { log.push(["markWebhookProcessed", id]); },
        listPendingForReconcile: async () => pendingSessions,
        listDeadPending: async () => deadSessions,
        setStatus: async (id, status) => { log.push(["setStatus", id, status]); }
    };
    const orders = { findById: async (id) => (order && id === order.id ? order : null) };
    const orderService = { getOwn: async (userId, orderId) => ({ id: orderId, status: "from-order-service" }) };
    const messages = [];
    const logger = { info: (m) => messages.push(["info", m]), warn: (m) => messages.push(["warn", m]) };

    const service = new PaymentService({ getProvider: () => provider, payments, orders, orderService, clientBaseUrl: () => "http://localhost:5173", logger });
    return { service, provider, log, messages };
}
const names = (log) => log.map((entry) => entry[0]);

describe("PaymentService.startPayment", () => {
    it("asks the provider for a checkout, stores the session, and returns its address", async () => {
        const { service, provider, log } = build();
        const result = await service.startPayment(USER, ORDER_ID);

        expect(result).toEqual({ checkoutUrl: "https://pay.test/1" });
        expect(provider.calls).toHaveLength(1);

        const [, args] = provider.calls[0];
        expect(args.urls.success).toBe(`http://localhost:5173/orders/${ORDER_ID}?payment=success`);
        expect(args.urls.cancel).toBe(`http://localhost:5173/orders/${ORDER_ID}?payment=cancelled`);
        expect(log[0][1]).toMatchObject({ orderId: ORDER_ID, provider: "fake", reference: "cs_fake_1", amountCents: 115000 });
    });

    it("sends the customer to the same session when Pay is clicked twice (no second checkout)", async () => {
        const { service, provider } = build({ existingSession: { raw: { checkoutUrl: "https://pay.test/existing" } } });
        expect(await service.startPayment(USER, ORDER_ID)).toEqual({ checkoutUrl: "https://pay.test/existing" });
        expect(provider.calls).toHaveLength(0);
    });

    it("refuses an order that is not awaiting payment, or whose window ended", async () => {
        await expect(build({ order: pendingOrder({ status: "paid" }) }).service.startPayment(USER, ORDER_ID)).rejects.toMatchObject({ statusCode: 409, code: "ORDER_NOT_PAYABLE" });

        const expired = pendingOrder({ reservations: [{ status: "active", expires_at: new Date(Date.now() - 1000).toISOString() }] });
        await expect(build({ order: expired }).service.startPayment(USER, ORDER_ID)).rejects.toMatchObject({ statusCode: 409, code: "PAYMENT_WINDOW_ENDED" });
    });

    it("hides another customer's order", async () => {
        await expect(build().service.startPayment("someone-else", ORDER_ID)).rejects.toMatchObject({ statusCode: 404, code: "ORDER_NOT_FOUND" });
    });
});

describe("PaymentService.handleEvent", () => {
    const paidEvent = { type: "payment.paid", eventId: "pay_1:PAYMENT_SUCCESS", orderId: ORDER_ID, paymentId: "pay_1", amountCents: 115000, currency: "PHP", raw: { id: "pay_1" } };

    it("applies a verified payment once and records the event", async () => {
        const { service, log } = build();
        expect(await service.handleEvent(paidEvent)).toBe("paid");
        expect(names(log)).toEqual(["recordWebhook", "markPaid", "markWebhookProcessed"]);
        expect(log[1][1]).toMatchObject({ orderId: ORDER_ID, amountCents: 115000, currency: "PHP" });
    });

    it("acknowledges a duplicate without applying it again", async () => {
        const { service, log } = build({ webhook: { duplicate: true, processed: true } });
        expect(await service.handleEvent(paidEvent)).toBe("duplicate");
        expect(names(log)).toEqual(["recordWebhook"]);
    });

    it("retries an event whose earlier attempt failed midway", async () => {
        const { service, log } = build({ webhook: { duplicate: true, processed: false } });
        expect(await service.handleEvent(paidEvent)).toBe("paid");
        expect(names(log)).toContain("markPaid");
    });

    it("ignores other event types and events for orders that are not ours, storing nothing", async () => {
        const first = build();
        expect(await first.service.handleEvent({ ...paidEvent, type: "ignored" })).toBe("ignored");
        expect(first.log).toHaveLength(0);

        const second = build({ orderExists: false });
        expect(await second.service.handleEvent(paidEvent)).toBe("unknown_order");
        expect(second.log).toHaveLength(0);
    });

    it("passes the database's verdict through (for example a late payment)", async () => {
        const { service } = build({ markPaidOutcome: "late_payment" });
        expect(await service.handleEvent(paidEvent)).toBe("late_payment");
    });
});

describe("PaymentService recovery paths", () => {
    const found = { paid: true, paymentId: "pay_1", amountCents: 115000, currency: "PHP", raw: {} };

    it("syncPayment asks the gateway only when a payment session exists, then applies a paid result", async () => {
        const none = build();
        await none.service.syncPayment(USER, ORDER_ID);
        expect(none.provider.calls).toHaveLength(0);

        const withSession = build({ provider: new FakeProvider({ found }), existingSession: { gateway_reference: "cs_9" } });
        const order = await withSession.service.syncPayment(USER, ORDER_ID);
        expect(withSession.provider.calls[0]).toEqual(["findPayment", { orderId: ORDER_ID, reference: "cs_9" }]);
        expect(names(withSession.log)).toEqual(["markPaid"]);
        expect(order.status).toBe("from-order-service");
    });

    it("reconcilePending recovers orders whose webhook never arrived", async () => {
        const { service, log } = build({ provider: new FakeProvider({ found }), pendingSessions: [{ order_id: ORDER_ID, gateway_reference: "cs_1" }] });
        expect(await service.reconcilePending()).toBe(1);
        expect(names(log)).toEqual(["markPaid"]);
    });

    it("cleanupDeadSessions closes unpaid sessions, and treats money that arrived as a late payment", async () => {
        const closing = build({ deadSessions: [{ id: "p1", order_id: ORDER_ID, gateway_reference: "cs_1" }] });
        expect(await closing.service.cleanupDeadSessions()).toBe(1);
        expect(closing.provider.calls.map((c) => c[0])).toEqual(["findPayment", "cancelCheckout"]);
        expect(closing.log).toEqual([["setStatus", "p1", "expired"]]);

        const refused = build({ provider: new FakeProvider({ cancel: false }), deadSessions: [{ id: "p2", order_id: ORDER_ID, gateway_reference: "cs_2" }] });
        expect(await refused.service.cleanupDeadSessions()).toBe(0);
        expect(refused.log).toEqual([["setStatus", "p2", "expire_refused"]]);

        const late = build({ provider: new FakeProvider({ found }), markPaidOutcome: "late_payment", deadSessions: [{ id: "p3", order_id: ORDER_ID, gateway_reference: "cs_3" }] });
        await late.service.cleanupDeadSessions();
        expect(names(late.log)).toEqual(["markPaid"]); // recorded, never cancelled
        expect(late.provider.calls.map((c) => c[0])).toEqual(["findPayment"]);
    });

    it("does nothing when payments are not configured", async () => {
        const service = new PaymentService({
            getProvider: () => { throw new Error("not configured"); },
            payments: {}, orders: {}, orderService: {}, clientBaseUrl: () => "", logger: {}
        });
        expect(await service.reconcilePending()).toBe(0);
        expect(await service.cleanupDeadSessions()).toBe(0);
    });
});