import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { categoryIcon, formatPrice } from "../utils.js";

const ISSUE_TEXT = {
    UNAVAILABLE: "This product is no longer sold.",
    OUT_OF_STOCK: "This product is out of stock.",
    INSUFFICIENT_STOCK: "Not enough stock for this quantity."
};

export default function Cart() {
    const { cart, loading, setQuantity, removeItem, clearCart } = useCart();
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    const act = async (productId, action) => {
        setBusyId(productId);
        setError("");
        try {
            await action();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    if (loading && cart.items.length === 0) return <div className="page-state">Loading your cart...</div>;

    if (cart.items.length === 0) {
        return (
            <div className="container page">
                <div className="empty">
                    <ShoppingCart size={40} strokeWidth={1.5} />
                    <h2>Your cart is empty</h2>
                    <p>Add a few components and they will show up here.</p>
                    <Link to="/products" className="btn btn-primary">Browse products</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container page">
            <header className="page-head">
                <h1>Your cart</h1>
                <p>{cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}</p>
            </header>

            {error && <div className="notice notice-error" role="alert">{error}</div>}

            <div className="cart-layout">
                <ul className="cart-list">
                    {cart.items.map((item) => {
                        const Icon = categoryIcon(item.categorySlug);
                        const busy = busyId === item.productId;
                        return (
                            <li key={item.productId} className={`cart-item ${item.issue ? "has-issue" : ""}`}>
                                <Link to={`/products/${item.productId}`} className="cart-thumb">
                                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Icon size={28} strokeWidth={1.5} />}
                                </Link>

                                <div className="cart-info">
                                    <p className="product-meta">{item.brand}</p>
                                    <Link to={`/products/${item.productId}`} className="cart-name">{item.name}</Link>
                                    <span className="cart-unit">{formatPrice(item.unitPriceCents)} each</span>
                                    {item.issue && <span className="cart-issue">{ISSUE_TEXT[item.issue]}</span>}
                                </div>

                                <div className="stepper" role="group" aria-label={`Quantity for ${item.name}`}>
                                    <button
                                        onClick={() => act(item.productId, () => setQuantity(item.productId, item.quantity - 1))}
                                        disabled={busy || item.quantity <= 1}
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button
                                        onClick={() => act(item.productId, () => setQuantity(item.productId, item.quantity + 1))}
                                        disabled={busy || item.quantity >= 99}
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <strong className="price cart-line">{formatPrice(item.lineTotalCents)}</strong>

                                <button
                                    className="icon-btn"
                                    onClick={() => act(item.productId, () => removeItem(item.productId))}
                                    disabled={busy}
                                    aria-label={`Remove ${item.name}`}
                                    title="Remove"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <aside className="summary">
                    <h2>Order summary</h2>
                    <dl>
                        <div><dt>Subtotal</dt><dd>{formatPrice(cart.subtotalCents)}</dd></div>
                        <div><dt>Shipping and discounts</dt><dd>At checkout</dd></div>
                    </dl>

                                       {cart.hasIssues ? (
                        <button className="btn btn-primary btn-lg btn-block" disabled>Checkout</button>
                    ) : (
                        <Link to="/checkout" className="btn btn-primary btn-lg btn-block">Checkout</Link>
                    )}
                    {cart.hasIssues && <p className="hint">Fix the highlighted items before checking out.</p>}

                    <button className="btn btn-ghost btn-block" onClick={() => act("all", clearCart)}>
                        Clear cart
                    </button>
                </aside>
            </div>
        </div>
    );
}