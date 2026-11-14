import env from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getPaymentProvider } from "../patterns/payment/paymentFactory.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import { orderService } from "./orderService.js";
import PaymentService from "./PaymentService.class.js";

// The production wiring. Tests build PaymentService with fakes instead (tests/paymentService.test.js).
export const paymentService = new PaymentService({
    getProvider: getPaymentProvider,
    payments: paymentRepository,
    orders: orderRepository,
    orderService,
    clientBaseUrl: () => env.allowedOrigins[0],
    logger
});