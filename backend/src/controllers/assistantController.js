import { assistantService } from "../services/assistantService.js";
import { ok } from "../utils/response.js";

export const assistantController = {
    async recommend(req, res) {
        ok(res, await assistantService.recommend(req.validated.body));
    }
};