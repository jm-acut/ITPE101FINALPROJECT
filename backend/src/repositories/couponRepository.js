import supabase from "../config/database.js";

export const couponRepository = {
    async list({ page, limit }) {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from("coupons")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, from + limit - 1);

        if (error?.code === "PGRST103") return { rows: [], total: count ?? 0 };
        if (error) throw error;
        return { rows: data, total: count ?? 0 };
    },

    async findById(id) {
        const { data, error } = await supabase.from("coupons").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async create(row) {
        const { data, error } = await supabase.from("coupons").insert(row).select("*").single();
        if (error) throw error;
        return data;
    },

    async update(id, patch) {
        const { data, error } = await supabase.from("coupons").update(patch).eq("id", id).select("*").maybeSingle();
        if (error) throw error;
        return data;
    },

    async countOrders(id) {
        const { count, error } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", id);
        if (error) throw error;
        return count ?? 0;
    },

    async remove(id) {
        const { error } = await supabase.from("coupons").delete().eq("id", id);
        if (error) throw error;
    }
};