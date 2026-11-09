// Run with: npm run reset (development only). Deletes ALL rows, then run "npm run seed".
import supabase from "../config/database.js";
import env from "../config/env.js";

if (env.isProduction) {
    console.error("Refusing to reset a production database.");
    process.exit(1);
}

const tablesInDeleteOrder = [
    "webhook_events", "payments", "stock_reservations", "stock_movements",
    "coupon_redemptions", "order_status_history", "order_items", "orders",
    "cart_items", "carts", "pc_builds", "coupons", "products", "categories", "users"
];

for (const table of tablesInDeleteOrder) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) {
        console.error(`Reset failed at "${table}":`, error.message);
        process.exit(1);
    }
    console.log(`cleared ${table}`);
}
console.log("Database reset. Now run: npm run seed");