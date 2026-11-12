import { describe, it, expect } from "vitest";
import { checkBuild } from "../src/patterns/compatibility/compatibilityEngine.js";

const part = (id, slug, name, specs = {}, extra = {}) => ({
    id,
    name,
    priceCents: 100000,
    stock: 10,
    category: { slug, name: slug },
    specs,
    ...extra
});

const ryzen = part("cpu", "processors", "AMD Ryzen 5 7600", { socket: "AM5", tdp: 65, ramType: "DDR5" });
const ryzen7800 = part("cpu2", "processors", "AMD Ryzen 7 7800X3D", { socket: "AM5", tdp: 120, ramType: "DDR5" });
const b650 = part("board", "motherboards", "MSI B650", { socket: "AM5", ramType: "DDR5" });
const b550 = part("board2", "motherboards", "ASUS B550", { socket: "AM4", ramType: "DDR4" });
const ddr5 = part("ram", "memory", "Kingston DDR5", { ramType: "DDR5" });
const ddr4 = part("ram2", "memory", "G.Skill DDR4", { ramType: "DDR4" });
const nvme = part("ssd", "storage", "Samsung 980", { interface: "NVMe" });
const rtx4060 = part("gpu", "graphics-cards", "RTX 4060", { tdp: 115, recommendedPsuW: 550 });
const rx7800 = part("gpu2", "graphics-cards", "RX 7800 XT", { tdp: 263, recommendedPsuW: 700 });
const psu650 = part("psu", "power-supplies", "Corsair CX650", { wattage: 650 });
const psu750 = part("psu2", "power-supplies", "Seasonic 750", { wattage: 750 });

const codes = (report) => report.issues.map((i) => i.code);

describe("compatibility engine", () => {
    it("accepts a fully compatible build and reports the power numbers", () => {
        const report = checkBuild([ryzen, b650, ddr5, nvme, rtx4060, psu650]);
        expect(report.compatible).toBe(true);
        expect(report.complete).toBe(true);
        expect(report.issues).toEqual([]);
        expect(report.summary.estimatedWatts).toBe(255); // 65 + 115 + 75
        expect(report.summary.recommendedPsuW).toBe(550); // the graphics card maker's advice wins over 400
        expect(report.summary.totalPriceCents).toBe(600000);
    });

    it("rejects a processor and motherboard with different sockets", () => {
        const report = checkBuild([ryzen, b550]);
        expect(report.compatible).toBe(false);
        expect(codes(report)).toContain("SOCKET_MISMATCH");
    });

    it("rejects memory of the wrong type for the motherboard", () => {
        const report = checkBuild([b650, ddr4]);
        expect(report.compatible).toBe(false);
        expect(codes(report)).toContain("RAM_TYPE_MISMATCH");
    });

    it("rejects a power supply that is too weak, and accepts a stronger one", () => {
        const weak = checkBuild([ryzen7800, rx7800, psu650]);
        expect(weak.compatible).toBe(false);
        expect(codes(weak)).toContain("PSU_TOO_WEAK");
        expect(weak.summary.recommendedPsuW).toBe(700);

        const strong = checkBuild([ryzen7800, rx7800, psu750]);
        expect(codes(strong)).not.toContain("PSU_TOO_WEAK");
    });

    it("rejects too many parts of one kind", () => {
        const report = checkBuild([ryzen, ryzen7800]);
        expect(report.compatible).toBe(false);
        expect(codes(report)).toContain("TOO_MANY_PARTS");
    });

    it("treats missing parts as warnings, not errors", () => {
        const report = checkBuild([ryzen]);
        expect(report.compatible).toBe(true);
        expect(report.complete).toBe(false);
        expect(codes(report)).toContain("MISSING_PART");
    });

    it("warns instead of crashing when a part has no specs", () => {
        const mystery = part("x", "motherboards", "Unknown board", {});
        const report = checkBuild([ryzen, mystery]);
        expect(report.compatible).toBe(true);
        expect(codes(report)).toContain("SPEC_MISSING");
    });

    it("lists errors before warnings", () => {
        const report = checkBuild([ryzen, b550]);
        expect(report.issues[0].severity).toBe("error");
    });
});