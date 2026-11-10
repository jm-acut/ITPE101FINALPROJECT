import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { catalogApi, isAbort } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { categoryIcon, formatPrice, SPEC_LABELS, stockStatus } from "../utils.js";

export default function ProductDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const { addItem } = useCart();
    const navigate = useNavigate();
    const location = useLocation();

    const [product, setProduct] = useState(null);
    const [error, setError] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: "success" | "error", text }

    useEffect(() => {
        const controller = new AbortController();
        setProduct(null);
        setError(null);
        setQuantity(1);
        setFeedback(null);

        catalogApi
            .product(id, controller.signal)
            .then((res) => setProduct(res.data))
            .catch((err) => {
                if (!isAbort(err)) setError(err);
            });

        return () => controller.abort();
    }, [id]);

    const handleAdd = async () => {
        if (!user) {
            navigate("/login", { state: { from: location.pathname } });
            return;
        }
        setAdding(true);
        setFeedback(null);
        try {
            await addItem(product.id, quantity);
            setFeedback({ type: "success", text: `Added ${quantity} to your cart.` });
        } catch (err) {
            setFeedback({ type: "error", text: err.message });
        } finally {
            setAdding(false);
        }
    };

    if (error) {
        const missing = error.status === 404 || error.status === 422;
        return (
            <div className="container page">
                <div className="empty">
                    <h2>{missing ? "Product not found" : "Could not load this product"}</h2>
                    <p>{missing ? "It may have been removed or is no longer sold." : error.message}</p>
                    <Link to="/products" className="btn btn-primary">Back to products</Link>
                </div>
            </div>
        );
    }

    if (!product) return <div className="page-state">Loading product...</div>;

    const Icon = categoryIcon(product.category?.slug);
    const status = stockStatus(product.stock);
    const maxQty = Math.min(product.stock, 99);
    const soldOut = product.stock <= 0;
    const specs = Object.entries(product.specs ?? {});

    return (
        <div className="container page">
            <Link to="/products" className="back-link"><ChevronLeft size={18} /> All products</Link>

            <div className="detail">
                <div className="detail-media">
                    {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} />
                    ) : (
                        <Icon size={88} strokeWidth={1.25} aria-hidden="true" />
                    )}
                </div>

                <div className="detail-info">
                    <p className="product-meta">{product.brand ?? product.category?.name}</p>
                    <h1>{product.name}</h1>
                    <p className="detail-desc">{product.description}</p>

                    <div className="detail-price">
                        <strong className="price price-lg">{formatPrice(product.priceCents)}</strong>
                        <span className={`stock stock-${status.tone}`}>{status.label}</span>
                    </div>

                    <div className="buy-row">
                        <div className="stepper" role="group" aria-label="Quantity">
                            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={soldOut || quantity <= 1} aria-label="Decrease quantity">
                                <Minus size={16} />
                            </button>
                            <span aria-live="polite">{quantity}</span>
                            <button onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={soldOut || quantity >= maxQty} aria-label="Increase quantity">
                                <Plus size={16} />
                            </button>
                        </div>

                        <button className="btn btn-primary btn-lg" onClick={handleAdd} disabled={soldOut || adding}>
                            <ShoppingCart size={18} /> {soldOut ? "Out of stock" : adding ? "Adding..." : "Add to cart"}
                        </button>
                    </div>

                    {feedback && (
                        <p className={`feedback feedback-${feedback.type}`} role="status">
                            {feedback.text}{" "}
                            {feedback.type === "success" && <Link to="/cart" className="link">View cart</Link>}
                        </p>
                    )}

                    {specs.length > 0 && (
                        <>
                            <h2 className="spec-title">Specifications</h2>
                            <dl className="spec-table">
                                {specs.map(([key, value]) => (
                                    <div key={key}>
                                        <dt>{SPEC_LABELS[key] ?? key}</dt>
                                        <dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}