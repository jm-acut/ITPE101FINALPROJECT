
import { useEffect, useState } from "react";
import {
    DEFAULT_CATEGORY_IMAGES,
    categoryIcon
} from "../utils.js";

export default function ProductImage({
    product,
    className = "product-media"
}) {
    const primaryImage = product?.imageUrl?.trim() || "";
    const fallbackImage =
        DEFAULT_CATEGORY_IMAGES[product?.category?.slug] || "";

    const [imageUrl, setImageUrl] = useState(
        primaryImage || fallbackImage
    );
    const [usingFallback, setUsingFallback] = useState(!primaryImage);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setImageUrl(primaryImage || fallbackImage);
        setUsingFallback(!primaryImage);
        setFailed(false);
    }, [product?.id, primaryImage, fallbackImage]);

    const Icon = categoryIcon(product?.category?.slug);

    const handleImageError = () => {
        if (
            !usingFallback &&
            fallbackImage &&
            fallbackImage !== imageUrl
        ) {
            setImageUrl(fallbackImage);
            setUsingFallback(true);
        } else {
            setFailed(true);
        }
    };

    return (
        <div className={className}>
            {!failed && imageUrl ? (
                <img
                    src={imageUrl}
                    alt={product?.name || "Product image"}
                    loading="lazy"
                    onError={handleImageError}
                />
            ) : (
                <Icon
                    size={className === "detail-media" ? 88 : 44}
                    strokeWidth={1.5}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
