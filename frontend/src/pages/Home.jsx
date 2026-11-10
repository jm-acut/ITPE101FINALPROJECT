import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Wrench, Bot, Check } from "lucide-react";
import { catalogApi, isAbort } from "../api/client.js";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard.jsx";
import { categoryIcon } from "../utils.js";

const features = [
    { icon: ShieldCheck, title: "Compatibility checker", text: "Socket, memory type, and power draw are checked before you pay, so a part never arrives that does not fit." },
    { icon: Wrench, title: "Build creator", text: "Pick a processor, board, memory, and power supply in one place and save the build to your account." },
    { icon: Bot, title: "AI build assistant", text: "Describe your budget and what you play or make. The assistant suggests parts from what is in stock." }
];

const sampleBuild = [
    { part: "Processor", value: "Ryzen 5 7600", note: "AM5" },
    { part: "Motherboard", value: "B650 Gaming Plus", note: "AM5" },
    { part: "Memory", value: "DDR5-5600 16GB", note: "DDR5" },
    { part: "Power supply", value: "650W Bronze", note: "needs 520W" }
];

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [latest, setLatest] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        Promise.all([
            catalogApi.categories(controller.signal),
            catalogApi.products({ limit: 4, sort: "newest" }, controller.signal)
        ])
            .then(([cats, products]) => {
                setCategories(cats.data);
                setLatest(products.data);
            })
            .catch((err) => {
                if (!isAbort(err)) setError(true);
            });

        return () => controller.abort();
    }, []);

    return (
        <>
            <section className="hero">
                <div className="container hero-inner">
                    <div className="hero-copy">
                        <h1>Build a PC where every part fits.</h1>
                        <p>
                            Shop processors, graphics cards, memory, and more. Every product lists the specs that
                            decide compatibility, and the build tools check them for you.
                        </p>
                        <div className="hero-actions">
                            <Link to="/products" className="btn btn-primary btn-lg">Shop components</Link>
                            <a href="#features" className="btn btn-outline-light btn-lg">See how it works</a>
                        </div>
                    </div>

                    <div className="readout" aria-label="Example of a build check">
                        <div className="readout-head">
                            <span>Build check</span>
                            <span className="readout-ok"><Check size={14} /> All parts compatible</span>
                        </div>
                        <ul>
                            {sampleBuild.map((row) => (
                                <li key={row.part}>
                                    <span className="readout-part">{row.part}</span>
                                    <span className="readout-value">{row.value}</span>
                                    <span className="readout-note">{row.note}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="readout-foot">Example only. The live checker arrives with the build creator.</p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <h2>Shop by component</h2>
                        <Link to="/products" className="link">View all products</Link>
                    </div>

                    <div className="category-grid">
                        {categories.map((category) => {
                            const Icon = categoryIcon(category.slug);
                            return (
                                <Link key={category.id} to={`/products?category=${category.slug}`} className="category-card">
                                    <span className="category-icon"><Icon size={22} /></span>
                                    <span>
                                        <strong>{category.name}</strong>
                                        <small>{category.description}</small>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="section section-tint">
                <div className="container">
                    <div className="section-head">
                        <h2>Latest arrivals</h2>
                        <Link to="/products?sort=newest" className="link">Browse the catalog</Link>
                    </div>

                    {error ? (
                        <div className="notice notice-error">
                            We could not load products. Make sure the API is running, then refresh the page.
                        </div>
                    ) : (
                        <div className="product-grid">
                            {latest
                                ? latest.map((product) => <ProductCard key={product.id} product={product} />)
                                : Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    )}
                </div>
            </section>

            <section className="section" id="features">
                <div className="container">
                    <div className="section-head">
                        <h2>Built for people who build</h2>
                    </div>
                    <div className="feature-grid">
                        {features.map(({ icon: Icon, title, text }) => (
                            <article className="feature-card" key={title}>
                                <span className="category-icon"><Icon size={22} /></span>
                                <h3>{title}</h3>
                                <p>{text}</p>
                                <span className="badge">In development</span>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}