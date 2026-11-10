import app from "./src/app.js";
import env from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";

app.listen(env.PORT, (error) => {
    if (error) {
        logger.error(`Could not start on port ${env.PORT}. Is another server already running?`, error.message);
        process.exit(1);
    }
    logger.info(`NEXUS PC API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});