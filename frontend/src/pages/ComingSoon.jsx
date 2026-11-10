import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

export default function ComingSoon({ title = "Coming soon", text = "This page is part of an upcoming phase." }) {
    return (
        <div className="container page">
            <div className="empty">
                <Wrench size={40} strokeWidth={1.5} />
                <h2>{title}</h2>
                <p>{text}</p>
                <Link to="/products" className="btn btn-primary">Keep browsing</Link>
            </div>
        </div>
    );
}