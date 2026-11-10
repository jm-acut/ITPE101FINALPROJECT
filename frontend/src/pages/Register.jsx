import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const onSubmit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setFieldErrors({});
        try {
            await register(form);
            navigate("/", { replace: true });
        } catch (err) {
            if (err.status === 422 && Array.isArray(err.details)) {
                // Keep the first message per field
                const map = {};
                for (const d of err.details) if (!map[d.field]) map[d.field] = d.message;
                setFieldErrors(map);
            } else {
                setError(err.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={onSubmit} noValidate>
                <h1>Create your account</h1>
                <p className="auth-sub">Save your cart, track orders, and keep your builds.</p>

                {error && <div className="notice notice-error" role="alert">{error}</div>}

                <label className="field">
                    <span>Full name</span>
                    <input autoComplete="name" required value={form.name} onChange={set("name")} aria-invalid={Boolean(fieldErrors.name)} />
                    {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
                </label>

                <label className="field">
                    <span>Email</span>
                    <input type="email" autoComplete="email" required value={form.email} onChange={set("email")} aria-invalid={Boolean(fieldErrors.email)} />
                    {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
                </label>

                <label className="field">
                    <span>Password</span>
                    <div className="password-field">
                        <input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={form.password}
                            onChange={set("password")} aria-invalid={Boolean(fieldErrors.password)} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {fieldErrors.password
                        ? <small className="field-error">{fieldErrors.password}</small>
                        : <small className="field-hint">At least 8 characters, with a letter and a number.</small>}
                </label>

                <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                    {busy ? "Creating account..." : "Create account"}
                </button>

                <p className="auth-switch">Already have an account? <Link to="/login" className="link">Sign in</Link></p>
            </form>
        </div>
    );
}