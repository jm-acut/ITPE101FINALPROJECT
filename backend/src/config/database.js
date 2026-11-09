import { createClient } from "@supabase/supabase-js";
import env from "./env.js";

// Singleton: ONE client, imported by every repository.
// The service_role key is backend-only. Never put it in the frontend.
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default supabase;