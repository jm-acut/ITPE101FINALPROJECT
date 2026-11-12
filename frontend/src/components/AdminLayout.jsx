import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Tag } from "lucide-react";

const links = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: ClipboardList },
    { to: "/admin/coupons", label: "Coupons", icon: Tag }
];

export default function AdminLayout() {
    return (
        <div className="container page admin-shell">
            <aside className="admin-nav" aria-label="Admin">
                {links.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end}><Icon size={18} /> {label}</NavLink>
                ))}
            </aside>
            <section className="admin-content">
                <Outlet />
            </section>
        </div>
    );
}