import supabase from "../config/database.js";

const SELECT = "*, category:categories!inner(id, name, slug)";

const SORTS = {
    newest: { column: "created_at", ascending: false },
    price_asc: { column: "price_cents", ascending: true },
    price_desc: { column: "price_cents", ascending: false },
    name_asc: { column: "name", ascending: true }
};

// Strip characters that have special meaning in a PostgREST filter.
const cleanSearch = (term) => term.replace(/[%_,()*\\"'.:]/g, " ").trim();

export const productRepository = {
    async list({ page, limit, search, category, minPriceCents, maxPriceCents, sort, status }) {
        let query = supabase.from("products").select(SELECT, { count: "exact" });

        if (status === "active") query = query.eq("is_active", true);
        if (status === "inactive") query = query.eq("is_active", false);

        if (category) query = query.eq("category.slug", category);
        if (minPriceCents !== undefined) query = query.gte("price_cents", minPriceCents);
        if (maxPriceCents !== undefined) query = query.lte("price_cents", maxPriceCents);

        if (search) {
            const term = cleanSearch(search);
            if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
        }

        const { column, ascending } = SORTS[sort];
        const from = (page - 1) * limit;

        const { data, error, count } = await query
            .order(column, { ascending })
            .order("id", { ascending: true })
            .range(from, from + limit - 1);

        // A page past the end is an empty page, not an error.
        if (error?.code === "PGRST103") return { rows: [], total: count ?? 0 };
        if (error) throw error;

        return { rows: data, total: count ?? 0 };
    },

    async findById(id) {
        const { data, error } = await supabase.from("products").select(SELECT).eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
    },
        async findByIds(ids) {
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from("products").select(SELECT).in("id", ids);
        if (error) throw error;
        return data;
    },

    async create(row) {
        const { data, error } = await supabase.from("products").insert(row).select(SELECT).single();
        if (error) throw error;
        return data;
    },

    async update(id, patch) {
        const { data, error } = await supabase
            .from("products")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select(SELECT)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async countOrderItems(productId) {
        const { count, error } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("product_id", productId);
        if (error) throw error;
        return count ?? 0;
    },

    async remove(id) {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
    }
};