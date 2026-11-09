export default class AppError extends Error {
    constructor(statusCode, code, message, details = undefined) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }

    static badRequest(message = "Malformed request.", code = "BAD_REQUEST") {
        return new AppError(400, code, message);
    }
    static unauthorized(message = "Authentication required.", code = "UNAUTHENTICATED") {
        return new AppError(401, code, message);
    }
    static forbidden(message = "You do not have permission to do that.", code = "FORBIDDEN") {
        return new AppError(403, code, message);
    }
    static notFound(message = "Resource not found.", code = "NOT_FOUND") {
        return new AppError(404, code, message);
    }
    static conflict(message, code = "CONFLICT") {
        return new AppError(409, code, message);
    }
    static validation(details, message = "Validation failed.") {
        return new AppError(422, "VALIDATION_ERROR", message, details);
    }
}