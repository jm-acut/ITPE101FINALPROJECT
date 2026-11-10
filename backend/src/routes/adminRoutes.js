import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { productController } from "../controllers/productController.js";
import { adminController } from "../controllers/adminController.js";
import { couponController } from "../controllers/couponController.js";
import {
    idParamSchema,
    listProductsQuery,
    createProductSchema,
    updateProductSchema
} from "../validators/productSchemas.js";
import { adminOrdersQuery, updateOrderStatusSchema, stockAdjustSchema } from "../validators/adminSchemas.js";
import { createCouponSchema, updateCouponSchema } from "../validators/couponSchemas.js";
import { listOrdersQuery as pageQuery } from "../validators/orderSchemas.js";

const router = Router();

// One line protects every admin route. A customer token gets 403 on everything below.
router.use(authenticate, authorize("admin"));

router.get("/dashboard", adminController.dashboard);

// Products
router.get("/products", validate({ query: listProductsQuery }), productController.adminList);
router.get("/products/:id", validate({ params: idParamSchema }), productController.adminGet);
router.post("/products", validate({ body: createProductSchema }), productController.create);
router.patch("/products/:id", validate({ params: idParamSchema, body: updateProductSchema }), productController.update);
router.delete("/products/:id", validate({ params: idParamSchema }), productController.remove);

// Inventory (audited)
router.post("/products/:id/stock", validate({ params: idParamSchema, body: stockAdjustSchema }), adminController.adjustStock);
router.get("/products/:id/stock-movements", validate({ params: idParamSchema, query: pageQuery }), adminController.stockMovements);

// Orders
router.get("/orders", validate({ query: adminOrdersQuery }), adminController.listOrders);
router.get("/orders/:id", validate({ params: idParamSchema }), adminController.getOrder);
router.patch("/orders/:id/status", validate({ params: idParamSchema, body: updateOrderStatusSchema }), adminController.updateOrderStatus);

// Coupons
router.get("/coupons", validate({ query: pageQuery }), couponController.list);
router.post("/coupons", validate({ body: createCouponSchema }), couponController.create);
router.patch("/coupons/:id", validate({ params: idParamSchema, body: updateCouponSchema }), couponController.update);
router.delete("/coupons/:id", validate({ params: idParamSchema }), couponController.remove);

export default router;