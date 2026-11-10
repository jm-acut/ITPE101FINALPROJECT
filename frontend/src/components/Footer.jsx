import { Link } from "react-router-dom";
import { Cpu } from "lucide-react";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-inner">
                <Link to="/" className="logo logo-light" aria-label="NEXUS PC home">
                    <span className="logo-mark"><Cpu size={18} /></span>
                    <span>NEXUS<span className="logo-sub">PC</span></span>
                </Link>
                <p>A school project for IT PROFEL 1. Payments run in test mode only. No real charges.</p>
                <p className="footer-copy">© 2026 NEXUS PC</p>
            </div>
        </footer>
    );
}