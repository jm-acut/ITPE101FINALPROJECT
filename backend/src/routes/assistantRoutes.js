import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { aiLimiter, aiDailyLimiter } from "../middleware/rateLimiter.js";
import { assistantController } from "../controllers/assistantController.js";
import { recommendSchema } from "../validators/assistantSchemas.js";

const router = Router();

// Signed-in customers only, so usage is limited per person. The AI key never leaves the backend.
router.post(
    "/recommend",
    authenticate,
    aiLimiter,
    aiDailyLimiter,
    validate({ body: recommendSchema }),
    assistantController.recommend
);

export default router;