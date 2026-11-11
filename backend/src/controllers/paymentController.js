import { paymentService } from "../services/paymentService.js";
import { ok } from "../utils/response.js";

export const paymentController = {
    async pay(req, res) {
        ok(res, await paymentService.startPayment(req.user.id, req.validated.params.id));
    },

    async sync(req, res) {
        ok(res, await paymentService.syncPayment(req.user.id, req.validated.params.id));
    }
};