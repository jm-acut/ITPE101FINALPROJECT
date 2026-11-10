import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function Layout() {
    const { pathname } = useLocation();

    // Start each new page at the top
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [pathname]);

    return (
        <div className="app-shell">
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}