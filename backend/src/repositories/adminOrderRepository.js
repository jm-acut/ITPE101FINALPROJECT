import supabase from "../config/database.js";
import { mapDbError } from "../utils/dbErrors.js";

const LIST_SELECT = "id, status, total_cents, flagged, created_at, customer:users(name, email), items:order_items(quantity)";

const DETAIL_SELECT =
    "*, customer:users(name, email)," +
    "items:order_items(product_id, product_name, unit_price_cents, quantity)," +
    "history:order_status_history(from_status, to_status, note, created_at)," +
    "coupon:coupons(code), reservations:stock_reservations(expires_at, status)";

// Dates from the admin filter are Philippine calendar days (UTC+8).
const dayStart = (day) => new Date(`${day}T00:00:00+08:00`).toISOString();
const dayEnd = (day) => new Date(`${day}T23:59:59.999+08:00`).toISOString();

async function rpc(name, args) {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw mapDbError(error);
    return data;
}

export const adminOrderRepository = {
    async list({ page, limit, status, flagged, from, to }) {
        let query = supabase.from("orders").select(LIST_SELECT, { count: "exact" });

        if (status) query = query.eq("status", status);
        if (flagged !== undefined) query = query.eq("flagged", flagged);
        if (from) query = query.gte("created_at", dayStart(from));
        if (to) query = query.lte("created_at", dayEnd(to));

        const offset = (page - 1) * limit;
        const { data, error, count } = await query
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(offset, offset + limit - 1);

        if (error?.code === "PGRST103") return { rows: [], total: count ?? 0 };
        if (error) throw error;
        return { rows: data, total: count ?? 0 };
    },

    async findDetail(id) {
        const { data, error } = await supabase.from("orders").select(DETAIL_SELECT).eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
    },

    transition: (orderId, from, to, actorId, note) =>
        rpc("transition_order", { p_order_id: orderId, p_from: from, p_to: to, p_actor: actorId, p_note: note ?? null }),

    stats: () => rpc("dashboard_stats", { p_low_stock: 5 })
};