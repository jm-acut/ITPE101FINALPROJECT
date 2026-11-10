import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, PackageX } from "lucide-react";
import { catalogApi, isAbort } from "../api/client.js";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard.jsx";

const PAGE_SIZE = 12;

const SORTS = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "name_asc", label: "Name: A to Z" }
];

const pesosToCents = (value) => (value === "" || value === null ? undefined : Math.round(Number(value) * 100));

export default function Products() {
    // The URL is the single source of truth for filters, so links can be shared and Back works.
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const search = params.get("search") ?? "";
    const category = params.get("category") ?? "";
    const sort = params.get("sort") ?? "newest";
    const minPrice = params.get("min") ?? "";
    const maxPrice = params.get("max") ?? "";

    const [categories, setCategories] = useState([]);
    const [result, setResult] = useState({ items: null, meta: null });
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    // Local text state so typing feels instant; the URL updates after a short pause.
    const [searchText, setSearchText] = useState(search);
    const [minText, setMinText] = useState(minPrice);
    const [maxText, setMaxText] = useState(maxPrice);

    // Functional update, so a pending debounce can never overwrite a filter changed meanwhile.
    const update = (patch, { keepPage = false } = {}) => {
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                for (const [key, value] of Object.entries(patch)) {
                    if (value === "" || value === undefined || value === null) next.delete(key);
                    else next.set(key, String(value));
                }
                if (!keepPage) next.delete("page");
                return next;
            },
            { replace: true }
        );
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText !== search || minText !== minPrice || maxText !== maxPrice) {
                update({ search: searchText.trim(), min: minText, max: maxText });
            }
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText, minText, maxText]);

    useEffect(() => {
        const controller = new AbortController();
        catalogApi
            .categories(controller.signal)
            .then((res) => setCategories(res.data))
            .catch(() => {});
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setResult((prev) => ({ ...prev, items: null }));
        setError("");

        catalogApi
            .products(
                {
                    page,
                    limit: PAGE_SIZE,
                    search,
                    category,
                    sort,
                    minPriceCents: pesosToCents(minPrice),
                    maxPriceCents: pesosToCents(maxPrice)
                },
                controller.signal
            )
            .then((res) => setResult({ items: res.data, meta: res.meta }))
            .catch((err) => {
                if (!isAbort(err)) setError(err.message);
            });

        return () => controller.abort();
    }, [page, search, category, sort, minPrice, maxPrice, reloadKey]);

    const { items, meta } = result;
    const filtersActive = Boolean(search || category || minPrice || maxPrice);

    const clearFilters = () => {
        setSearchText("");
        setMinText("");
        setMaxText("");
        setParams({}, { replace: true });
    };

    return (
        <div className="container page">
            <header className="page-head">
                <h1>Components</h1>
                <p>{meta ? `${meta.total} ${meta.total === 1 ? "product" : "products"}` : "Loading products"}</p>
            </header>

            <div className="filters">
                <label className="search-field">
                    <Search size={18} aria-hidden="true" />
                    <input
                        type="search"
                        placeholder="Search by name or brand"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        aria-label="Search products"
                    />
                </label>

                <div className="price-range">
                    <input
                        type="number" min="0" inputMode="numeric" placeholder="Min ₱"
                        value={minText} onChange={(e) => setMinText(e.target.value)} aria-label="Minimum price in pesos"
                    />
                    <span>to</span>
                    <input
                        type="number" min="0" inputMode="numeric" placeholder="Max ₱"
                        value={maxText} onChange={(e) => setMaxText(e.target.value)} aria-label="Maximum price in pesos"
                    />
                </div>

                <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            <div className="chip-filter" role="group" aria-label="Filter by category">
                <button className={`pill ${category === "" ? "is-active" : ""}`} onClick={() => update({ category: "" })}>
                    All
                </button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        className={`pill ${category === c.slug ? "is-active" : ""}`}
                        onClick={() => update({ category: c.slug })}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {error ? (
                <div className="notice notice-error">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
                </div>
            ) : items && items.length === 0 ? (
                <div className="empty">
                    <PackageX size={40} strokeWidth={1.5} />
                    <h2>No products match</h2>
                    <p>Try a different search or remove a filter.</p>
                    {filtersActive && <button className="btn btn-primary" onClick={clearFilters}>Clear filters</button>}
                </div>
            ) : (
                <div className="product-grid">
                    {items
                        ? items.map((product) => <ProductCard key={product.id} product={product} />)
                        : Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
                </div>
            )}

            {meta && meta.totalPages > 1 && !error && (
                <nav className="pagination" aria-label="Pagination">
                    <button className="btn btn-ghost" disabled={page <= 1} onClick={() => update({ page: page - 1 }, { keepPage: true })}>
                        <ChevronLeft size={18} /> Previous
                    </button>
                    <span>Page {meta.page} of {meta.totalPages}</span>
                    <button className="btn btn-ghost" disabled={page >= meta.totalPages} onClick={() => update({ page: page + 1 }, { keepPage: true })}>
                        Next <ChevronRight size={18} />
                    </button>
                </nav>
            )}
        </div>
    );
}