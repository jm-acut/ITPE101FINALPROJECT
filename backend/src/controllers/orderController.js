import { orderService } from "../services/orderService.js";
import { ok, created } from "../utils/response.js";

export const orderController = {
    async quote(req, res) {
        ok(res, await orderService.quote(req.user.id, req.validated.body.couponCode));
    },

    async create(req, res) {
        const { order, replayed } = await orderService.create(req.user.id, req.idempotencyKey, req.validated.body);
        // Repeating the same Idempotency-Key returns the original order with 200, not a second order.
        replayed ? ok(res, order) : created(res, order);
    },

    async list(req, res) {
        const { items, meta } = await orderService.list(req.user.id, req.validated.query);
        ok(res, items, meta);
    },

    async get(req, res) {
        ok(res, await orderService.getOwn(req.user.id, req.validated.params.id));
    },

    async cancel(req, res) {
        ok(res, await orderService.cancel(req.user.id, req.validated.params.id));
    }
};