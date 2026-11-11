import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, Clock } from "lucide-react";
import { orderApi } from "../api/client.js";
import { ORDER_STATUS, formatDateTime, formatPrice } from "../utils.js";

const pad = (n) => String(n).padStart(2, "0");
const POLL_MS = 3000;
const MAX_POLLS = 20; // about one minute
const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

export default function OrderDetail() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const returned = params.get("payment"); // "success" | "failed" | "cancelled" (set by the payment page)

    const [order, setOrder] = useState(null);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [paying, setPaying] = useState(false);
    const [confirming, setConfirming] = useState(returned === "success");
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

    // After coming back from the payment page, ask the server to confirm the payment until the order updates.
    useEffect(() => {
        if (returned !== "success") return undefined;
        let stopped = false;
        let attempts = 0;
        let timer;

        const tick = async () => {
            attempts += 1;
            try {
                const res = await orderApi.syncPayment(id);
                if (stopped) return;
                setOrder(res.data);
                if (res.data.status !== "pending_payment") {
                    setConfirming(false);
                    return;
                }
            } catch (err) {
                if (stopped) return;
                setActionError(err.message);
            }
            if (attempts >= MAX_POLLS) {
                setConfirming(false);
                return;
            }
            timer = setTimeout(tick, POLL_MS);
        };

        tick();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [returned, id]);

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

    const pay = async () => {
        setPaying(true);
        setActionError("");
        try {
            const res = await orderApi.pay(id);
            window.location.assign(res.data.checkoutUrl); // the gateway's hosted payment page
        } catch (err) {
            setActionError(err.message);
            setPaying(false);
        }
    };

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
    const isPending = order.status === "pending_payment";
    const isPaid = PAID_STATUSES.includes(order.status);

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

            {returned === "success" && isPending && confirming && (
                <div className="banner banner-warn">Confirming your payment. This usually takes a few seconds...</div>
            )}
            {returned === "success" && isPending && !confirming && (
                <div className="banner banner-warn">
                    We have not received confirmation yet. If you completed the payment, refresh this page in a minute.
                </div>
            )}
            {returned === "failed" && isPending && (
                <div className="banner banner-bad">The payment did not go through. You can try again before the timer ends.</div>
            )}
            {returned === "cancelled" && isPending && (
                <div className="banner banner-warn">Payment was cancelled. Your items stay reserved until the timer ends.</div>
            )}
            {isPaid && returned === "success" && (
                <div className="banner banner-ok"><Check size={18} /> Payment received. Thank you!</div>
            )}
            {order.flagged && ["cancelled", "expired"].includes(order.status) && (
                <div className="banner banner-bad">
                    We received a payment for this order after it was closed. Our team will refund you.
                </div>
            )}

            {isPending && (
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

                    {isPending && (
                        <>
                            <button className="btn btn-primary btn-lg btn-block" onClick={pay} disabled={paying || windowEnded}>
                                {paying ? "Opening payment page..." : "Pay with Maya"}
                            </button>
                            <button className="btn btn-ghost btn-block" onClick={cancel} disabled={cancelling || paying}>
                                {cancelling ? "Cancelling..." : "Cancel order"}
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}