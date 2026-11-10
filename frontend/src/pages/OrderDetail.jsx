import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Clock } from "lucide-react";
import { orderApi } from "../api/client.js";
import { ORDER_STATUS, formatDateTime, formatPrice } from "../utils.js";

const pad = (n) => String(n).padStart(2, "0");

export default function OrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [now, setNow] = useState(Date.now());

    const load = useCallback(() => {
        return orderApi
            .get(id)
            .then((res) => setOrder(res.data))
            .catch((err) => setError(err));
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // Countdown to the end of the payment window
    useEffect(() => {
        if (!order?.expiresAt) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [order?.expiresAt]);

    const msLeft = order?.expiresAt ? new Date(order.expiresAt).getTime() - now : null;
    const windowEnded = msLeft !== null && msLeft <= 0;

    // When the window ends, reload once: the server marks the order as expired and returns the stock.
    useEffect(() => {
        if (!windowEnded) return undefined;
        const timer = setTimeout(load, 1500);
        return () => clearTimeout(timer);
    }, [windowEnded, load]);

    const cancel = async () => {
        if (!window.confirm("Cancel this order? Your items will be released.")) return;
        setCancelling(true);
        setActionError("");
        try {
            const res = await orderApi.cancel(id);
            setOrder(res.data);
        } catch (err) {
            setActionError(err.message);
            load();
        } finally {
            setCancelling(false);
        }
    };

    if (error) {
        return (
            <div className="container page">
                <div className="empty">
                    <h2>{error.status === 404 || error.status === 422 ? "Order not found" : "Could not load this order"}</h2>
                    <Link to="/orders" className="btn btn-primary">Back to orders</Link>
                </div>
            </div>
        );
    }
    if (!order) return <div className="page-state">Loading order...</div>;

    const status = ORDER_STATUS[order.status];
    const minutes = msLeft > 0 ? Math.floor(msLeft / 60000) : 0;
    const seconds = msLeft > 0 ? Math.floor((msLeft % 60000) / 1000) : 0;

    return (
        <div className="container page">
            <Link to="/orders" className="back-link"><ChevronLeft size={18} /> My orders</Link>

            <header className="page-head order-head">
                <div>
                    <h1>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
                    <p>Placed {formatDateTime(order.createdAt)}</p>
                </div>
                <span className={`status status-${status.tone}`}>{status.label}</span>
            </header>

            {actionError && <div className="notice notice-error" role="alert">{actionError}</div>}

            {order.status === "pending_payment" && (
                <div className="hold-banner">
                    <Clock size={18} />
                    <span>
                        {windowEnded
                            ? "Your payment window has ended. Updating..."
                            : <>Your items are held for <strong className="countdown">{pad(minutes)}:{pad(seconds)}</strong>. Pay before the timer ends.</>}
                    </span>
                </div>
            )}

            <div className="cart-layout">
                <div>
                    <ul className="cart-list">
                        {order.items.map((item) => (
                            <li key={item.productId} className="order-item">
                                <Link to={`/products/${item.productId}`} className="cart-name">{item.name}</Link>
                                <span className="cart-unit">{item.quantity} × {formatPrice(item.unitPriceCents)}</span>
                                <strong className="price">{formatPrice(item.lineTotalCents)}</strong>
                            </li>
                        ))}
                    </ul>

                    <h2 className="spec-title">Delivery</h2>
                    <div className="info-card">
                        <strong>{order.shipping.name}</strong>
                        <span>{order.shipping.phone}</span>
                        <span>{order.shipping.address}</span>
                    </div>

                    <h2 className="spec-title">History</h2>
                    <ol className="timeline">
                        {order.history.map((h, i) => (
                            <li key={i}>
                                <strong>{ORDER_STATUS[h.to]?.label ?? h.to}</strong>
                                <small>{formatDateTime(h.createdAt)}{h.note ? ` · ${h.note}` : ""}</small>
                            </li>
                        ))}
                    </ol>
                </div>

                <aside className="summary">
                    <h2>Payment summary</h2>
                    <dl>
                        <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
                        {order.discountCents > 0 && (
                            <div className="discount"><dt>Discount {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>-{formatPrice(order.discountCents)}</dd></div>
                        )}
                        <div><dt>Shipping</dt><dd>{order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}</dd></div>
                        <div className="grand"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
                    </dl>

                    {order.status === "pending_payment" && (
                        <>
                            <button className="btn btn-primary btn-lg btn-block" disabled>Pay now (next stage)</button>
                            <button className="btn btn-ghost btn-block" onClick={cancel} disabled={cancelling}>
                                {cancelling ? "Cancelling..." : "Cancel order"}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}