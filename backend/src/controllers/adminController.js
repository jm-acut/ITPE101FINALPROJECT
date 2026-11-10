import { adminService } from "../services/adminService.js";
import { inventoryService } from "../services/inventoryService.js";
import { ok } from "../utils/response.js";

export const adminController = {
    async dashboard(req, res) {
        ok(res, await adminService.dashboard());
    },

    async listOrders(req, res) {
        const { items, meta } = await adminService.listOrders(req.validated.query);
        ok(res, items, meta);
    },

    async getOrder(req, res) {
        ok(res, await adminService.getOrder(req.validated.params.id));
    },

    async updateOrderStatus(req, res) {
        ok(res, await adminService.updateStatus(req.validated.params.id, req.validated.body, req.user.id));
    },

    async adjustStock(req, res) {
        ok(res, await inventoryService.adjust(req.validated.params.id, req.validated.body, req.user.id));
    },

    async stockMovements(req, res) {
        const { items, meta } = await inventoryService.movements(req.validated.params.id, req.validated.query);
        ok(res, items, meta);
    }
};