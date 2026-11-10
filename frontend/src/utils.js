import { Cpu, CircuitBoard, MemoryStick, HardDrive, Zap, Monitor, Package } from "lucide-react";

// The API sends money as integer centavos. Convert only when displaying.
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
export const formatPrice = (cents) => peso.format(cents / 100);

export const categoryIcon = (slug) =>
    ({
        processors: Cpu,
        "graphics-cards": Monitor,
        motherboards: CircuitBoard,
        memory: MemoryStick,
        storage: HardDrive,
        "power-supplies": Zap
    })[slug] ?? Package;

// Turns the first few specs into short chips, e.g. "AM5", "6 cores", "65W TDP".
const SPEC_FORMAT = {
    cores: (v) => `${v} cores`,
    tdp: (v) => `${v}W TDP`,
    vramGb: (v) => `${v}GB VRAM`,
    capacityGb: (v) => (v >= 1000 ? `${v / 1000}TB` : `${v}GB`),
    speedMhz: (v) => `${v}MHz`,
    wattage: (v) => `${v}W`,
    lengthMm: (v) => `${v}mm`
};
const SPEC_SKIP = ["threads", "readMbps", "recommendedPsuW", "wifi", "modular"];

export function specChips(specs = {}, max = 3) {
    return Object.entries(specs)
        .filter(([key, value]) => !SPEC_SKIP.includes(key) && typeof value !== "boolean")
        .map(([key, value]) => (SPEC_FORMAT[key] ? SPEC_FORMAT[key](value) : String(value)))
        .slice(0, max);
}

export const SPEC_LABELS = {
    socket: "Socket",
    cores: "Cores",
    threads: "Threads",
    tdp: "TDP (W)",
    ramType: "Memory type",
    vramGb: "VRAM (GB)",
    lengthMm: "Length (mm)",
    recommendedPsuW: "Recommended PSU (W)",
    formFactor: "Form factor",
    wifi: "WiFi",
    capacityGb: "Capacity (GB)",
    speedMhz: "Speed (MHz)",
    interface: "Interface",
    readMbps: "Read speed (MB/s)",
    wattage: "Wattage (W)",
    efficiency: "Efficiency",
    modular: "Modular"
};

export const stockStatus = (stock) => {
    if (stock <= 0) return { label: "Out of stock", tone: "out" };
    if (stock <= 5) return { label: `Only ${stock} left`, tone: "low" };
    return { label: "In stock", tone: "in" };
};