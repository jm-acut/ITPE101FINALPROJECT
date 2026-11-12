import supabase from "../config/database.js";

const COLUMNS = "id, user_id, name, part_ids, share_code, created_at, updated_at";

export const buildRepository = {
    async listByUser(userId) {
        const { data, error } = await supabase
            .from("pc_builds")
            .select(COLUMNS)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true });
        if (error) throw error;
        return data;
    },

    async countByUser(userId) {
        const { count, error } = await supabase
            .from("pc_builds")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
        if (error) throw error;
        return count ?? 0;
    },

    async findById(id) {
        const { data, error } = await supabase.from("pc_builds").select(COLUMNS).eq("id", id).maybeSingle();
        if (error) throw error;
        return data;
    },

    async findByShareCode(code) {
        const { data, error } = await supabase.from("pc_builds").select(COLUMNS).eq("share_code", code).maybeSingle();
        if (error) throw error;
        return data;
    },

    async create({ userId, name, partIds }) {
        const { data, error } = await supabase
            .from("pc_builds")
            .insert({ user_id: userId, name, part_ids: partIds })
            .select(COLUMNS)
            .single();
        if (error) throw error;
        return data;
    },

    async update(id, patch) {
        const { data, error } = await supabase
            .from("pc_builds")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select(COLUMNS)
            .single();
        if (error) throw error;
        return data;
    },

    async setShareCode(id, code) {
        const { error } = await supabase.from("pc_builds").update({ share_code: code }).eq("id", id);
        if (error) throw error;
    },

    async remove(id) {
        const { error } = await supabase.from("pc_builds").delete().eq("id", id);
        if (error) throw error;
    }
};