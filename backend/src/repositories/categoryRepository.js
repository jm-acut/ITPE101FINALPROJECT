import supabase from "../config/database.js";

export const categoryRepository = {
    async findAll() {
        const { data, error } = await supabase
            .from("categories")
            .select("id, name, slug, description")
            .order("name", { ascending: true });
        if (error) throw error;
        return data;
    },

    async exists(id) {
        const { data, error } = await supabase.from("categories").select("id").eq("id", id).maybeSingle();
        if (error) throw error;
        return Boolean(data);
    }
};