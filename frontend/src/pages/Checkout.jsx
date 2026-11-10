import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tag, X } from "lucide-react";
import { orderApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatPrice } from "../utils.js";

export default function Checkout() {
    const { user } = useAuth();
    const { cart, refresh } = useCart();
    const navigate = useNavigate();

    // One key per checkout attempt. A double-click or retry sends the SAME key, so only one order is created.
    const [idempotencyKey] = useState(() => crypto.randomUUID());

    const [shipping, setShipping] = useState({ name: user?.name ?? "", phone: "", address: "" });
    const [couponInput, setCouponInput] = useState("");
    const [appliedCode, setAppliedCode] = useState(undefined);
    const [quote, setQuote] = useState(null);
    const [couponError, setCouponError] = useState("");
    const [pageError, setPageError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const loadQuote = useCallback(
        async (code) => {
            try {
                const res = await orderApi.quote(code);
                setQuote(res.data);
                setAppliedCode(code);
                setCouponError("");
            } catch (err) {
                if (err.code === "CART_EMPTY") navigate("/cart", { replace: true });
                else if (err.status === 422 && err.details?.[0]?.field === "couponCode") setCouponError(err.details[0].message);
                else setPageError(err.message);
            }
        },
        [navigate]
    );

    useEffect(() => {
        loadQuote(undefined);
    }, [loadQuote]);

    const applyCoupon = (event) => {
        event.preventDefault();
        if (couponInput.trim()) loadQuote(couponInput.trim());
    };

    const removeCoupon = () => {
        setCouponInput("");
        loadQuote(undefined);
    };

    const set = (key) => (e) => setShipping({ ...shipping, [key]: e.target.value });

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setPageError("");
        setFieldErrors({});

        try {
            const res = await orderApi.create({ shipping, couponCode: appliedCode }, idempotencyKey);
            await refresh().catch(() => {});
            navigate(`/orders/${res.data.id}`, { replace: true });
        } catch (err) {
            if (err.status === 422 && Array.isArray(err.details)) {
                const map = {};
                for (const d of err.details) if (!map[d.field]) map[d.field] = d.message;
                setFieldErrors(map);
                if (map.couponCode) setCouponError(map.couponCode);
            } else {
                setPageError(err.message);
                if (err.status === 409) await refresh().catch(() => {}); // stock changed: show the fresh cart
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container page">
            <header className="page-head">
                <h1>Checkout</h1>
                <p>Enter your delivery details. You pay on the next step.</p>
            </header>

            {pageError && (
                <div className="notice notice-error" role="alert">
                    <p>{pageError}</p>
                    <Link to="/cart" className="btn btn-ghost">Back to cart</Link>
                </div>
            )}

            <div className="cart-layout">
                <form className="checkout-form" onSubmit={submit} noValidate>
                    <h2>Delivery details</h2>

                    <label className="field">
                        <span>Receiver's full name</span>
                        <input autoComplete="name" value={shipping.name} onChange={set("name")} aria-invalid={Boolean(fieldErrors["shipping.name"])} />
                        {fieldErrors["shipping.name"] && <small className="field-error">{fieldErrors["shipping.name"]}</small>}
                    </label>

                    <label className="field">
                        <span>Mobile number</span>
                        <input type="tel" autoComplete="tel" placeholder="0917 123 4567" value={shipping.phone} onChange={set("phone")} aria-invalid={Boolean(fieldErrors["shipping.phone"])} />
                        {fieldErrors["shipping.phone"] && <small className="field-error">{fieldErrors["shipping.phone"]}</small>}
                    </label>

                    <label className="field">
                        <span>Full address</span>
                        <textarea autoComplete="street-address" placeholder="House no., street, barangay, city, province" value={shipping.address} onChange={set("address")} aria-invalid={Boolean(fieldErrors["shipping.address"])} />
                        {fieldErrors["shipping.address"] && <small className="field-error">{fieldErrors["shipping.address"]}</small>}
                    </label>

                    <button className="btn btn-primary btn-lg" disabled={submitting || !quote || cart.hasIssues}>
                        {submitting ? "Placing order..." : "Place order"}
                    </button>
                    {cart.hasIssues && <p className="hint">Some items in your cart have a stock problem. Fix them in your cart first.</p>}
                </form>

                <aside className="summary">
                    <h2>Order summary</h2>

                    <ul className="mini-items">
                        {cart.items.map((item) => (
                            <li key={item.productId}>
                                <span>{item.quantity} × {item.name}</span>
                                <strong>{formatPrice(item.lineTotalCents)}</strong>
                            </li>
                        ))}
                    </ul>

                    {quote?.coupon ? (
                        <div className="coupon-applied">
                            <span><Tag size={14} /> {quote.coupon.code} applied</span>
                            <button className="icon-btn" onClick={removeCoupon} aria-label="Remove coupon" type="button"><X size={16} /></button>
                        </div>
                    ) : (
                        <form className="coupon-row" onSubmit={applyCoupon}>
                            <input placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} aria-label="Coupon code" />
                            <button className="btn btn-ghost" disabled={!couponInput.trim()}>Apply</button>
                        </form>
                    )}
                    {couponError && <small className="field-error">{couponError}</small>}

                    {quote && (
                        <dl>
                            <div><dt>Subtotal</dt><dd>{formatPrice(quote.subtotalCents)}</dd></div>
                            {quote.discountCents > 0 && (
                                <div className="discount"><dt>Discount</dt><dd>-{formatPrice(quote.discountCents)}</dd></div>
                            )}
                            <div><dt>Shipping</dt><dd>{quote.shippingCents === 0 ? "Free" : formatPrice(quote.shippingCents)}</dd></div>
                            <div className="grand"><dt>Total</dt><dd>{formatPrice(quote.totalCents)}</dd></div>
                        </dl>
                    )}
                    <p className="hint">Free shipping on orders of ₱5,000 or more. Your items are held for 15 minutes after you place the order.</p>
                </aside>
            </div>
        </div>
    );
}