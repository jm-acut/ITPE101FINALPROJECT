import { productService } from "../services/productService.js";
import { categoryService } from "../services/categoryService.js";
import { ok, created, noContent } from "../utils/response.js";

export const productController = {
    // public
    async list(req, res) {
        const { items, meta } = await productService.listPublic(req.validated.query);
        ok(res, items, meta);
    },

    async get(req, res) {
        ok(res, await productService.getPublic(req.validated.params.id));
    },

    async categories(req, res) {
        ok(res, await categoryService.list());
    },

    // admin
    async adminList(req, res) {
        const { items, meta } = await productService.listForAdmin(req.validated.query);
        ok(res, items, meta);
    },

    async adminGet(req, res) {
        ok(res, await productService.getForAdmin(req.validated.params.id));
    },

    async create(req, res) {
        created(res, await productService.create(req.validated.body));
    },

    async update(req, res) {
        ok(res, await productService.update(req.validated.params.id, req.validated.body));
    },

    async remove(req, res) {
        await productService.remove(req.validated.params.id);
        noContent(res);
    }
};