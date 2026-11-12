import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { buildController } from "../controllers/buildController.js";
import { idParamSchema } from "../validators/productSchemas.js";
import { checkSchema, createBuildSchema, updateBuildSchema, shareCodeParam } from "../validators/buildSchemas.js";

const router = Router();

// Public: anyone can check parts or open a shared build.
router.post("/check", validate({ body: checkSchema }), buildController.check);
router.get("/shared/:code", validate({ params: shareCodeParam }), buildController.shared);

// Everything below needs a signed-in user and only touches the caller's own builds.
router.use(authenticate);

router.get("/", buildController.list);
router.post("/", validate({ body: createBuildSchema }), buildController.create);
router.get("/:id", validate({ params: idParamSchema }), buildController.get);
router.patch("/:id", validate({ params: idParamSchema, body: updateBuildSchema }), buildController.update);
router.delete("/:id", validate({ params: idParamSchema }), buildController.remove);
router.post("/:id/share", validate({ params: idParamSchema }), buildController.share);
router.delete("/:id/share", validate({ params: idParamSchema }), buildController.unshare);
router.post("/:id/add-to-cart", validate({ params: idParamSchema }), buildController.addToCart);

export default router;