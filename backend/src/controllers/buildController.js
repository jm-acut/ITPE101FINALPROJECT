import { buildService } from "../services/buildService.js";
import { ok, created, noContent } from "../utils/response.js";

export const buildController = {
    async check(req, res) {
        ok(res, await buildService.check(req.validated.body.partIds));
    },

    async shared(req, res) {
        ok(res, await buildService.getShared(req.validated.params.code));
    },

    async list(req, res) {
        ok(res, await buildService.list(req.user.id));
    },

    async get(req, res) {
        ok(res, await buildService.get(req.user.id, req.validated.params.id));
    },

    async create(req, res) {
        created(res, await buildService.create(req.user.id, req.validated.body));
    },

    async update(req, res) {
        ok(res, await buildService.update(req.user.id, req.validated.params.id, req.validated.body));
    },

    async remove(req, res) {
        await buildService.remove(req.user.id, req.validated.params.id);
        noContent(res);
    },

    async share(req, res) {
        ok(res, await buildService.share(req.user.id, req.validated.params.id));
    },

    async unshare(req, res) {
        await buildService.unshare(req.user.id, req.validated.params.id);
        noContent(res);
    },

    async addToCart(req, res) {
        ok(res, await buildService.addToCart(req.user.id, req.validated.params.id));
    }
};