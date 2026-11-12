import { CATEGORY, estimatePower, rules } from "./rules.js";

const first = (parts, slug) => parts.find((p) => p.category?.slug === slug) ?? null;

// parts: product objects ({ id, name, priceCents, stock, category: { slug }, specs }). Pure function, no database.
export function checkBuild(parts) {
    const cpu = first(parts, CATEGORY.CPU);
    const gpu = first(parts, CATEGORY.GPU);
    const psu = first(parts, CATEGORY.PSU);

    const context = {
        parts,
        cpu,
        gpu,
        psu,
        board: first(parts, CATEGORY.BOARD),
        rams: parts.filter((p) => p.category?.slug === CATEGORY.RAM),
        power: estimatePower(cpu, gpu)
    };

    // Errors first, then warnings
    const issues = rules
        .flatMap((rule) => rule.check(context))
        .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));

    return {
        compatible: !issues.some((i) => i.severity === "error"),
        complete: !issues.some((i) => i.code === "MISSING_PART"),
        issues,
        summary: {
            partCount: parts.length,
            totalPriceCents: parts.reduce((sum, p) => sum + p.priceCents, 0),
            estimatedWatts: context.power.estimatedWatts,
            recommendedPsuW: context.power.recommendedPsuW,
            psuWattage: psu && Number.isFinite(Number(psu.specs?.wattage)) ? Number(psu.specs.wattage) : null
        }
    };
}