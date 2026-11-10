import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import { cartController } from "../controllers/cartController.js";
import { addItemSchema, updateItemSchema, productIdParam } from "../validators/cartSchemas.js";

const router = Router();

// Every cart route needs a signed-in user. The cart is always the caller's own (taken from the token).
router.use(authenticate);

router.get("/", cartController.get);
router.post("/items", validate({ body: addItemSchema }), cartController.addItem);
router.patch("/items/:productId", validate({ params: productIdParam, body: updateItemSchema }), cartController.setQuantity);
router.delete("/items/:productId", validate({ params: productIdParam }), cartController.removeItem);
router.delete("/", cartController.clear);

export default router;