import supabase from "../config/database.js";

// Repositories only talk to the database. No business rules here.
const PUBLIC_COLUMNS = "id, name, email, role, created_at";

export const userRepository = {
    async findByEmail(email) {
        const { data, error } = await supabase
            .from("users")
            .select("id, name, email, role, password_hash, created_at")
            .eq("email", email)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async findById(id) {
        const { data, error } = await supabase
            .from("users")
            .select(PUBLIC_COLUMNS)
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async create({ name, email, passwordHash, role = "customer" }) {
        const { data, error } = await supabase
            .from("users")
            .insert({ name, email, password_hash: passwordHash, role })
            .select(PUBLIC_COLUMNS)
            .single();
        if (error) throw error; // code 23505 = duplicate email
        return data;
    }
};