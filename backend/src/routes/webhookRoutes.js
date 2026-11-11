import express, { Router } from "express";
import { webhookController } from "../controllers/webhookController.js";

const router = Router();

// The body stays RAW here (a Buffer): the handler reads the exact bytes before parsing them.
router.post("/maya", express.raw({ type: "*/*", limit: "1mb" }), webhookController.maya);

export default router;