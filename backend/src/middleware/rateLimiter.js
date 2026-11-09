import rateLimit from "express-rate-limit";
import env from "../config/env.js";

function build({ windowMs, limit, code, message }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip: () => env.isTest,
        handler: (req, res) =>
            res.status(429).json({
                success: false,
                error: { code, message },
                requestId: req.id
            })
    });
}

export const apiLimiter = build({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    code: "RATE_LIMITED",
    message: "Too many requests. Please slow down."
});

export const authLimiter = build({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    code: "AUTH_RATE_LIMITED",
    message: "Too many sign-in attempts. Try again in a few minutes."
});

// Used later for the AI feature
export const aiLimiter = build({
    windowMs: 60 * 1000,
    limit: 8,
    code: "AI_RATE_LIMITED",
    message: "You are asking the assistant too quickly. Wait a moment."
});