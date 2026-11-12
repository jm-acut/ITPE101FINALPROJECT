import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildApi } from "../api/client.js";
import CompatibilityReport from "../components/CompatibilityReport.jsx";
import { formatPrice } from "../utils.js";

export default function SharedBuild() {
    const { code } = useParams();
    const [build, setBuild] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        buildApi
            .shared(code)
            .then((res) => active && setBuild(res.data))
            .catch((err) => active && setError(err));
        return () => {
            active = false;
        };
    }, [code]);

    if (error) {
        return (
            <div className="container page">
                <div className="empty">
                    <h2>{error.status === 404 || error.status === 422 ? "Build not found" : "Could not load this build"}</h2>
                    <p>It may have been removed, or the owner stopped sharing it.</p>
                    <Link to="/builder" className="btn btn-primary">Start your own build</Link>
                </div>
            </div>
        );
    }
    if (!build) return <div className="page-state">Loading build...</div>;

    return (
        <div className="container page">
            <header className="page-head order-head">
                <div>
                    <h1>{build.name}</h1>
                    <p>A shared PC build. Prices and stock are live.</p>
                </div>
                <Link to={`/builder?parts=${build.parts.map((p) => p.id).join(",")}`} className="btn btn-primary">Start from this build</Link>
            </header>

            <div className="cart-layout">
                <ul className="cart-list">
                    {build.parts.map((part, i) => (
                        <li key={`${part.id}-${i}`} className="order-item">
                            <Link to={`/products/${part.id}`} className="cart-name">{part.name}</Link>
                            <span className="cart-unit">{part.category?.name}</span>
                            <strong className="price">{formatPrice(part.priceCents)}</strong>
                        </li>
                    ))}
                </ul>

                <aside className="summary">
                    <h2>Compatibility</h2>
                    <CompatibilityReport report={build} />
                </aside>
            </div>
        </div>
    );
}