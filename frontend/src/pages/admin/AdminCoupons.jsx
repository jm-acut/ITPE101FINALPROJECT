import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { adminApi } from "../../api/client.js";
import { formatDateTime, formatPrice } from "../../utils.js";

const EMPTY = { code: "", type: "percentage", value: "", minSpend: "", expires: "", usageLimit: "", perCustomer: "1" };

const describe = (c) => (c.type === "percentage" ? `${c.value}% off` : `${formatPrice(c.value)} off`);

export default function AdminCoupons() {
    const [items, setItems] = useState(null);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        return adminApi
            .coupons({ page: 1, limit: 50 })
            .then((res) => setItems(res.data))
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

    const create = async (event) => {
        event.preventDefault();
        setBusy(true);
        setFormError("");
        setFieldErrors({});

        const value = Number(form.value);
        const body = {
            code: form.code,
            type: form.type,
            value: form.type === "fixed" ? Math.round(value * 100) : value, // fixed amounts are sent in centavos
            minSpendCents: Math.round(Number(form.minSpend || 0) * 100),
            expiresAt: form.expires ? new Date(`${form.expires}T23:59:59+08:00`).toISOString() : null,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
            perCustomerLimit: Number(form.perCustomer || 1)
        };

        try {
            await adminApi.createCoupon(body);
            setForm(EMPTY);
            await load();
        } catch (err) {
            if (err.status === 422 && Array.isArray(err.details)) {
                const map = {};
                for (const d of err.details) if (!map[d.field]) map[d.field] = d.message;
                setFieldErrors(map);
            } else {
                setFormError(err.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const toggle = async (coupon) => {
        setActionError("");
        try {
            await adminApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
            await load();
        } catch (err) {
            setActionError(err.message);
        }
    };

    const remove = async (coupon) => {
        if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
        setActionError("");
        try {
            await adminApi.deleteCoupon(coupon.id);
            await load();
        } catch (err) {
            setActionError(err.message); // a used coupon answers 409: deactivate it instead
        }
    };

    const fieldError = (name) => fieldErrors[name] && <small className="field-error">{fieldErrors[name]}</small>;

    return (
        <>
            <header className="page-head">
                <h1>Coupons</h1>
                <p>Discounts are always calculated on the server.</p>
            </header>

            <form className="card-form" onSubmit={create} noValidate>
                <h2 className="spec-title" style={{ marginTop: 0 }}>New coupon</h2>
                {formError && <div className="notice notice-error" role="alert">{formError}</div>}

                <div className="form-grid">
                    <label className="field">
                        <span>Code</span>
                        <input value={form.code} onChange={set("code")} placeholder="SUMMER15" aria-invalid={Boolean(fieldErrors.code)} />
                        {fieldError("code")}
                    </label>

                    <label className="field">
                        <span>Type</span>
                        <select value={form.type} onChange={set("type")}>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed amount</option>
                        </select>
                    </label>

                    <label className="field">
                        <span>{form.type === "percentage" ? "Percent off (1 to 100)" : "Amount off (₱)"}</span>
                        <input type="number" min="1" step={form.type === "percentage" ? "1" : "0.01"} value={form.value} onChange={set("value")} aria-invalid={Boolean(fieldErrors.value)} />
                        {fieldError("value")}
                    </label>

                    <label className="field">
                        <span>Minimum spend (₱)</span>
                        <input type="number" min="0" step="0.01" value={form.minSpend} onChange={set("minSpend")} placeholder="0" />
                        {fieldError("minSpendCents")}
                    </label>

                    <label className="field">
                        <span>Expires on (optional)</span>
                        <input type="date" value={form.expires} onChange={set("expires")} />
                        {fieldError("expiresAt")}
                    </label>

                    <label className="field">
                        <span>Total uses (optional)</span>
                        <input type="number" min="1" step="1" value={form.usageLimit} onChange={set("usageLimit")} placeholder="Unlimited" />
                        {fieldError("usageLimit")}
                    </label>

                    <label className="field">
                        <span>Uses per customer</span>
                        <input type="number" min="1" step="1" value={form.perCustomer} onChange={set("perCustomer")} />
                        {fieldError("perCustomerLimit")}
                    </label>
                </div>

                <div className="form-actions" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" disabled={busy}>{busy ? "Creating..." : "Create coupon"}</button>
                </div>
            </form>

            {actionError && <div className="notice notice-error" role="alert">{actionError}</div>}
            {error ? (
                <div className="notice notice-error">{error}</div>
            ) : !items ? (
                <div className="page-state">Loading coupons...</div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Discount</th>
                                <th className="num">Min spend</th>
                                <th>Expires</th>
                                <th className="num">Used</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((c) => {
                                const expired = c.expiresAt && new Date(c.expiresAt) <= new Date();
                                return (
                                    <tr key={c.id}>
                                        <td><strong>{c.code}</strong></td>
                                        <td>{describe(c)}</td>
                                        <td className="num">{c.minSpendCents ? formatPrice(c.minSpendCents) : "None"}</td>
                                        <td>{c.expiresAt ? formatDateTime(c.expiresAt) : "Never"}</td>
                                        <td className="num">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                                        <td>
                                            <span className={`status ${expired ? "status-bad" : c.isActive ? "status-ok" : "status-warn"}`}>
                                                {expired ? "Expired" : c.isActive ? "Active" : "Off"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="btn btn-ghost" onClick={() => toggle(c)}>{c.isActive ? "Turn off" : "Turn on"}</button>
                                                <button className="icon-btn" title="Delete" aria-label={`Delete ${c.code}`} onClick={() => remove(c)}><Trash2 size={17} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && <tr><td colSpan={7} className="wrap">No coupons yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}