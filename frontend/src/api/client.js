import axios from "axios";

const TOKEN_KEY = "nexus_token";

// localStorage keeps the demo simple. A production site would prefer an httpOnly cookie.
export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (token) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY)
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
    timeout: 10000
});

api.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Every failed request becomes an ApiError with the same shape.
export class ApiError extends Error {
    constructor({ status, code, message, details }) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);

        const body = error.response?.data;
        const apiError = new ApiError({
            status: error.response?.status ?? 0,
            code: body?.error?.code ?? (error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR"),
            message: body?.error?.message ?? "Can't reach the server. Check your connection and try again.",
            details: body?.error?.details
        });

        // Expired or invalid session: drop the token and tell the app.
        const sessionDead = apiError.status === 401 && ["TOKEN_EXPIRED", "INVALID_TOKEN"].includes(apiError.code);
        if (sessionDead) {
            tokenStore.clear();
            window.dispatchEvent(new Event("auth:expired"));
        }
        return Promise.reject(apiError);
    }
);

export const isAbort = (error) => axios.isCancel(error);

const unwrap = (response) => response.data; // { success, data, meta }

const clean = (params) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));

export const authApi = {
    register: (body) => api.post("/auth/register", body).then(unwrap),
    login: (body) => api.post("/auth/login", body).then(unwrap),
    me: () => api.get("/auth/me").then(unwrap)
};

export const catalogApi = {
    categories: (signal) => api.get("/categories", { signal }).then(unwrap),
    products: (params, signal) => api.get("/products", { params: clean(params), signal }).then(unwrap),
    product: (id, signal) => api.get(`/products/${id}`, { signal }).then(unwrap)
};

export const cartApi = {
    get: () => api.get("/cart").then(unwrap),
    add: (body) => api.post("/cart/items", body).then(unwrap),
    setQuantity: (productId, quantity) => api.patch(`/cart/items/${productId}`, { quantity }).then(unwrap),
    remove: (productId) => api.delete(`/cart/items/${productId}`).then(unwrap),
    clear: () => api.delete("/cart").then(unwrap)
};

export default api;