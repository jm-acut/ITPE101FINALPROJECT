import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { adminApi } from "../../api/client.js";
import { ORDER_STATUS, formatDateTime, formatPrice } from "../../utils.js";

const ACTION_LABEL = {
    processing: "Start processing",
    shipped: "Mark as shipped",
    delivered: "Mark as delivered",
    cancelled: "Cancel order"
};

export default function AdminOrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        adminApi
            .order(id)
            .then((res) => active && setOrder(res.data))
            .catch((err) => active && setLoadError(err));
        return () => {
            active = false;
        };
    }, [id]);

    const move = async (status) => {
        if (status === "cancelled" && !window.confirm("Cancel this order? Its stock and coupon will be returned.")) return;
        setBusy(true);
        setActionError("");
        try {
            const res = await adminApi.setOrderStatus(id, { status, note: note.trim() || undefined });
            setOrder(res.data);
            setNote("");
        } catch (err) {
            setActionError(err.message);
            adminApi.order(id).then((res) => setOrder(res.data)).catch(() => {}); // show the fresh state
        } finally {
            setBusy(false);
        }
    };

    if (loadError) {
        return (
            <div className="empty">
                <h2>{loadError.status === 404 || loadError.status === 422 ? "Order not found" : "Could not load this order"}</h2>
                <Link to="/admin/orders" className="btn btn-primary">Back to orders</Link>
            </div>
        );
    }
    if (!order) return <div className="page-state">Loading order...</div>;

    const status = ORDER_STATUS[order.status];

    return (
        <>
            <Link to="/admin/orders" className="back-link"><ChevronLeft size={18} /> All orders</Link>

            <header className="page-head order-head">
                <div>
                    <h1>Order #{order.id.slice(0, 8).toUpperCase()}</h1>
                    <p>{order.customer?.name} · {order.customer?.email} · {formatDateTime(order.createdAt)}</p>
                </div>
                <span className={`status status-${status.tone}`}>{status.label}</span>
            </header>

            {order.flagged && (
                <div className="banner banner-bad">Needs attention: {order.flagReason ?? "flagged for review."}</div>
            )}
            {actionError && <div className="notice notice-error" role="alert">{actionError}</div>}

            <div className="cart-layout">
                <div>
                    <ul className="cart-list">
                        {order.items.map((item) => (
                            <li key={item.productId} className="order-item">
                                <span className="cart-name">{item.name}</span>
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
                    <h2>Totals</h2>
                    <dl>
                        <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
                        {order.discountCents > 0 && (
                            <div className="discount"><dt>Discount {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>-{formatPrice(order.discountCents)}</dd></div>
                        )}
                        <div><dt>Shipping</dt><dd>{order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}</dd></div>
                        <div className="grand"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
                    </dl>

                    <h2>Update status</h2>
                    {order.adminActions.length === 0 ? (
                        <p className="hint">No further changes are possible for this order.</p>
                    ) : (
                        <>
                            <label className="field">
                                <span>Note (optional)</span>
                                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Tracking number, reason..." />
                            </label>
                            {order.adminActions.map((target) => (
                                <button
                                    key={target}
                                    className={`btn btn-block ${target === "cancelled" ? "btn-ghost" : "btn-primary"}`}
                                    disabled={busy}
                                    onClick={() => move(target)}
                                >
                                    {ACTION_LABEL[target] ?? target}
                                </button>
                            ))}
                        </>
                    )}
                    {order.status === "pending_payment" && (
                        <p className="hint">"Paid" is set only by a verified payment, never by hand.</p>
                    )}
                </aside>
            </div>
        </>
    );
}