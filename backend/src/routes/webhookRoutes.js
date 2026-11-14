import express, { Router } from "express";
import { webhookController } from "../controllers/webhookController.js";

const router = Router();
const raw = express.raw({ type: "*/*", limit: "1mb" }); // the body stays RAW (a Buffer) so signatures can be checked

// The same handler serves both gateways. The one selected by PAYMENT_PROVIDER verifies the request;
// the other answers 401 because its signature header is not there.
router.post("/maya", raw, webhookController.handle);
router.post("/paymongo", raw, webhookController.handle);

export default router;