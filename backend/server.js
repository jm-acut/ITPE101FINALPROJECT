import app from "./src/app.js";
import env from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";
import { orderService } from "./src/services/orderService.js";
import { paymentService } from "./src/services/paymentService.js";

const SWEEP_MS = 60_000;

// Every minute, in this order:
// 1) recover paid orders whose webhook never arrived, 2) expire unpaid orders (returning stock),
// 3) close the unused payment sessions of cancelled or expired orders.
async function sweep() {
    try {
        const recovered = await paymentService.reconcilePending();
        if (recovered > 0) logger.info(`Recovered ${recovered} paid order(s) without a webhook.`);

        const expired = await orderService.expireStale();
        if (expired > 0) logger.info(`Expired ${expired} unpaid order(s) and released their stock.`);

        const closed = await paymentService.cleanupDeadSessions();
        if (closed > 0) logger.info(`Closed ${closed} unused payment session(s).`);
    } catch (error) {
        logger.error("Background sweep failed", error.message);
    }
}

app.listen(env.PORT, (error) => {
    if (error) {
        logger.error(`Could not start on port ${env.PORT}. Is another server already running?`, error.message);
        process.exit(1);
    }
    logger.info(`NEXUS PC API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);

    sweep();
    setInterval(sweep, SWEEP_MS).unref();
});