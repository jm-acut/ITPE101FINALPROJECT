import { couponService } from "../services/couponService.js";
import { ok, created, noContent } from "../utils/response.js";

export const couponController = {
    async list(req, res) {
        const { items, meta } = await couponService.list(req.validated.query);
        ok(res, items, meta);
    },

    async create(req, res) {
        created(res, await couponService.create(req.validated.body));
    },

    async update(req, res) {
        ok(res, await couponService.update(req.validated.params.id, req.validated.body));
    },

    async remove(req, res) {
        await couponService.remove(req.validated.params.id);
        noContent(res);
    }
};