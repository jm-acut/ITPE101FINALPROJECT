import AppError from "../utils/AppError.js";

// validate({ body, query, params }) using Zod schemas.
// Results go on req.validated (Express 5 makes req.query read-only).
export default function validate(schemas) {
    return (req, res, next) => {
        const details = [];
        req.validated = {};

        for (const part of ["params", "query", "body"]) {
            if (!schemas[part]) continue;

            const result = schemas[part].safeParse(req[part] ?? {});
            if (result.success) {
                req.validated[part] = result.data;
            } else {
                for (const issue of result.error.issues) {
                    details.push({
                        in: part,
                        field: issue.path.join(".") || part,
                        message: issue.message
                    });
                }
            }
        }

        if (details.length > 0) return next(AppError.validation(details));
        next();
    };
}