import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const onSubmit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const signedIn = await login(form);
            const fallback = signedIn.role === "admin" ? "/admin" : "/";
            navigate(location.state?.from ?? fallback, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={onSubmit} noValidate>
                <h1>Sign in</h1>
                <p className="auth-sub">Welcome back. Sign in to see your cart and orders.</p>

                {error && <div className="notice notice-error" role="alert">{error}</div>}

                <label className="field">
                    <span>Email</span>
                    <input type="email" autoComplete="email" required value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>

                <label className="field">
                    <span>Password</span>
                    <div className="password-field">
                        <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </label>

                <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                    {busy ? "Signing in..." : "Sign in"}
                </button>

                <p className="auth-switch">New to NEXUS PC? <Link to="/register" className="link">Create an account</Link></p>
            </form>
        </div>
    );
}