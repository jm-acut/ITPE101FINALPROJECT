import supabase from "../config/database.js";

const ITEM_SELECT =
    "quantity, product:products(id, name, brand, price_cents, stock, image_url, is_active, category:categories(slug))";

export const cartRepository = {
    // One cart per user. Upsert so two simultaneous requests cannot create two carts.
    async getOrCreate(userId) {
        const { data, error } = await supabase
            .from("carts")
            .upsert({ user_id: userId }, { onConflict: "user_id" })
            .select("id, user_id")
            .single();
        if (error) throw error;
        return data;
    },

    async getItems(cartId) {
        const { data, error } = await supabase
            .from("cart_items")
            .select(ITEM_SELECT)
            .eq("cart_id", cartId)
            .order("id", { ascending: true });
        if (error) throw error;
        return data;
    },

    async findItem(cartId, productId) {
        const { data, error } = await supabase
            .from("cart_items")
            .select("quantity")
            .eq("cart_id", cartId)
            .eq("product_id", productId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async setItem(cartId, productId, quantity) {
        const { error } = await supabase
            .from("cart_items")
            .upsert({ cart_id: cartId, product_id: productId, quantity }, { onConflict: "cart_id,product_id" });
        if (error) throw error;
    },

    async removeItem(cartId, productId) {
        const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartId).eq("product_id", productId);
        if (error) throw error;
    },

    async clear(cartId) {
        const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartId);
        if (error) throw error;
    }
};