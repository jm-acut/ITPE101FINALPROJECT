import { Router } from "express";
import validate from "../middleware/validate.js";
import { productController } from "../controllers/productController.js";
import { idParamSchema, listProductsQuery } from "../validators/productSchemas.js";

const router = Router();

// Public catalog. Inactive products are never returned here.
router.get("/categories", productController.categories);
router.get("/products", validate({ query: listProductsQuery }), productController.list);
router.get("/products/:id", validate({ params: idParamSchema }), productController.get);

export default router;