
import {
    Cpu,
    CircuitBoard,
    MemoryStick,
    HardDrive,
    Zap,
    Monitor,
    Package,
    Mouse,
    Speaker
} from "lucide-react";

// Default product images based on category.
// These must be plain image URLs, not Markdown links.
export const DEFAULT_CATEGORY_IMAGES = {
    processors:
        "https://images.unsplash.com/photo-1591799264318-7e6c9e3e4b1f?auto=format&fit=crop&w=1000&q=85",

    "graphics-cards":
        "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1000&q=85",

    motherboards:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",

    memory:
        "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1000&q=85",

    storage:
        "https://images.unsplash.com/photo-1597872200969-2b65d35bdc39?auto=format&fit=crop&w=1000&q=85",

    "power-supplies":
        "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1000&q=85",

    peripherals:
        "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1000&q=85",

    displays:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=85",

    accessories:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=85"
};

// Get the product image.
// Use the product's own image first.
// If unavailable, use its category image.
export const getProductImage = (product) => {
    return (
        product?.imageUrl ||
        DEFAULT_CATEGORY_IMAGES[product?.category?.slug] ||
        null
    );
};

// Format prices in Philippine pesos.
// The API sends prices in centavos.
const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
});

export const formatPrice = (cents) => peso.format(cents / 100);

// Category icons.
export const categoryIcon = (slug) => {
    return (
        {
            processors: Cpu,
            "graphics-cards": Monitor,
            motherboards: CircuitBoard,
            memory: MemoryStick,
            storage: HardDrive,
            "power-supplies": Zap,
            peripherals: Mouse,
            displays: Monitor,
            accessories: Speaker
        }[slug] ?? Package
    );
};

// Display product specifications as short chips.
const SPEC_FORMAT = {
    cores: (v) => `${v} cores`,
    tdp: (v) => `${v}W TDP`,
    vramGb: (v) => `${v}GB VRAM`,
    capacityGb: (v) =>
        v >= 1000 ? `${v / 1000}TB` : `${v}GB`,
    speedMhz: (v) => `${v}MHz`,
    wattage: (v) => `${v}W`,
    lengthMm: (v) => `${v}mm`,
    dpi: (v) => `${Number(v).toLocaleString("en-PH")} DPI`,
    refreshRateHz: (v) => `${v}Hz`,
    panelSizeInches: (v) => `${v}"`
};

const SPEC_SKIP = [
    "threads",
    "readMbps",
    "recommendedPsuW",
    "wifi",
    "modular",
    "microphone"
];

export function specChips(specs = {}, max = 3) {
    return Object.entries(specs)
        .filter(
            ([key, value]) =>
                !SPEC_SKIP.includes(key) &&
                typeof value !== "boolean"
        )
        .map(([key, value]) =>
            SPEC_FORMAT[key]
                ? SPEC_FORMAT[key](value)
                : String(value)
        )
        .slice(0, max);
}

// Product specification labels.
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
    modular: "Modular",
    connection: "Connection",
    dpi: "DPI",
    buttons: "Buttons",
    layout: "Layout",
    switchType: "Switch type",
    lighting: "Lighting",
    microphone: "Microphone",
    resolution: "Resolution",
    refreshRateHz: "Refresh rate (Hz)",
    panelSizeInches: "Panel size (inches)",
    panelType: "Panel type",
    size: "Size",
    material: "Material",
    type: "Product type",
    power: "Power",
    version: "Version",
    length: "Cable length"
};

// Product stock status.
export const stockStatus = (stock) => {
    if (stock <= 0) {
        return {
            label: "Out of stock",
            tone: "out"
        };
    }

    if (stock <= 5) {
        return {
            label: `Only ${stock} left`,
            tone: "low"
        };
    }

    return {
        label: "In stock",
        tone: "in"
    };
};

// Order statuses.
export const ORDER_STATUS = {
    pending_payment: {
        label: "Awaiting payment",
        tone: "warn"
    },
    paid: {
        label: "Paid",
        tone: "ok"
    },
    processing: {
        label: "Processing",
        tone: "info"
    },
    shipped: {
        label: "Shipped",
        tone: "info"
    },
    delivered: {
        label: "Delivered",
        tone: "ok"
    },
    cancelled: {
        label: "Cancelled",
        tone: "bad"
    },
    expired: {
        label: "Expired",
        tone: "bad"
    }
};

// Format date and time.
export const formatDateTime = (iso) =>
    new Date(iso).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short"
    });
