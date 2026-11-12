import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "../../api/client.js";
import { ORDER_STATUS, formatDateTime, formatPrice } from "../../utils.js";

export default function AdminOrders() {
    // Filters live in the URL, so the dashboard can link straight to "flagged orders".
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const status = params.get("status") ?? "";
    const flagged = params.get("flagged") ?? "";
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";

    const [result, setResult] = useState({ items: null, meta: null });
    const [error, setError] = useState("");

    const update = (patch, { keepPage = false } = {}) =>
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                for (const [key, value] of Object.entries(patch)) {
                    if (value === "" || value === null || value === undefined) next.delete(key);
                    else next.set(key, String(value));
                }
                if (!keepPage) next.delete("page");
                return next;
            },
            { replace: true }
        );

    useEffect(() => {
        let active = true;
        setError("");
        adminApi
            .orders({ page, limit: 10, status, flagged, from, to })
            .then((res) => active && setResult({ items: res.data, meta: res.meta }))
            .catch((err) => active && setError(err.message));
        return () => {
            active = false;
        };
    }, [page, status, flagged, from, to]);

    const { items, meta } = result;

    return (
        <>
            <header className="page-head">
                <h1>Orders</h1>
                <p>{meta ? `${meta.total} orders` : "Loading orders"}</p>
            </header>

            <div className="toolbar">
                <select value={status} onChange={(e) => update({ status: e.target.value })} aria-label="Filter by status">
                    <option value="">All statuses</option>
                    {Object.entries(ORDER_STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
                </select>

                <label className="check">From <input type="date" value={from} onChange={(e) => update({ from: e.target.value })} /></label>
                <label className="check">To <input type="date" value={to} onChange={(e) => update({ to: e.target.value })} /></label>

                <label className="check">
                    <input type="checkbox" checked={flagged === "true"} onChange={(e) => update({ flagged: e.target.checked ? "true" : "" })} />
                    Needs attention
                </label>
            </div>

            {error ? (
                <div className="notice notice-error">{error}</div>
            ) : !items ? (
                <div className="page-state">Loading orders...</div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Placed</th>
                                <th className="num">Items</th>
                                <th className="num">Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((o) => {
                                const s = ORDER_STATUS[o.status];
                                return (
                                    <tr key={o.id}>
                                        <td><Link to={`/admin/orders/${o.id}`} className="link">#{o.id.slice(0, 8).toUpperCase()}</Link></td>
                                        <td className="wrap">
                                            {o.customer?.name}
                                            <span className="cell-sub">{o.customer?.email}</span>
                                        </td>
                                        <td>{formatDateTime(o.createdAt)}</td>
                                        <td className="num">{o.itemCount}</td>
                                        <td className="num">{formatPrice(o.totalCents)}</td>
                                        <td>
                                            <span className={`status status-${s.tone}`}>{s.label}</span>{" "}
                                            {o.flagged && <span className="status status-bad">Flagged</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && <tr><td colSpan={6} className="wrap">No orders match these filters.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                    <button className="btn btn-ghost" disabled={page <= 1} onClick={() => update({ page: page - 1 }, { keepPage: true })}><ChevronLeft size={18} /> Previous</button>
                    <span>Page {meta.page} of {meta.totalPages}</span>
                    <button className="btn btn-ghost" disabled={page >= meta.totalPages} onClick={() => update({ page: page + 1 }, { keepPage: true })}>Next <ChevronRight size={18} /></button>
                </nav>
            )}
        </>
    );
}