import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import requireIdempotencyKey from "../middleware/idempotency.js";
import { orderController } from "../controllers/orderController.js";
import { paymentController } from "../controllers/paymentController.js";
import { idParamSchema } from "../validators/productSchemas.js";
import { quoteSchema, createOrderSchema, listOrdersQuery } from "../validators/orderSchemas.js";

const router = Router();

router.use(authenticate);

router.post("/quote", validate({ body: quoteSchema }), orderController.quote);
router.post("/", requireIdempotencyKey, validate({ body: createOrderSchema }), orderController.create);
router.get("/", validate({ query: listOrdersQuery }), orderController.list);
router.get("/:id", validate({ params: idParamSchema }), orderController.get);
router.post("/:id/cancel", validate({ params: idParamSchema }), orderController.cancel);
router.post("/:id/pay", validate({ params: idParamSchema }), paymentController.pay);
router.post("/:id/sync-payment", validate({ params: idParamSchema }), paymentController.sync);

export default router;