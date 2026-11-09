import jwt from "jsonwebtoken";
import env from "../config/env.js";
import AppError from "../utils/AppError.js";

export function authenticate(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return next(AppError.unauthorized("Missing or malformed Authorization header."));
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch (error) {
        const expired = error.name === "TokenExpiredError";
        next(
            AppError.unauthorized(
                expired ? "Session expired. Please sign in again." : "Invalid token.",
                expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
            )
        );
    }
}

// authorize("admin") returns 403 for every other role. Enforced on the server.
export const authorize = (...roles) => (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
};