import supabase from "../config/database.js";
import { mapDbError } from "../utils/dbErrors.js";

const DETAIL_SELECT =
    "*, items:order_items(product_id, product_name, unit_price_cents, quantity)," +
    "history:order_status_history(from_status, to_status, note, created_at)," +
    "coupon:coupons(code), reservations:stock_reservations(expires_at, status)";

async function rpc(name, args) {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw mapDbError(error);
    return data;
}

export const orderRepository = {
    quote: (userId, couponCode) => rpc("quote_cart", { p_user_id: userId, p_coupon_code: couponCode ?? null }),

    place: ({ userId, idempotencyKey, couponCode, shipping }) =>
        rpc("place_order", {
            p_user_id: userId,
            p_idempotency_key: idempotencyKey,
            p_coupon_code: couponCode ?? null,
            p_shipping_name: shipping.name,
            p_shipping_phone: shipping.phone,
            p_shipping_address: shipping.address
        }),

    release: (orderId, toStatus, actorId, note) =>
        rpc("release_order", { p_order_id: orderId, p_to_status: toStatus, p_actor_id: actorId, p_note: note }),

    expireStale: () => rpc("expire_stale_orders", {}),

    async findById(id) {
        const { data, error } = await supabase.from("orders").select(DETAIL_SELECT).eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async listByUser(userId, { page, limit }) {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from("orders")
            .select("id, status, total_cents, created_at, items:order_items(quantity)", { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, from + limit - 1);

        if (error?.code === "PGRST103") return { rows: [], total: count ?? 0 };
        if (error) throw error;
        return { rows: data, total: count ?? 0 };
    }
};