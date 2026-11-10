import app from "./src/app.js";
import env from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";
import { orderService } from "./src/services/orderService.js";

const EXPIRY_SWEEP_MS = 60_000;

async function sweepExpiredOrders() {
    try {
        const count = await orderService.expireStale();
        if (count > 0) logger.info(`Expired ${count} unpaid order(s) and released their stock.`);
    } catch (error) {
        logger.error("Expiry sweep failed", error.message);
    }
}

app.listen(env.PORT, (error) => {
    if (error) {
        logger.error(`Could not start on port ${env.PORT}. Is another server already running?`, error.message);
        process.exit(1);
    }
    logger.info(`NEXUS PC API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);

    sweepExpiredOrders();
    setInterval(sweepExpiredOrders, EXPIRY_SWEEP_MS).unref();
});