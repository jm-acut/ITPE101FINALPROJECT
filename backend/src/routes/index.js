import { Router } from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import adminRoutes from "./adminRoutes.js";
import supabase from "../config/database.js";
import { ok } from "../utils/response.js";

const router = Router();

router.get("/health", async (req, res) => {
    const { error } = await supabase.from("categories").select("id").limit(1);
    if (error) throw error;
    ok(res, { status: "ok", database: "connected" });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/", productRoutes);

export default router;