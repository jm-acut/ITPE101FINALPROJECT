import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartApi } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const EMPTY_CART = { items: [], itemCount: 0, subtotalCents: 0, hasIssues: false };

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const userId = user?.id;
    const [cart, setCart] = useState(EMPTY_CART);
    const [loading, setLoading] = useState(false);

    // Load the cart from the server whenever the signed-in user changes.
    useEffect(() => {
        if (!userId) {
            setCart(EMPTY_CART);
            return undefined;
        }
        let active = true;
        setLoading(true);

        cartApi
            .get()
            .then((res) => active && setCart(res.data))
            .catch(() => {})
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, [userId]);

    // Every action returns the full updated cart from the server, so the screen always matches the database.
    const run = useCallback(async (request) => {
        const res = await request();
        setCart(res.data);
        return res.data;
    }, []);

    const value = useMemo(
        () => ({
            cart,
            loading,
            addItem: (productId, quantity = 1) => run(() => cartApi.add({ productId, quantity })),
            setQuantity: (productId, quantity) => run(() => cartApi.setQuantity(productId, quantity)),
            removeItem: (productId) => run(() => cartApi.remove(productId)),
            clearCart: () => run(() => cartApi.clear())
        }),
        [cart, loading, run]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used inside <CartProvider>");
    return context;
}