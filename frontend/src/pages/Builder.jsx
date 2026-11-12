import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Trash2, Search } from "lucide-react";
import { buildApi, catalogApi, isAbort } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "../components/Modal.jsx";
import CompatibilityReport from "../components/CompatibilityReport.jsx";
import { categoryIcon, formatPrice, specChips, stockStatus } from "../utils.js";

const SLOTS = [
    { slug: "processors", label: "Processor", max: 1 },
    { slug: "motherboards", label: "Motherboard", max: 1 },
    { slug: "memory", label: "Memory", max: 2 },
    { slug: "graphics-cards", label: "Graphics card", max: 1 },
    { slug: "storage", label: "Storage", max: 4 },
    { slug: "power-supplies", label: "Power supply", max: 1 }
];

function PartPicker({ slot, onPick, onClose }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        catalogApi
            .products({ category: slot.slug, limit: 50, sort: "price_asc" }, controller.signal)
            .then((res) => setItems(res.data))
            .catch((err) => {
                if (!isAbort(err)) setError(err.message);
            });
        return () => controller.abort();
    }, [slot.slug]);

    const visible = (items ?? []).filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(search.toLowerCase()));

    return (
        <Modal title={`Choose ${slot.label.toLowerCase()}`} onClose={onClose} wide>
            <label className="search-field">
                <Search size={18} aria-hidden="true" />
                <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search parts" />
            </label>

            {error && <div className="notice notice-error">{error}</div>}
            {!items && !error && <p className="hint">Loading parts...</p>}

            <ul className="picker-list">
                {visible.map((p) => {
                    const status = stockStatus(p.stock);
                    return (
                        <li key={p.id}>
                            <button className="picker-row" onClick={() => onPick(p)} disabled={p.stock <= 0}>
                                <span>
                                    <strong>{p.name}</strong>
                                    <span className="chip-row">
                                        {specChips(p.specs, 4).map((chip) => <span key={chip} className="chip">{chip}</span>)}
                                    </span>
                                </span>
                                <span className="picker-meta">
                                    <strong className="price">{formatPrice(p.priceCents)}</strong>
                                    <span className={`stock stock-${status.tone}`}>{status.label}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
                {items && visible.length === 0 && <li className="hint">No parts match.</li>}
            </ul>
        </Modal>
    );
}

export default function Builder() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const buildId = params.get("build"); // editing a saved build
    const startParts = params.get("parts"); // starting from a shared build

    const [parts, setParts] = useState([]);
    const [name, setName] = useState("My build");
    const [report, setReport] = useState(null);
    const [checking, setChecking] = useState(false);
    const [picker, setPicker] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(Boolean(buildId || startParts));

    const closePicker = useCallback(() => setPicker(null), []);

    // Load a saved build, or the parts of a shared one
    useEffect(() => {
        if (!buildId && !startParts) return undefined;
        let active = true;

        (async () => {
            try {
                if (buildId) {
                    const res = await buildApi.get(buildId);
                    if (!active) return;
                    setParts(res.data.parts);
                    setName(res.data.name);
                } else {
                    const ids = startParts.split(",").filter(Boolean).slice(0, 12);
                    const loaded = await Promise.all(ids.map((id) => catalogApi.product(id).then((r) => r.data).catch(() => null)));
                    if (active) setParts(loaded.filter(Boolean));
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [buildId, startParts]);

    // The server runs the rules. The page only shows the answer.
    const partIds = useMemo(() => parts.map((p) => p.id), [parts]);
    useEffect(() => {
        if (partIds.length === 0) {
            setReport(null);
            return undefined;
        }
        const controller = new AbortController();
        setChecking(true);

        const timer = setTimeout(() => {
            buildApi
                .check(partIds, controller.signal)
                .then((res) => setReport(res.data))
                .catch((err) => {
                    if (!isAbort(err)) setError(err.message);
                })
                .finally(() => setChecking(false));
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [partIds]);

    const pick = (slot, part) => {
        setParts((current) => {
            const others = current.filter((p) => p.category?.slug !== slot.slug);
            const same = current.filter((p) => p.category?.slug === slot.slug);
            const next = slot.max === 1 ? [part] : [...same, part].slice(-slot.max); // single slots replace
            return [...others, ...next];
        });
        setPicker(null);
    };

    const removeAt = (index) => setParts((current) => current.filter((_, i) => i !== index));

    const save = async () => {
        if (!user) {
            navigate("/login", { state: { from: `/builder?parts=${partIds.join(",")}` } });
            return;
        }
        setSaving(true);
        setError("");
        try {
            if (buildId) await buildApi.update(buildId, { name, partIds });
            else await buildApi.create({ name, partIds });
            navigate("/builds");
        } catch (err) {
            setError(err.details?.[0]?.message ?? err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-state">Loading build...</div>;

    return (
        <div className="container page">
            <header className="page-head">
                <h1>{buildId ? "Edit your build" : "Build your PC"}</h1>
                <p>Pick parts and the server checks that they work together, live.</p>
            </header>

            {error && <div className="notice notice-error" role="alert">{error}</div>}

            <div className="cart-layout">
                <div className="slot-list">
                    {SLOTS.map((slot) => {
                        const Icon = categoryIcon(slot.slug);
                        const inSlot = parts.map((part, index) => ({ part, index })).filter(({ part }) => part.category?.slug === slot.slug);
                        const canAdd = slot.max === 1 || inSlot.length < slot.max;

                        return (
                            <section key={slot.slug} className="slot">
                                <header className="slot-head">
                                    <span className="category-icon"><Icon size={20} /></span>
                                    <h2>{slot.label}</h2>
                                    {slot.max > 1 && <small>up to {slot.max}</small>}
                                </header>

                                {inSlot.map(({ part, index }) => (
                                    <div key={`${part.id}-${index}`} className="slot-part">
                                        <span>
                                            <strong>{part.name}</strong>
                                            <span className="chip-row">
                                                {specChips(part.specs, 3).map((chip) => <span key={chip} className="chip">{chip}</span>)}
                                            </span>
                                        </span>
                                        <strong className="price">{formatPrice(part.priceCents)}</strong>
                                        <button className="icon-btn" onClick={() => removeAt(index)} aria-label={`Remove ${part.name}`}><Trash2 size={18} /></button>
                                    </div>
                                ))}

                                {canAdd && (
                                    <button className="btn btn-ghost" onClick={() => setPicker(slot)}>
                                        <Plus size={16} /> {slot.max === 1 && inSlot.length === 1 ? "Change" : "Add"} {slot.label.toLowerCase()}
                                    </button>
                                )}
                            </section>
                        );
                    })}
                </div>

                <aside className="summary">
                    <h2>Compatibility</h2>
                    <CompatibilityReport report={report} loading={checking} />

                    <label className="field">
                        <span>Build name</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                    </label>
                    <button className="btn btn-primary btn-lg btn-block" onClick={save} disabled={saving || parts.length === 0 || name.trim().length < 2}>
                        {saving ? "Saving..." : user ? (buildId ? "Save changes" : "Save build") : "Sign in to save"}
                    </button>
                </aside>
            </div>

            {picker && <PartPicker slot={picker} onPick={(part) => pick(picker, part)} onClose={closePicker} />}
        </div>
    );
}