import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Cpu, Search, ShoppingCart, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const navigate = useNavigate();

    // Close the mobile menu whenever the page changes
    useEffect(() => setOpen(false), [pathname]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <header className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="logo" aria-label="NEXUS PC home">
                    <span className="logo-mark"><Cpu size={20} /></span>
                    <span>NEXUS<span className="logo-sub">PC</span></span>
                </Link>

                <nav className={`nav-links ${open ? "is-open" : ""}`} aria-label="Main">
                    <NavLink to="/" end>Home</NavLink>
                    <NavLink to="/products">Shop</NavLink>
                    {isAdmin && (
                        <NavLink to="/admin"><LayoutDashboard size={16} /> Admin</NavLink>
                    )}

                    <div className="nav-account-mobile">
                        {user ? (
                            <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                                <Link to="/register" className="btn btn-primary">Create account</Link>
                            </>
                        )}
                    </div>
                </nav>

                <div className="nav-actions">
                    <Link to="/products" className="icon-btn" aria-label="Search products"><Search size={20} /></Link>
                    <Link to="/cart" className="icon-btn" aria-label="Shopping cart"><ShoppingCart size={20} /></Link>

                    <div className="nav-account-desktop">
                        {user ? (
                            <>
                                <span className="nav-user">Hi, {user.name.split(" ")[0]}</span>
                                <button className="icon-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
                                    <LogOut size={20} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                                <Link to="/register" className="btn btn-primary">Create account</Link>
                            </>
                        )}
                    </div>

                    <button
                        className="icon-btn nav-toggle"
                        onClick={() => setOpen((v) => !v)}
                        aria-label={open ? "Close menu" : "Open menu"}
                        aria-expanded={open}
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>
        </header>
    );
}