// Run with: npm run seed. Safe to run many times (everything is upserted on a unique key).
// The demo passwords are TEST-ONLY.
import bcrypt from "bcryptjs";
import supabase from "../config/database.js";
import env from "../config/env.js";

if (env.isProduction) {
    console.error("Refusing to seed in production.");
    process.exit(1);
}

const categories = [
    { name: "Processors", slug: "processors", description: "Desktop CPUs for gaming, creating, and everyday work." },
    { name: "Graphics Cards", slug: "graphics-cards", description: "GPUs for gaming, rendering, and AI workloads." },
    { name: "Motherboards", slug: "motherboards", description: "The board that connects every part of your build." },
    { name: "Memory", slug: "memory", description: "DDR4 and DDR5 RAM kits." },
    { name: "Storage", slug: "storage", description: "NVMe and SATA SSDs, plus hard drives." },
    { name: "Power Supplies", slug: "power-supplies", description: "Certified PSUs with the wattage your build needs." }
];

// price is in PESOS here and converted to centavos below. Prices are sample data.
const products = [
    { c: "processors", name: "AMD Ryzen 5 7600", brand: "AMD", price: 13990, stock: 25, specs: { socket: "AM5", cores: 6, threads: 12, tdp: 65, ramType: "DDR5" }, description: "6-core Zen 4 processor with great value for 1080p and 1440p gaming." },
    { c: "processors", name: "AMD Ryzen 7 7800X3D", brand: "AMD", price: 22990, stock: 12, specs: { socket: "AM5", cores: 8, threads: 16, tdp: 120, ramType: "DDR5" }, description: "8-core gaming-focused CPU with 3D V-Cache." },
    { c: "processors", name: "AMD Ryzen 5 5600", brand: "AMD", price: 7490, stock: 30, specs: { socket: "AM4", cores: 6, threads: 12, tdp: 65, ramType: "DDR4" }, description: "Budget-friendly 6-core CPU for AM4 builds." },
    { c: "processors", name: "Intel Core i5-14400F", brand: "Intel", price: 12490, stock: 20, specs: { socket: "LGA1700", cores: 10, threads: 16, tdp: 65, ramType: "DDR5" }, description: "10-core mainstream CPU. Requires a dedicated graphics card." },
    { c: "processors", name: "Intel Core i7-14700K", brand: "Intel", price: 24990, stock: 8, specs: { socket: "LGA1700", cores: 20, threads: 28, tdp: 125, ramType: "DDR5" }, description: "20-core unlocked CPU for heavy multitasking and gaming." },

    { c: "graphics-cards", name: "NVIDIA GeForce RTX 4060 8GB", brand: "NVIDIA", price: 20990, stock: 15, specs: { vramGb: 8, tdp: 115, lengthMm: 240, recommendedPsuW: 550 }, description: "Efficient 1080p gaming card with DLSS support." },
    { c: "graphics-cards", name: "NVIDIA GeForce RTX 4070 SUPER 12GB", brand: "NVIDIA", price: 41990, stock: 7, specs: { vramGb: 12, tdp: 220, lengthMm: 285, recommendedPsuW: 650 }, description: "Strong 1440p performance with 12GB of VRAM." },
    { c: "graphics-cards", name: "AMD Radeon RX 7600 8GB", brand: "AMD", price: 17990, stock: 14, specs: { vramGb: 8, tdp: 165, lengthMm: 240, recommendedPsuW: 550 }, description: "Affordable 1080p gaming GPU." },
    { c: "graphics-cards", name: "AMD Radeon RX 7800 XT 16GB", brand: "AMD", price: 34990, stock: 6, specs: { vramGb: 16, tdp: 263, lengthMm: 267, recommendedPsuW: 700 }, description: "16GB of VRAM for high-refresh 1440p gaming." },

    { c: "motherboards", name: "MSI B650 Gaming Plus WiFi", brand: "MSI", price: 11990, stock: 18, specs: { socket: "AM5", ramType: "DDR5", formFactor: "ATX", wifi: true }, description: "AM5 ATX board with WiFi and PCIe 5.0 support." },
    { c: "motherboards", name: "ASUS TUF Gaming B550-Plus", brand: "ASUS", price: 9490, stock: 16, specs: { socket: "AM4", ramType: "DDR4", formFactor: "ATX", wifi: false }, description: "Durable AM4 ATX board for Ryzen 5000 builds." },
    { c: "motherboards", name: "Gigabyte B760M DS3H DDR5", brand: "Gigabyte", price: 7990, stock: 22, specs: { socket: "LGA1700", ramType: "DDR5", formFactor: "mATX", wifi: false }, description: "Compact mATX board for Intel 12th to 14th Gen." },
    { c: "motherboards", name: "ASRock Z790 Pro RS", brand: "ASRock", price: 14990, stock: 9, specs: { socket: "LGA1700", ramType: "DDR5", formFactor: "ATX", wifi: false }, description: "Overclocking-ready Z790 board for unlocked Intel CPUs." },

    { c: "memory", name: "Kingston Fury Beast 16GB (2x8GB) DDR5-5600", brand: "Kingston", price: 3990, stock: 40, specs: { ramType: "DDR5", capacityGb: 16, speedMhz: 5600 }, description: "Dual-channel DDR5 kit for new builds." },
    { c: "memory", name: "Corsair Vengeance 32GB (2x16GB) DDR5-6000", brand: "Corsair", price: 7490, stock: 28, specs: { ramType: "DDR5", capacityGb: 32, speedMhz: 6000 }, description: "Fast 32GB kit tuned for AM5 and Intel platforms." },
    { c: "memory", name: "G.Skill Ripjaws V 16GB (2x8GB) DDR4-3200", brand: "G.Skill", price: 2490, stock: 35, specs: { ramType: "DDR4", capacityGb: 16, speedMhz: 3200 }, description: "Reliable DDR4 kit for AM4 and older Intel boards." },

    { c: "storage", name: "Samsung 980 NVMe SSD 1TB", brand: "Samsung", price: 4990, stock: 45, specs: { interface: "NVMe", capacityGb: 1000, readMbps: 3500 }, description: "Fast PCIe 3.0 NVMe SSD for boot and games." },
    { c: "storage", name: "WD Black SN850X 2TB", brand: "Western Digital", price: 10990, stock: 12, specs: { interface: "NVMe", capacityGb: 2000, readMbps: 7300 }, description: "High-end PCIe 4.0 NVMe SSD." },
    { c: "storage", name: "Crucial MX500 1TB SATA SSD", brand: "Crucial", price: 4490, stock: 30, specs: { interface: "SATA", capacityGb: 1000, readMbps: 560 }, description: "Dependable SATA SSD for extra storage." },
    { c: "storage", name: "Seagate Barracuda 2TB HDD", brand: "Seagate", price: 3290, stock: 26, specs: { interface: "SATA", capacityGb: 2000, readMbps: 220 }, description: "Large-capacity hard drive for media and backups." },

    { c: "power-supplies", name: "Corsair CX650 650W 80+ Bronze", brand: "Corsair", price: 3990, stock: 24, specs: { wattage: 650, efficiency: "80+ Bronze", modular: false }, description: "650W PSU suited to mid-range builds." },
    { c: "power-supplies", name: "Seasonic Focus GX-750 750W 80+ Gold", brand: "Seasonic", price: 8490, stock: 14, specs: { wattage: 750, efficiency: "80+ Gold", modular: true }, description: "Fully modular 750W Gold PSU with a long warranty." },
    { c: "power-supplies", name: "MSI MAG A850GL 850W 80+ Gold", brand: "MSI", price: 7990, stock: 11, specs: { wattage: 850, efficiency: "80+ Gold", modular: true }, description: "850W fully modular PSU with ATX 3.0 support." },
    { c: "power-supplies", name: "Cooler Master MWE 550W 80+ Bronze", brand: "Cooler Master", price: 2790, stock: 30, specs: { wattage: 550, efficiency: "80+ Bronze", modular: false }, description: "Entry-level PSU for budget builds." }
];

const users = [
    { name: "NEXUS Admin", email: "admin@nexuspc.test", password: "Admin1234", role: "admin" },
    { name: "Juan Dela Cruz", email: "juan@nexuspc.test", password: "Customer1234", role: "customer" },
    { name: "Maria Santos", email: "maria@nexuspc.test", password: "Customer1234", role: "customer" }
];

const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

const coupons = [
    { code: "WELCOME10", type: "percentage", value: 10, min_spend_cents: 500000, expires_at: inDays(365), usage_limit: 500, per_customer_limit: 1, is_active: true },
    { code: "SAVE500", type: "fixed", value: 50000, min_spend_cents: 1000000, expires_at: inDays(365), usage_limit: 100, per_customer_limit: 1, is_active: true },
    { code: "EXPIRED20", type: "percentage", value: 20, min_spend_cents: 0, expires_at: inDays(-30), usage_limit: null, per_customer_limit: 1, is_active: true }
];

function check(error, label) {
    if (error) {
        console.error(`Seed failed at "${label}":`, error.message);
        process.exit(1);
    }
}

async function run() {
    const { data: cats, error: catError } = await supabase
        .from("categories")
        .upsert(categories, { onConflict: "slug" })
        .select("id, slug");
    check(catError, "categories");
    const categoryId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

    const productRows = products.map(({ c, price, ...p }) => ({
        ...p,
        category_id: categoryId[c],
        price_cents: price * 100,
        is_active: true
    }));
    const { error: prodError } = await supabase.from("products").upsert(productRows, { onConflict: "name" });
    check(prodError, "products");

    const userRows = await Promise.all(
        users.map(async ({ password, ...u }) => ({ ...u, password_hash: await bcrypt.hash(password, 12) }))
    );
    const { error: userError } = await supabase.from("users").upsert(userRows, { onConflict: "email" });
    check(userError, "users");

    const { error: couponError } = await supabase.from("coupons").upsert(coupons, { onConflict: "code" });
    check(couponError, "coupons");

    console.log(`Seed complete: ${categories.length} categories, ${products.length} products, ${users.length} users, ${coupons.length} coupons.`);
    console.log("Admin:    admin@nexuspc.test / Admin1234");
    console.log("Customer: juan@nexuspc.test  / Customer1234");
}

run();