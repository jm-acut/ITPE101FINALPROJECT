
import { useCallback, useEffect, useState } from "react";

import {
    Plus,
    Pencil,
    Boxes,
    Trash2,
    Search,
    Eye,
    EyeOff,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon
} from "lucide-react";

import { adminApi, catalogApi } from "../../api/client.js";

import Modal from "../../components/Modal.jsx";

import { formatDateTime, formatPrice } from "../../utils.js";

const PAGE_SIZE = 10;

// Convert specifications into editable text.
const specsToText = (specs = {}) =>
    Object.entries(specs)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

// Convert editable text back into specifications.
function textToSpecs(text) {
    const specs = {};

    for (const line of text.split("\n")) {
        const index = line.indexOf(":");

        if (index < 1) continue;

        const key = line.slice(0, index).trim();
        const raw = line.slice(index + 1).trim();

        if (!key || raw === "") continue;

        if (raw === "true" || raw === "false") {
            specs[key] = raw === "true";
        } else if (!Number.isNaN(Number(raw))) {
            specs[key] = Number(raw);
        } else {
            specs[key] = raw;
        }
    }

    return specs;
}

// Reusable product image for the admin table.
function AdminProductThumbnail({ product }) {
    const [failed, setFailed] = useState(false);

    const imageUrl = product?.imageUrl?.trim();

    useEffect(() => {
        setFailed(false);
    }, [imageUrl]);

    return (
        <div className="admin-product-thumb">
            {imageUrl && !failed ? (
                <img
                    src={imageUrl}
                    alt={product.name}
                    loading="lazy"
                    onError={() => setFailed(true)}
                />
            ) : (
                <ImageIcon size={22} />
            )}
        </div>
    );
}

// Product form.
function ProductForm({
    product,
    categories,
    onClose,
    onSaved
}) {
    const editing = Boolean(product);

    const [form, setForm] = useState({
        name: product?.name ?? "",
        brand: product?.brand ?? "",
        categoryId: product?.category?.id ?? categories[0]?.id ?? "",
        price: product
            ? String(product.priceCents / 100)
            : "",
        stock: "0",
        imageUrl: product?.imageUrl ?? "",
        description: product?.description ?? "",
        specs: specsToText(product?.specs)
    });

    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [imageError, setImageError] = useState(false);

    const set = (key) => (event) => {
        const value = event.target.value;

        setForm((previous) => ({
            ...previous,
            [key]: value
        }));

        if (key === "imageUrl") {
            setImageError(false);
        }
    };

    const submit = async (event) => {
        event.preventDefault();

        setBusy(true);
        setError("");
        setFieldErrors({});

        const body = {
            categoryId: form.categoryId,
            name: form.name,
            brand: form.brand.trim() || undefined,
            description: form.description,
            priceCents: Math.round(Number(form.price) * 100),
            imageUrl: form.imageUrl.trim(),
            specs: textToSpecs(form.specs)
        };

        try {
            if (editing) {
                await adminApi.updateProduct(product.id, body);
            } else {
                await adminApi.createProduct({
                    ...body,
                    stock: Number(form.stock)
                });
            }

            onSaved();
            onClose();

        } catch (err) {
            if (err.status === 422 && Array.isArray(err.details)) {
                const map = {};

                for (const detail of err.details) {
                    if (!map[detail.field]) {
                        map[detail.field] = detail.message;
                    }
                }

                setFieldErrors(map);
            } else {
                setError(err.message);
            }
        } finally {
            setBusy(false);
        }
    };

    const fieldError = (name) =>
        fieldErrors[name] && (
            <small className="field-error">
                {fieldErrors[name]}
            </small>
        );

    return (
        <Modal
            title={editing ? "Edit product" : "New product"}
            onClose={onClose}
            wide
        >
            <form
                onSubmit={submit}
                noValidate
                className="modal-body"
                style={{ padding: 0 }}
            >
                {error && (
                    <div className="notice notice-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="form-grid">

                    {/* PRODUCT NAME */}
                    <label className="field full">
                        <span>Name</span>

                        <input
                            value={form.name}
                            onChange={set("name")}
                            aria-invalid={Boolean(fieldErrors.name)}
                            required
                        />

                        {fieldError("name")}
                    </label>

                    {/* BRAND */}
                    <label className="field">
                        <span>Brand</span>

                        <input
                            value={form.brand}
                            onChange={set("brand")}
                        />

                        {fieldError("brand")}
                    </label>

                    {/* CATEGORY */}
                    <label className="field">
                        <span>Category</span>

                        <select
                            value={form.categoryId}
                            onChange={set("categoryId")}
                            required
                        >
                            {categories.map((category) => (
                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        {fieldError("categoryId")}
                    </label>

                    {/* PRICE */}
                    <label className="field">
                        <span>Price (₱)</span>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price}
                            onChange={set("price")}
                            aria-invalid={Boolean(fieldErrors.priceCents)}
                            required
                        />

                        {fieldError("priceCents")}
                    </label>

                    {/* STOCK */}
                    {editing ? (
                        <div className="field">
                            <span>Stock</span>

                            <input
                                value={product.stock}
                                disabled
                            />

                            <small className="field-hint">
                                Change stock with the Stock button
                                so it is recorded.
                            </small>
                        </div>
                    ) : (
                        <label className="field">
                            <span>Starting stock</span>

                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={form.stock}
                                onChange={set("stock")}
                                aria-invalid={Boolean(fieldErrors.stock)}
                            />

                            {fieldError("stock")}
                        </label>
                    )}

                    {/* PRODUCT IMAGE URL */}
                    <label className="field full">
                        <span>Product Image URL (optional)</span>

                        <input
                            type="url"
                            value={form.imageUrl}
                            onChange={set("imageUrl")}
                            placeholder="https://example.com/product-image.jpg"
                            aria-invalid={Boolean(fieldErrors.imageUrl)}
                        />

                        {fieldError("imageUrl")}

                        <small className="field-hint">
                            Paste the image URL of the exact product model.
                        </small>

                        {/* IMAGE PREVIEW */}
                        <div className="admin-image-preview">

                            <span className="admin-preview-title">
                                Product Image Preview
                            </span>

                            {form.imageUrl.trim() ? (
                                !imageError ? (
                                    <img
                                        src={form.imageUrl}
                                        alt={`${form.name || "Product"} preview`}
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="admin-preview-error">
                                        <ImageIcon size={32} />

                                        <span>
                                            Image could not be loaded.
                                            Check your image URL.
                                        </span>
                                    </div>
                                )
                            ) : (
                                <div className="admin-preview-empty">
                                    <ImageIcon size={36} />

                                    <span>
                                        No product image added yet.
                                    </span>
                                </div>
                            )}

                        </div>
                    </label>

                    {/* DESCRIPTION */}
                    <label className="field full">
                        <span>Description</span>

                        <textarea
                            value={form.description}
                            onChange={set("description")}
                        />

                        {fieldError("description")}
                    </label>

                    {/* SPECIFICATIONS */}
                    <label className="field full">
                        <span>
                            Specifications (one per line, like "socket: AM5")
                        </span>

                        <textarea
                            value={form.specs}
                            onChange={set("specs")}
                            placeholder={
                                "socket: AM5\nramType: DDR5\ntdp: 65"
                            }
                        />

                        <small className="field-hint">
                            The compatibility checker reads these values,
                            so keep the names consistent.
                        </small>
                    </label>

                </div>

                {/* FORM ACTIONS */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        className="btn btn-primary"
                        disabled={busy}
                    >
                        {busy ? "Saving..." : "Save product"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// Stock adjustment modal.
function StockModal({ product, onClose, onSaved }) {
    const [current, setCurrent] = useState(product.stock);
    const [change, setChange] = useState("");
    const [reason, setReason] = useState("");
    const [history, setHistory] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const loadHistory = useCallback(
        () =>
            adminApi
                .stockMovements(product.id, {
                    page: 1,
                    limit: 5
                })
                .then((res) => setHistory(res.data))
                .catch(() => setHistory([])),
        [product.id]
    );

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const submit = async (event) => {
        event.preventDefault();

        setBusy(true);
        setError("");

        try {
            const res = await adminApi.adjustStock(product.id, {
                change: Number(change),
                reason
            });

            setCurrent(res.data.newStock);
            setChange("");
            setReason("");

            await loadHistory();
            onSaved();

        } catch (err) {
            setError(err.details?.[0]?.message ?? err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            title={`Stock: ${product.name}`}
            onClose={onClose}
        >
            <p>
                Current stock: <strong>{current}</strong>
            </p>

            <form
                onSubmit={submit}
                noValidate
                className="modal-body"
                style={{ padding: 0 }}
            >
                {error && (
                    <div className="notice notice-error" role="alert">
                        {error}
                    </div>
                )}

                <label className="field">
                    <span>
                        Change (use a minus sign to remove stock)
                    </span>

                    <input
                        type="number"
                        step="1"
                        value={change}
                        onChange={(e) => setChange(e.target.value)}
                        placeholder="+10 or -3"
                    />
                </label>

                <label className="field">
                    <span>Reason</span>

                    <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Restock from supplier, damaged unit, recount..."
                    />
                </label>

                <div className="form-actions">
                    <button
                        className="btn btn-primary"
                        disabled={
                            busy ||
                            !change ||
                            !reason.trim() ||
                            Number(change) === 0
                        }
                    >
                        {busy ? "Saving..." : "Record change"}
                    </button>
                </div>
            </form>

            <h3>Recent changes</h3>

            {history === null ? (
                <p className="hint">Loading...</p>
            ) : history.length === 0 ? (
                <p className="hint">
                    No changes recorded yet.
                </p>
            ) : (
                <ul className="history">
                    {history.map((movement) => (
                        <li key={movement.id}>
                            <span>
                                <strong>
                                    {movement.change > 0
                                        ? `+${movement.change}`
                                        : movement.change}
                                </strong>

                                {" "}({movement.previousStock} to {movement.newStock})
                                {" "}· {movement.reason}
                            </span>

                            <small>
                                {movement.actor} · {formatDateTime(movement.createdAt)}
                            </small>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

// Main Admin Products page.
export default function AdminProducts() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [status, setStatus] = useState("all");

    const [result, setResult] = useState({
        items: null,
        meta: null
    });

    const [categories, setCategories] = useState([]);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [modal, setModal] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const reload = () =>
        setReloadKey((key) => key + 1);

    const closeModal = useCallback(
        () => setModal(null),
        []
    );

    // Search delay.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(search.trim());
            setPage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    // Load categories.
    useEffect(() => {
        catalogApi.categories()
            .then((res) => setCategories(res.data))
            .catch(() => {});
    }, []);

    // Load products.
    useEffect(() => {
        let active = true;

        setError("");

        adminApi
            .products({
                page,
                limit: PAGE_SIZE,
                search: debounced,
                status,
                sort: "newest"
            })
            .then((res) => {
                if (active) {
                    setResult({
                        items: res.data,
                        meta: res.meta
                    });
                }
            })
            .catch((err) => {
                if (active) setError(err.message);
            });

        return () => {
            active = false;
        };
    }, [page, debounced, status, reloadKey]);

    // Hide or show product.
    const toggleActive = async (product) => {
        setActionError("");

        try {
            await adminApi.updateProduct(product.id, {
                isActive: !product.isActive
            });

            reload();
        } catch (err) {
            setActionError(err.message);
        }
    };

    // Delete product.
    const remove = async (product) => {
        if (
            !window.confirm(
                `Delete "${product.name}"? This cannot be undone.`
            )
        ) {
            return;
        }

        setActionError("");

        try {
            await adminApi.deleteProduct(product.id);
            reload();
        } catch (err) {
            setActionError(err.message);
        }
    };

    const { items, meta } = result;

    return (
        <>
            <header className="page-head">
                <h1>Products</h1>

                <p>
                    {meta
                        ? `${meta.total} products`
                        : "Loading products"}
                </p>
            </header>

            {/* TOOLBAR */}
            <div className="toolbar">

                <label className="search-field">
                    <Search size={18} aria-hidden="true" />

                    <input
                        type="search"
                        placeholder="Search name or brand"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search products"
                    />
                </label>

                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by status"
                >
                    <option value="all">All products</option>
                    <option value="active">Active</option>
                    <option value="inactive">Hidden</option>
                </select>

                <button
                    className="btn btn-primary spacer"
                    onClick={() =>
                        setModal({
                            type: "form",
                            product: null
                        })
                    }
                    disabled={categories.length === 0}
                >
                    <Plus size={18} />
                    New product
                </button>
            </div>

            {actionError && (
                <div className="notice notice-error" role="alert">
                    {actionError}
                </div>
            )}

            {/* PRODUCT TABLE */}
            {error ? (
                <div className="notice notice-error">
                    {error}
                </div>
            ) : !items ? (
                <div className="page-state">
                    Loading products...
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th className="num">Price</th>
                                <th className="num">Stock</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((product) => (
                                <tr key={product.id}>
                                    <td className="wrap">
                                        <div className="admin-product-info">

                                            <AdminProductThumbnail
                                                product={product}
                                            />

                                            <div>
                                                <strong>
                                                    {product.name}
                                                </strong>

                                                <span className="cell-sub">
                                                    {product.brand}
                                                </span>
                                            </div>

                                        </div>
                                    </td>

                                    <td>
                                        {product.category?.name}
                                    </td>

                                    <td className="num">
                                        {formatPrice(product.priceCents)}
                                    </td>

                                    <td className="num">
                                        {product.stock}
                                    </td>

                                    <td>
                                        <span
                                            className={`status ${
                                                product.isActive
                                                    ? "status-ok"
                                                    : "status-bad"
                                            }`}
                                        >
                                            {product.isActive
                                                ? "Active"
                                                : "Hidden"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="row-actions">

                                            <button
                                                className="icon-btn"
                                                title="Edit"
                                                aria-label={`Edit ${product.name}`}
                                                onClick={() =>
                                                    setModal({
                                                        type: "form",
                                                        product
                                                    })
                                                }
                                            >
                                                <Pencil size={17} />
                                            </button>

                                            <button
                                                className="icon-btn"
                                                title="Adjust stock"
                                                aria-label={`Adjust stock for ${product.name}`}
                                                onClick={() =>
                                                    setModal({
                                                        type: "stock",
                                                        product
                                                    })
                                                }
                                            >
                                                <Boxes size={17} />
                                            </button>

                                            <button
                                                className="icon-btn"
                                                title={
                                                    product.isActive
                                                        ? "Hide product"
                                                        : "Show product"
                                                }
                                                aria-label={
                                                    product.isActive
                                                        ? `Hide ${product.name}`
                                                        : `Show ${product.name}`
                                                }
                                                onClick={() =>
                                                    toggleActive(product)
                                                }
                                            >
                                                {product.isActive
                                                    ? <EyeOff size={17} />
                                                    : <Eye size={17} />}
                                            </button>

                                            <button
                                                className="icon-btn"
                                                title="Delete"
                                                aria-label={`Delete ${product.name}`}
                                                onClick={() => remove(product)}
                                            >
                                                <Trash2 size={17} />
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="wrap">
                                        No products match.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAGINATION */}
            {meta && meta.totalPages > 1 && (
                <nav
                    className="pagination"
                    aria-label="Pagination"
                >
                    <button
                        className="btn btn-ghost"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <ChevronLeft size={18} />
                        Previous
                    </button>

                    <span>
                        Page {meta.page} of {meta.totalPages}
                    </span>

                    <button
                        className="btn btn-ghost"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                </nav>
            )}

            {/* MODALS */}
            {modal?.type === "form" && (
                <ProductForm
                    product={modal.product}
                    categories={categories}
                    onClose={closeModal}
                    onSaved={reload}
                />
            )}

            {modal?.type === "stock" && (
                <StockModal
                    product={modal.product}
                    onClose={closeModal}
                    onSaved={reload}
                />
            )}
        </>
    );
}
