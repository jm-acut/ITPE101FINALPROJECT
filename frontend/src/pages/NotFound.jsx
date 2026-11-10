import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="container page">
            <div className="empty">
                <h2>Page not found</h2>
                <p>The page you are looking for does not exist.</p>
                <Link to="/" className="btn btn-primary">Go home</Link>
            </div>
        </div>
    );
}