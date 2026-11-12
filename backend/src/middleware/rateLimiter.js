import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import env from "../config/env.js";

function build({ windowMs, limit, code, message, keyGenerator }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip: () => env.isTest,
        ...(keyGenerator ? { keyGenerator } : {}),
        handler: (req, res) =>
            res.status(429).json({
                success: false,
                error: { code, message },
                requestId: req.id
            })
    });
}

// Signed-in users are counted by account. Anyone else falls back to their IP address.
const perUser = (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip));

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

// AI: 8 requests per minute and 40 per day, per signed-in user.
export const aiLimiter = build({
    windowMs: 60 * 1000,
    limit: 8,
    code: "AI_RATE_LIMITED",
    message: "You are asking the assistant too quickly. Wait a moment and try again.",
    keyGenerator: perUser
});

export const aiDailyLimiter = build({
    windowMs: 24 * 60 * 60 * 1000,
    limit: 40,
    code: "AI_DAILY_LIMIT",
    message: "You have reached today's limit for the assistant. Try again tomorrow.",
    keyGenerator: perUser
});