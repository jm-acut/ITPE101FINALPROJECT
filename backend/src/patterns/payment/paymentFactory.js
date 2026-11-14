import env from "../../config/env.js";
import { createPaymentProvider } from "./createPaymentProvider.js";

let instance = null;

// Reads the configuration once and keeps ONE provider for the whole process (a Singleton on top of the Factory Method).
// Which gateway is used is a setting (PAYMENT_PROVIDER in backend/.env), not an if-statement in the services.
export function getPaymentProvider() {
    if (instance) return instance;

    // Tests sign Maya webhooks with their own key pair. This is ignored outside NODE_ENV=test.
    const testKey = env.isTest ? process.env.TEST_WEBHOOK_PUBLIC_KEY : undefined;

    instance = createPaymentProvider(env.PAYMENT_PROVIDER, {
        maya: {
            publicKey: env.MAYA_PUBLIC_KEY,
            secretKey: env.MAYA_SECRET_KEY,
            baseUrl: env.MAYA_BASE_URL,
            ...(testKey ? { webhookPublicKeys: [testKey] } : {})
        },
        paymongo: { secretKey: env.PAYMONGO_SECRET_KEY, webhookSecret: env.PAYMONGO_WEBHOOK_SECRET }
    });
    return instance;
}