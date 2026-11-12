import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/client.js";
import { formatPrice } from "../../utils.js";

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        adminApi
            .dashboard()
            .then((res) => active && setStats(res.data))
            .catch((err) => active && setError(err.message));
        return () => {
            active = false;
        };
    }, []);

    if (error) return <div className="notice notice-error">{error}</div>;
    if (!stats) return <div className="page-state">Loading dashboard...</div>;

    const cards = [
        { label: "Paid orders", value: stats.paidOrders },
        { label: "Gross sales", value: formatPrice(stats.grossSalesCents) },
        { label: "Awaiting payment", value: stats.pendingOrders },
        { label: "Flagged orders", value: stats.flaggedOrders, bad: stats.flaggedOrders > 0, to: "/admin/orders?flagged=true" }
    ];

    return (
        <>
            <header className="page-head">
                <h1>Dashboard</h1>
                <p>A live summary of the store.</p>
            </header>

            <div className="stat-grid">
                {cards.map((card) => {
                    const body = (
                        <>
                            <span>{card.label}</span>
                            <strong>{card.value}</strong>
                        </>
                    );
                    return card.to ? (
                        <Link key={card.label} to={card.to} className={`stat-card ${card.bad ? "is-bad" : ""}`}>{body}</Link>
                    ) : (
                        <div key={card.label} className="stat-card">{body}</div>
                    );
                })}
            </div>

            <h2 className="spec-title">Low stock (5 or fewer)</h2>
            {stats.lowStock.length === 0 ? (
                <div className="empty"><p>Every active product has enough stock.</p></div>
            ) : (
                <ul className="low-list table-wrap">
                    {stats.lowStock.map((p) => (
                        <li key={p.id}>
                            <span>{p.name}</span>
                            <span className={`stock ${p.stock === 0 ? "stock-out" : "stock-low"}`}>
                                {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="hint">Adjust stock from the Products page.</p>
        </>
    );
}