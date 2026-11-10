import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import { orderApi } from "../api/client.js";
import { ORDER_STATUS, formatDateTime, formatPrice } from "../utils.js";

export default function Orders() {
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: null, meta: null });
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setResult((prev) => ({ ...prev, items: null }));
        orderApi
            .list({ page, limit: 10 })
            .then((res) => active && setResult({ items: res.data, meta: res.meta }))
            .catch((err) => active && setError(err.message));
        return () => {
            active = false;
        };
    }, [page]);

    const { items, meta } = result;

    if (error) return <div className="container page"><div className="notice notice-error">{error}</div></div>;
    if (!items) return <div className="page-state">Loading your orders...</div>;

    if (items.length === 0) {
        return (
            <div className="container page">
                <div className="empty">
                    <PackageOpen size={40} strokeWidth={1.5} />
                    <h2>No orders yet</h2>
                    <p>Your orders will show up here after you check out.</p>
                    <Link to="/products" className="btn btn-primary">Browse products</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container page">
            <header className="page-head">
                <h1>My orders</h1>
                <p>{meta.total} {meta.total === 1 ? "order" : "orders"}</p>
            </header>

            <ul className="order-list">
                {items.map((order) => {
                    const status = ORDER_STATUS[order.status];
                    return (
                        <li key={order.id}>
                            <Link to={`/orders/${order.id}`} className="order-row">
                                <span>
                                    <strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong>
                                    <small>{formatDateTime(order.createdAt)} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}</small>
                                </span>
                                <span className={`status status-${status.tone}`}>{status.label}</span>
                                <strong className="price">{formatPrice(order.totalCents)}</strong>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {meta.totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                    <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /> Previous</button>
                    <span>Page {meta.page} of {meta.totalPages}</span>
                    <button className="btn btn-ghost" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next <ChevronRight size={18} /></button>
                </nav>
            )}
        </div>
    );
}