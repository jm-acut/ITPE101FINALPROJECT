
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ShoppingCart, Sparkles, ArrowRight } from "lucide-react";
import { assistantApi } from "../api/client.js";
import CompatibilityReport from "../components/CompatibilityReport.jsx";
import { formatPrice, stockStatus } from "../utils.js";

const EXAMPLES = [
    "Recommend a gaming PC for ₱50,000",
    "I need a PC for programming",
    "How do I checkout?",
    "How do I apply a coupon?",
    "How do I pay for my order?",
    "How does shipping work?"
];

export default function Assistant() {
    const [prompt, setPrompt] = useState("");
    const [budget, setBudget] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const budgetNumber = Number(budget);

    const budgetValid =
        !budget ||
        (
            Number.isInteger(budgetNumber) &&
            budgetNumber >= 15000 &&
            budgetNumber <= 1000000
        );

    const submit = async (event) => {
        event.preventDefault();

        if (prompt.trim().length < 5 || prompt.length > 500) {
            return;
        }

        if (!budgetValid) {
            setError({
                message: "Enter a valid budget between ₱15,000 and ₱1,000,000."
            });
            return;
        }

        setBusy(true);
        setError(null);
        setResult(null);

        try {
            const body = {
                prompt: prompt.trim()
            };

            if (budget) {
                body.budgetPesos = budgetNumber;
            }

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
                <span className="ai-badge">
                    <Sparkles size={14} /> NEXUS SMART ASSISTANT
                </span>

                <h1>AI PC Build Advisor</h1>

                <p>
                    Ask about PC recommendations, shopping,
                    checkout, payment, coupons and delivery.
                    Our assistant is here to help.
                </p>
            </header>

            <div className="cart-layout">

                {/* CUSTOMER QUESTION */}
                <div>
                    <form
                        className="checkout-form"
                        onSubmit={submit}
                        noValidate
                    >
                        <h2>
                            <Bot size={20} /> How can I help you?
                        </h2>

                        <label className="field">
                            <span>Enter your question</span>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                maxLength={500}
                                placeholder="Example: How do I checkout my PC build?"
                                required
                            />

                            <small className="field-hint">
                                {prompt.length}/500 characters
                            </small>
                        </label>

                        <div className="field">
                            <span>Try asking</span>

                            <div className="example-row">
                                {EXAMPLES.map((example) => (
                                    <button
                                        type="button"
                                        key={example}
                                        className="pill"
                                        onClick={() => {
                                            setPrompt(example);
                                            setResult(null);
                                            setError(null);
                                        }}
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="field">
                            <span>PC build budget (optional)</span>

                            <input
                                type="number"
                                min="15000"
                                max="1000000"
                                step="1000"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="Example: 50000"
                            />

                            <small className="field-hint">
                                Only needed when requesting a PC build.
                            </small>
                        </label>

                        {!budgetValid && (
                            <small className="field-error">
                                Enter a valid budget between ₱15,000
                                and ₱1,000,000.
                            </small>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={
                                busy ||
                                prompt.trim().length < 5 ||
                                !budgetValid
                            }
                        >
                            <Bot size={18} />
                            {busy ? "Thinking..." : "Ask AI Advisor"}
                        </button>
                    </form>

                    {error && (
                        <div
                            className="notice notice-error"
                            role="alert"
                            style={{ marginTop: 16 }}
                        >
                            <p>
                                {error.status === 422 &&
                                error.details?.[0]?.message
                                    ? error.details[0].message
                                    : error.message}
                            </p>

                            {unavailable && (
                                <p className="hint">
                                    You can still{" "}
                                    <Link to="/products" className="link">
                                        browse products
                                    </Link>{" "}
                                    or{" "}
                                    <Link to="/builder" className="link">
                                        build a PC manually
                                    </Link>.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* AI RESPONSE */}
                <aside className="summary">

                    <h2>
                        <Bot size={20} /> AI Advisor Response
                    </h2>

                    {!result && !busy && (
                        <p className="hint">
                            Ask a question and your AI Advisor
                            response will appear here.
                        </p>
                    )}

                    {busy && (
                        <p className="hint">
                            Analyzing your question...
                        </p>
                    )}

                    {/* SHOPPING HELP RESPONSE */}
                    {result?.status === "help" && (
                        <div>
                            <span className="ai-badge">
                                <ShoppingCart size={14} />
                                Shopping Assistant
                            </span>

                            <h3>{result.title}</h3>

                            <p>{result.answer}</p>

                            <ol className="issue-list">
                                {result.steps.map((step, index) => (
                                    <li
                                        key={index}
                                        className="issue"
                                    >
                                        {step}
                                    </li>
                                ))}
                            </ol>

                            <div className="field">
                                <strong>Quick links</strong>

                                <div className="example-row">
                                    {result.links.map((link) => (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className="btn btn-primary"
                                        >
                                            {link.label}
                                            <ArrowRight size={15} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NO BUILD AVAILABLE */}
                    {result?.status === "no_match" && (
                        <>
                            <div className="banner banner-warn">
                                {result.message}
                            </div>

                            {result.problems?.length > 0 && (
                                <ul className="issue-list">
                                    {result.problems.map((problem, index) => (
                                        <li
                                            key={index}
                                            className="issue issue-warning"
                                        >
                                            {problem}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <Link
                                to="/builder"
                                className="btn btn-ghost btn-block"
                            >
                                Open PC Builder
                            </Link>
                        </>
                    )}

                    {/* PC BUILD RECOMMENDATION */}
                    {result?.status === "ok" && (
                        <>
                            <span className="ai-badge">
                                <Sparkles size={14} />
                                AI-assisted suggestion
                            </span>

                            <p>{result.summary}</p>

                            <h3>Recommended Components</h3>

                            <ul className="cart-list">
                                {result.parts.map((part, index) => {
                                    const status = stockStatus(part.stock);

                                    return (
                                        <li
                                            key={`${part.id}-${index}`}
                                            className="suggested-part"
                                        >
                                            <div>
                                                <Link
                                                    to={`/products/${part.id}`}
                                                    className="cart-name"
                                                >
                                                    {part.name}
                                                </Link>

                                                <span className="cart-unit">
                                                    {part.category?.name}
                                                </span>

                                                {part.reason && (
                                                    <span className="reason">
                                                        {part.reason}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="suggested-price">
                                                <strong className="price">
                                                    {formatPrice(part.priceCents)}
                                                </strong>

                                                <span className={`stock stock-${status.tone}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <CompatibilityReport
                                report={result.report}
                            />

                            {result.budgetPesos && (
                                <p className="hint">
                                    Your budget: ₱
                                    {result.budgetPesos.toLocaleString("en-PH")}
                                </p>
                            )}

                            <Link
                                to={`/builder?parts=${result.parts.map((part) => part.id).join(",")}`}
                                className="btn btn-primary btn-lg btn-block"
                            >
                                Customize This Build
                            </Link>

                            <p className="hint">
                                Review your recommended components
                                before adding them to your cart.
                            </p>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
