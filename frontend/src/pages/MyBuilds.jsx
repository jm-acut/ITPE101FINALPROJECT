import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Share2, ShoppingCart, Trash2, Wrench } from "lucide-react";
import { buildApi } from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../utils.js";

function statusOf(build) {
    if (!build.compatible) return { label: "Has problems", tone: "bad" };
    if (!build.complete) return { label: "Incomplete", tone: "warn" };
    return { label: "Compatible", tone: "ok" };
}

export default function MyBuilds() {
    const { refresh } = useCart();
    const [builds, setBuilds] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState(null); // { type, text, items? }
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(() => {
        return buildApi
            .list()
            .then((res) => setBuilds(res.data))
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const run = async (id, action) => {
        setBusyId(id);
        setNotice(null);
        try {
            await action();
        } catch (err) {
            setNotice({ type: "error", text: err.message, items: Array.isArray(err.details) ? err.details.map((d) => d.message) : [] });
        } finally {
            setBusyId(null);
        }
    };

    const addToCart = (build) =>
        run(build.id, async () => {
            const res = await buildApi.addToCart(build.id);
            await refresh().catch(() => {});
            setNotice({ type: "success", text: `Added ${res.data.addedUnits} parts from "${build.name}" to your cart.`, cart: true });
        });

    const share = (build) =>
        run(build.id, async () => {
            const res = await buildApi.share(build.id);
            const link = `${window.location.origin}/shared/${res.data.shareCode}`;
            await navigator.clipboard?.writeText(link).catch(() => {});
            setNotice({ type: "success", text: `Share link copied: ${link}` });
            await load();
        });

    const unshare = (build) =>
        run(build.id, async () => {
            await buildApi.unshare(build.id);
            setNotice({ type: "success", text: "Sharing turned off." });
            await load();
        });

    const remove = (build) => {
        if (!window.confirm(`Delete "${build.name}"?`)) return;
        run(build.id, async () => {
            await buildApi.remove(build.id);
            await load();
        });
    };

    if (error) return <div className="container page"><div className="notice notice-error">{error}</div></div>;
    if (!builds) return <div className="page-state">Loading your builds...</div>;

    return (
        <div className="container page">
            <header className="page-head order-head">
                <div>
                    <h1>My builds</h1>
                    <p>{builds.length} saved {builds.length === 1 ? "build" : "builds"}</p>
                </div>
                <Link to="/builder" className="btn btn-primary">New build</Link>
            </header>

            {notice && (
                <div className={`banner ${notice.type === "success" ? "banner-ok" : "banner-bad"}`} role="status">
                    <div>
                        <strong>{notice.text}</strong>
                        {notice.cart && <> <Link to="/cart" className="link">View cart</Link></>}
                        {notice.items?.length > 0 && (
                            <ul className="issue-list">{notice.items.map((text, i) => <li key={i}>{text}</li>)}</ul>
                        )}
                    </div>
                </div>
            )}

            {builds.length === 0 ? (
                <div className="empty">
                    <Wrench size={40} strokeWidth={1.5} />
                    <h2>No saved builds yet</h2>
                    <p>Pick compatible parts in the builder and save them here.</p>
                    <Link to="/builder" className="btn btn-primary">Start a build</Link>
                </div>
            ) : (
                <ul className="build-list">
                    {builds.map((build) => {
                        const status = statusOf(build);
                        const busy = busyId === build.id;
                        const problems = build.issues.filter((i) => i.severity === "error");
                        return (
                            <li key={build.id} className="build-card">
                                <div className="build-top">
                                    <div>
                                        <h2>{build.name}</h2>
                                        <small className="hint">{build.summary.partCount} parts</small>
                                    </div>
                                    <span className={`status status-${status.tone}`}>{status.label}</span>
                                    <strong className="price">{formatPrice(build.summary.totalPriceCents)}</strong>
                                </div>

                                <ul className="chip-row">
                                    {build.parts.map((p, i) => <li key={`${p.id}-${i}`} className="chip">{p.name}</li>)}
                                </ul>

                                {problems.length > 0 && (
                                    <ul className="issue-list">
                                        {problems.map((issue, i) => <li key={i} className="issue issue-error">{issue.message}</li>)}
                                    </ul>
                                )}

                                <div className="build-actions">
                                    <button className="btn btn-primary" onClick={() => addToCart(build)} disabled={busy}>
                                        <ShoppingCart size={16} /> Add all to cart
                                    </button>
                                    <Link to={`/builder?build=${build.id}`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>
                                    <button className="btn btn-ghost" onClick={() => share(build)} disabled={busy}>
                                        <Share2 size={16} /> {build.shareCode ? "Copy link" : "Share"}
                                    </button>
                                    {build.shareCode && <button className="btn btn-ghost" onClick={() => unshare(build)} disabled={busy}>Stop sharing</button>}
                                    <button className="icon-btn" onClick={() => remove(build)} disabled={busy} aria-label={`Delete ${build.name}`}><Trash2 size={18} /></button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}