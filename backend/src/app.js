import express from "express";
import cors from "cors";
import helmet from "helmet";
import env from "./config/env.js";
import requestId from "./middleware/requestId.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import AppError from "./utils/AppError.js";
import routes from "./routes/index.js";
import webhookRoutes from "./routes/webhookRoutes.js";

// The app is exported without listening, so tests can call it directly.
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);
app.use(helmet());

app.use(
    cors({
        origin(origin, callback) {
            // No Origin header = Postman, curl, webhooks. Browsers always send one.
            if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
            callback(new AppError(403, "CORS_BLOCKED", "This origin is not allowed."));
        }
    })
);

// Webhooks need the RAW body, so they are mounted BEFORE express.json().
app.use("/api/v1/webhooks", webhookRoutes);

app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
    res.json({ success: true, data: { name: "NEXUS PC API", version: "v1" } });
});

app.use("/api/v1", apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;