import { authService } from "../services/authService.js";
import { ok, created } from "../utils/response.js";

// Controllers: read validated input, call ONE service method, format the response.
export const authController = {
    async register(req, res) {
        created(res, await authService.register(req.validated.body));
    },

    async login(req, res) {
        ok(res, await authService.login(req.validated.body));
    },

    async me(req, res) {
        ok(res, { user: await authService.me(req.user.id) });
    }
};