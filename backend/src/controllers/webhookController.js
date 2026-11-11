import AppError from "../utils/AppError.js";
import { getPaymentProvider } from "../patterns/payment/paymentFactory.js";
import { paymentService } from "../services/paymentService.js";

export const webhookController = {
    async maya(req, res) {
        // express.raw() keeps the body as a Buffer, exactly as it arrived.
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            throw AppError.badRequest("Empty webhook body.", "EMPTY_BODY");
        }

        const provider = getPaymentProvider();
        const event = provider.parseWebhook(req.body, req.headers); // throws 401 on a bad signature or old timestamp
        const outcome = await paymentService.handleEvent(event);

        // Always a 2xx answer for events we understood or chose to ignore, so the gateway does not retry them.
        res.status(200).json({ received: true, outcome });
    }
};