import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { assistantApi } from "../api/client.js";
import CompatibilityReport from "../components/CompatibilityReport.jsx";
import { formatPrice, stockStatus } from "../utils.js";

const EXAMPLES = [
    "A quiet PC for school work and light gaming",
    "A gaming PC for smooth 1440p games",
    "A budget build for programming and video calls"
];

export default function Assistant() {
    const [prompt, setPrompt] = useState("");
    const [budget, setBudget] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        setResult(null);
        try {
            const body = { prompt };
            if (budget) body.budgetPesos = Number(budget);
            const res = await assistantApi.recommend(body);
            setResult(res.data);
        } catch (err) {
            setError(err);
        } finally {
            setBusy(false);
        }
    };

    const unavailable = error?.code === "AI_UNAVAILABLE";

    return (
        <div className="container page">
            <header className="page-head">
                <h1>AI build advisor</h1>
                <p>Tell us what you need and your budget. We suggest parts from our catalog and check them with our compatibility rules.</p>
            </header>

            <div className="cart-layout">
                <div>
                    <form className="checkout-form" onSubmit={submit} noValidate>
                        <label className="field">
                            <span>What do you need?</span>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                maxLength={500}
                                placeholder="For example: a PC for gaming and streaming, quiet, easy to upgrade later"
                            />
                            <small className="field-hint">{prompt.length} / 500</small>
                        </label>

                        <div className="example-row">
                            {EXAMPLES.map((text) => (
                                <button type="button" key={text} className="pill" onClick={() => setPrompt(text)}>{text}</button>
                            ))}
                        </div>

                        <label className="field">
                            <span>Budget in pesos (optional)</span>
                            <input type="number" min="15000" step="1000" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="60000" />
                        </label>

                        <button className="btn btn-primary btn-lg" disabled={busy || prompt.trim().length < 5}>
                            <Bot size={18} /> {busy ? "Thinking..." : "Suggest a build"}
                        </button>
                    </form>

                    {error && (
                        <div className="notice notice-error" role="alert" style={{ marginTop: 16 }}>
                            <div>
                                <p>{error.status === 422 && error.details?.[0]?.message ? error.details[0].message : error.message}</p>
                                {unavailable && (
                                    <p className="hint">
                                        The store still works: <Link to="/products" className="link">browse the shop</Link> or{" "}
                                        <Link to="/builder" className="link">build a PC yourself</Link>.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="summary">
                    <h2>Suggestion</h2>

                    {!result && !busy && <p className="hint">Your suggestion will appear here.</p>}
                    {busy && <p className="hint">Looking through the catalog. This can take up to 20 seconds.</p>}

                    {result?.status === "no_match" && (
                        <>
                            <div className="banner banner-warn">{result.message}</div>
                            {result.problems?.length > 0 && (
                                <ul className="issue-list">
                                    {result.problems.map((p, i) => <li key={i} className="issue issue-warning">{p}</li>)}
                                </ul>
                            )}
                            <Link to="/builder" className="btn btn-ghost btn-block">Open the build creator</Link>
                        </>
                    )}

                    {result?.status === "ok" && (
                        <>
                            <span className="ai-badge"><Bot size={14} /> AI-assisted suggestion</span>
                            {/* Model text is shown as plain text only */}
                            <p>{result.summary}</p>

                            <ul className="cart-list">
                                {result.parts.map((part, i) => {
                                    const status = stockStatus(part.stock);
                                    return (
                                        <li key={`${part.id}-${i}`} className="suggested-part">
                                            <div>
                                                <Link to={`/products/${part.id}`} className="cart-name">{part.name}</Link>
                                                <span className="cart-unit">{part.category?.name}</span>
                                                {part.reason && <span className="reason">{part.reason}</span>}
                                            </div>
                                            <div className="suggested-price">
                                                <strong className="price">{formatPrice(part.priceCents)}</strong>
                                                <span className={`stock stock-${status.tone}`}>{status.label}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <CompatibilityReport report={result.report} />

                            <Link to={`/builder?parts=${result.parts.map((p) => p.id).join(",")}`} className="btn btn-primary btn-lg btn-block">
                                Open in the build creator
                            </Link>
                            <p className="hint">
                                Names, prices and stock come from our catalog. Compatibility is checked by our own rules. AI can make mistakes, so review the parts before you buy.
                            </p>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}