import { cartService } from "../services/cartService.js";
import { ok } from "../utils/response.js";

export const cartController = {
    async get(req, res) {
        ok(res, await cartService.get(req.user.id));
    },

    async addItem(req, res) {
        ok(res, await cartService.addItem(req.user.id, req.validated.body));
    },

    async setQuantity(req, res) {
        ok(res, await cartService.setQuantity(req.user.id, req.validated.params.productId, req.validated.body.quantity));
    },

    async removeItem(req, res) {
        ok(res, await cartService.removeItem(req.user.id, req.validated.params.productId));
    },

    async clear(req, res) {
        ok(res, await cartService.clear(req.user.id));
    }
};