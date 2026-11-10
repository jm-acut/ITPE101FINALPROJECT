import AppError from "../utils/AppError.js";
import { cartRepository } from "../repositories/cartRepository.js";
import { productRepository } from "../repositories/productRepository.js";

const MAX_QTY = 99;

// Price, name and stock always come from the database, never from the browser.
function toCartDto(rows) {
    const items = rows
        .filter((row) => row.product)
        .map((row) => {
            const p = row.product;
            let issue = null;
            if (!p.is_active) issue = "UNAVAILABLE";
            else if (p.stock === 0) issue = "OUT_OF_STOCK";
            else if (p.stock < row.quantity) issue = "INSUFFICIENT_STOCK";

            return {
                productId: p.id,
                name: p.name,
                brand: p.brand,
                imageUrl: p.image_url,
                categorySlug: p.category?.slug ?? null,
                unitPriceCents: p.price_cents,
                quantity: row.quantity,
                lineTotalCents: p.price_cents * row.quantity,
                stock: p.stock,
                issue
            };
        });

    return {
        items,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        subtotalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
        hasIssues: items.some((i) => i.issue)
    };
}

const buildCart = async (cart) => toCartDto(await cartRepository.getItems(cart.id));

async function requireSellable(productId) {
    const product = await productRepository.findById(productId);
    if (!product || !product.is_active) {
        throw AppError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
    }
    return product;
}

// A friendly early check. The authoritative stock check happens again at checkout.
function assertStock(product, quantity) {
    if (quantity > product.stock) {
        throw AppError.conflict(
            product.stock === 0 ? "This product is out of stock." : `Only ${product.stock} left in stock.`,
            "INSUFFICIENT_STOCK"
        );
    }
}

export const cartService = {
    async get(userId) {
        return buildCart(await cartRepository.getOrCreate(userId));
    },

    async addItem(userId, { productId, quantity }) {
        const cart = await cartRepository.getOrCreate(userId);
        const product = await requireSellable(productId);
        const existing = await cartRepository.findItem(cart.id, productId);
        const newQuantity = (existing?.quantity ?? 0) + quantity;

        if (newQuantity > MAX_QTY) {
            throw AppError.conflict("You can buy at most 99 of one item.", "QUANTITY_LIMIT");
        }
        assertStock(product, newQuantity);

        await cartRepository.setItem(cart.id, productId, newQuantity);
        return buildCart(cart);
    },

    async setQuantity(userId, productId, quantity) {
        const cart = await cartRepository.getOrCreate(userId);
        if (!(await cartRepository.findItem(cart.id, productId))) {
            throw AppError.notFound("That item is not in your cart.", "CART_ITEM_NOT_FOUND");
        }
        assertStock(await requireSellable(productId), quantity);

        await cartRepository.setItem(cart.id, productId, quantity);
        return buildCart(cart);
    },

    async removeItem(userId, productId) {
        const cart = await cartRepository.getOrCreate(userId);
        await cartRepository.removeItem(cart.id, productId);
        return buildCart(cart);
    },

    async clear(userId) {
        const cart = await cartRepository.getOrCreate(userId);
        await cartRepository.clear(cart.id);
        return buildCart(cart);
    }
};