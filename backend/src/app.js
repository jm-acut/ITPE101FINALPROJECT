import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import env from "./config/env.js";
import requestId from "./middleware/requestId.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import AppError from "./utils/AppError.js";
import routes from "./routes/index.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { buildSpec } from "./docs/openapi.js";

// The app is exported without listening, so tests can call it directly.
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);

// Live API documentation. It is mounted BEFORE the strict helmet() below because Swagger UI needs inline scripts.
const spec = buildSpec();
app.get("/api-docs.json", (req, res) => res.json(spec));
app.use(
    "/api-docs",
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(spec, { customSiteTitle: "NEXUS PC API", swaggerOptions: { persistAuthorization: true } })
);

app.use(helmet());

app.use(
    cors((req, callback) => {
        const origin = req.get("origin");
        // Requests from this server's own pages (for example Swagger UI "Try it out") are same-origin and always allowed.
        const sameOrigin = origin && origin === `${req.protocol}://${req.get("host")}`;
        // No Origin header = Postman, curl, webhooks. Browsers always send one.
        if (!origin || sameOrigin || env.allowedOrigins.includes(origin)) return callback(null, { origin: true });
        callback(new AppError(403, "CORS_BLOCKED", "This origin is not allowed."));
    })
);

// Webhooks need the RAW body, so they are mounted BEFORE express.json().
app.use("/api/v1/webhooks", webhookRoutes);

app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
    res.json({ success: true, data: { name: "NEXUS PC API", version: "v1", docs: "/api-docs" } });
});

app.use("/api/v1", apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;