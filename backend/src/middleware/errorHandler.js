import AppError from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req, res, next) {
    next(AppError.notFound(`Route ${req.method} ${req.path} not found.`, "ROUTE_NOT_FOUND"));
}

// Stack traces and SQL go to the server log only, never to the client.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    if (err?.type === "entity.parse.failed") {
        err = AppError.badRequest("Request body is not valid JSON.", "INVALID_JSON");
    } else if (err?.type === "entity.too.large") {
        err = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(err.details ? { details: err.details } : {})
            },
            requestId: req.id
        });
    }

    logger.error(`Unhandled error on ${req.method} ${req.originalUrl} [${req.id}]`, err);

    return res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." },
        requestId: req.id
    });
}