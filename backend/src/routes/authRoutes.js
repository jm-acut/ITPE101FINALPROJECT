import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { authController } from "../controllers/authController.js";
import { registerSchema, loginSchema } from "../validators/authSchemas.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.get("/me", authenticate, authController.me);

export default router;