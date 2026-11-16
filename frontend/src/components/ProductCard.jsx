
import { Link } from "react-router-dom";

import {
    formatPrice,
    specChips,
    stockStatus
} from "../utils.js";

import ProductImage from "./ProductImage.jsx";

export default function ProductCard({ product }) {
    const status = stockStatus(product.stock);

    return (
        <Link
            to={`/products/${product.id}`}
            className="product-card"
        >
            <ProductImage
                product={product}
                className="product-media"
            />

            <div className="product-body">
                <p className="product-meta">
                    {product.brand ?? product.category?.name}
                </p>

                <h3>{product.name}</h3>

                <ul className="chip-row">
                    {specChips(product.specs).map((chip) => (
                        <li key={chip} className="chip">
                            {chip}
                        </li>
                    ))}
                </ul>

                <div className="product-foot">
                    <strong className="price">
                        {formatPrice(product.priceCents)}
                    </strong>

                    <span className={`stock stock-${status.tone}`}>
                        {status.label}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export function ProductCardSkeleton() {
    return (
        <div
            className="product-card is-skeleton"
            aria-hidden="true"
        >
            <div className="product-media" />

            <div className="product-body">
                <span className="sk sk-short" />
                <span className="sk sk-long" />
                <span className="sk sk-mid" />
            </div>
        </div>
    );
}
