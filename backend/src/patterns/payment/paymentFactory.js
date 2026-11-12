import env from "../../config/env.js";
import AppError from "../../utils/AppError.js";
import MayaProvider from "./MayaProvider.js";

let instance = null;

// Factory: the app asks for "the payment provider". To add another gateway later, change only this file.
export function getPaymentProvider() {
    if (!env.MAYA_PUBLIC_KEY || !env.MAYA_SECRET_KEY) {
        throw new AppError(503, "PAYMENT_NOT_CONFIGURED", "Online payment is not configured on this server.");
    }

    // Tests sign webhooks with their own key pair. This is ignored outside NODE_ENV=test.
    const testKey = env.isTest ? process.env.TEST_WEBHOOK_PUBLIC_KEY : undefined;

    instance ??= new MayaProvider({
        publicKey: env.MAYA_PUBLIC_KEY,
        secretKey: env.MAYA_SECRET_KEY,
        baseUrl: env.MAYA_BASE_URL,
        ...(testKey ? { webhookPublicKeys: [testKey] } : {})
    });
    return instance;
}