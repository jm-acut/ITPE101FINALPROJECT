import bcrypt from "bcryptjs";
import supabase from "../src/config/database.js";

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.NEW_PASSWORD;

if (!email || !password) {
    console.error("Set NEW_PASSWORD first, then run: npm run admin:password -- <email>");
    process.exit(1);
}
if (password.length < 12 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error("Use 12 to 72 characters, with letters and numbers.");
    process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const { data, error } = await supabase.from("users").update({ password_hash: hash }).eq("email", email).select("role").maybeSingle();

if (error) {
    console.error("Could not update the password:", error.message);
    process.exit(1);
}
if (!data) {
    console.error("No user has that email.");
    process.exit(1);
}
console.log(`Password updated for ${email} (${data.role}).`);
