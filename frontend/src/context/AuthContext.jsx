import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, tokenStore } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // true while we check a saved token on first load
    const [loading, setLoading] = useState(Boolean(tokenStore.get()));

    useEffect(() => {
        if (!tokenStore.get()) return undefined;
        let active = true;

        authApi
            .me()
            .then((res) => active && setUser(res.data.user))
            .catch(() => tokenStore.clear())
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const onExpired = () => setUser(null);
        window.addEventListener("auth:expired", onExpired);
        return () => window.removeEventListener("auth:expired", onExpired);
    }, []);

    const login = useCallback(async (credentials) => {
        const res = await authApi.login(credentials);
        tokenStore.set(res.data.token);
        setUser(res.data.user);
        return res.data.user;
    }, []);

    const register = useCallback(async (details) => {
        const res = await authApi.register(details);
        tokenStore.set(res.data.token);
        setUser(res.data.user);
        return res.data.user;
    }, []);

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, isAdmin: user?.role === "admin", login, register, logout }),
        [user, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
    return context;
}