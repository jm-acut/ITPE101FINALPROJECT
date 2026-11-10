import supabase from "../config/database.js";
import { mapDbError } from "../utils/dbErrors.js";

export const stockRepository = {
    async adjust(productId, delta, reason, actorId) {
        const { data, error } = await supabase.rpc("adjust_stock", {
            p_product_id: productId,
            p_delta: delta,
            p_reason: reason,
            p_actor: actorId
        });
        if (error) throw mapDbError(error);
        return data;
    },

    async listMovements(productId, { page, limit }) {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from("stock_movements")
            .select("id, previous_stock, new_stock, reason, created_at, actor:users(name)", { count: "exact" })
            .eq("product_id", productId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, from + limit - 1);

        if (error?.code === "PGRST103") return { rows: [], total: count ?? 0 };
        if (error) throw error;
        return { rows: data, total: count ?? 0 };
    }
};