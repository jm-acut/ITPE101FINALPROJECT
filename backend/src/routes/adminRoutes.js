import { Router } from "express";
import validate from "../middleware/validate.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { productController } from "../controllers/productController.js";
import {
    idParamSchema,
    listProductsQuery,
    createProductSchema,
    updateProductSchema
} from "../validators/productSchemas.js";

const router = Router();

// One line protects every admin route. A customer token gets 403 on everything below.
router.use(authenticate, authorize("admin"));

router.get("/products", validate({ query: listProductsQuery }), productController.adminList);
router.get("/products/:id", validate({ params: idParamSchema }), productController.adminGet);
router.post("/products", validate({ body: createProductSchema }), productController.create);
router.patch("/products/:id", validate({ params: idParamSchema, body: updateProductSchema }), productController.update);
router.delete("/products/:id", validate({ params: idParamSchema }), productController.remove);

export default router;