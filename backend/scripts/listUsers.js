import supabase from "../src/config/database.js";

const { data, error } = await supabase.from("users").select("email, role").order("email");

if (error) {
    console.error("Could not read users:", error.message);
    process.exit(1);
}
console.table(data);
console.log(`Total accounts: ${data.length}`);
