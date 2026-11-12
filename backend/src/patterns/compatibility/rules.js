// Strategy pattern: every compatibility rule is a small object with the same shape.
//   { code, check(context) -> [issue, ...] }
// The engine runs all of them. To add a rule, add one object to the `rules` array.

export const CATEGORY = Object.freeze({
    CPU: "processors",
    BOARD: "motherboards",
    RAM: "memory",
    GPU: "graphics-cards",
    STORAGE: "storage",
    PSU: "power-supplies"
});

export const MAX_PER_CATEGORY = Object.freeze({
    [CATEGORY.CPU]: 1,
    [CATEGORY.BOARD]: 1,
    [CATEGORY.GPU]: 1,
    [CATEGORY.PSU]: 1,
    [CATEGORY.RAM]: 2,
    [CATEGORY.STORAGE]: 4
});

const LABEL = {
    [CATEGORY.CPU]: "processor",
    [CATEGORY.BOARD]: "motherboard",
    [CATEGORY.RAM]: "memory kit",
    [CATEGORY.GPU]: "graphics card",
    [CATEGORY.STORAGE]: "storage drive",
    [CATEGORY.PSU]: "power supply"
};

// A build is "complete" when it has all of these. (A graphics card is optional: some CPUs have built-in graphics.)
const ESSENTIAL = [CATEGORY.CPU, CATEGORY.BOARD, CATEGORY.RAM, CATEGORY.STORAGE, CATEGORY.PSU];

// Power rule: estimated draw = CPU TDP + GPU TDP + 75 W for board, memory, storage and fans.
// The recommended PSU adds 40% headroom, rounded up to the next 50 W, and is never below the graphics card maker's advice.
export const POWER = Object.freeze({ baseSystemWatts: 75, headroom: 1.4, roundTo: 50 });

export function estimatePower(cpu, gpu) {
    if (!cpu && !gpu) return { estimatedWatts: null, recommendedPsuW: null };

    const estimatedWatts = (Number(cpu?.specs?.tdp) || 0) + (Number(gpu?.specs?.tdp) || 0) + POWER.baseSystemWatts;
    const withHeadroom = Math.ceil((estimatedWatts * POWER.headroom) / POWER.roundTo) * POWER.roundTo;
    const recommendedPsuW = Math.max(withHeadroom, Number(gpu?.specs?.recommendedPsuW) || 0);
    return { estimatedWatts, recommendedPsuW };
}

const issue = (code, severity, message, partIds = []) => ({ code, severity, message, partIds });
const specOf = (part, key) => part?.specs?.[key];
const isSet = (value) => value !== undefined && value !== null && value !== "";

export const rules = [
    {
        code: "CATEGORY_LIMITS",
        check: ({ parts }) =>
            Object.entries(MAX_PER_CATEGORY).flatMap(([slug, max]) => {
                const inCategory = parts.filter((p) => p.category?.slug === slug);
                if (inCategory.length <= max) return [];
                return [
                    issue(
                        "TOO_MANY_PARTS",
                        "error",
                        `A build can have at most ${max} ${LABEL[slug]}${max > 1 ? "s" : ""}, but it has ${inCategory.length}.`,
                        inCategory.map((p) => p.id)
                    )
                ];
            })
    },
    {
        code: "SOCKET",
        check: ({ cpu, board }) => {
            if (!cpu || !board) return [];
            const cpuSocket = specOf(cpu, "socket");
            const boardSocket = specOf(board, "socket");
            if (!isSet(cpuSocket) || !isSet(boardSocket)) {
                return [issue("SPEC_MISSING", "warning", "Socket information is missing, so the processor and motherboard could not be compared.", [cpu.id, board.id])];
            }
            return cpuSocket === boardSocket
                ? []
                : [issue("SOCKET_MISMATCH", "error", `${cpu.name} uses socket ${cpuSocket}, but ${board.name} uses socket ${boardSocket}.`, [cpu.id, board.id])];
        }
    },
    {
        code: "MEMORY_TYPE",
        check: ({ cpu, board, rams }) => {
            const reference = board ?? cpu; // the motherboard decides; without one, fall back to the processor
            if (!reference || rams.length === 0) return [];

            const expected = specOf(reference, "ramType");
            if (!isSet(expected)) {
                return [issue("SPEC_MISSING", "warning", `Memory type information is missing for ${reference.name}.`, [reference.id])];
            }
            return rams.flatMap((ram) => {
                const actual = specOf(ram, "ramType");
                if (!isSet(actual)) return [issue("SPEC_MISSING", "warning", `Memory type information is missing for ${ram.name}.`, [ram.id])];
                return actual === expected
                    ? []
                    : [issue("RAM_TYPE_MISMATCH", "error", `${ram.name} is ${actual}, but ${reference.name} supports ${expected}.`, [ram.id, reference.id])];
            });
        }
    },
    {
        code: "POWER",
        check: ({ psu, power }) => {
            if (!psu || power.recommendedPsuW === null) return [];
            const watts = Number(specOf(psu, "wattage"));
            if (!Number.isFinite(watts)) {
                return [issue("SPEC_MISSING", "warning", `Wattage information is missing for ${psu.name}.`, [psu.id])];
            }
            return watts >= power.recommendedPsuW
                ? []
                : [
                      issue(
                          "PSU_TOO_WEAK",
                          "error",
                          `${psu.name} provides ${watts}W, but this build needs at least ${power.recommendedPsuW}W (estimated draw ${power.estimatedWatts}W plus headroom).`,
                          [psu.id]
                      )
                  ];
        }
    },
    {
        code: "AVAILABILITY",
        check: ({ parts }) =>
            parts.filter((p) => p.stock <= 0).map((p) => issue("OUT_OF_STOCK", "warning", `${p.name} is out of stock.`, [p.id]))
    },
    {
        code: "COMPLETENESS",
        check: ({ parts, power }) =>
            ESSENTIAL.filter((slug) => !parts.some((p) => p.category?.slug === slug)).map((slug) => {
                const hint = slug === CATEGORY.PSU && power.recommendedPsuW ? ` Choose at least ${power.recommendedPsuW}W.` : "";
                return issue("MISSING_PART", "warning", `No ${LABEL[slug]} selected yet.${hint}`);
            })
    }
];