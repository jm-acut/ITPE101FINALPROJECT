import AppError from "../../utils/AppError.js";
import MayaProvider from "./MayaProvider.js";
import PayMongoProvider from "./PayMongoProvider.js";

const notConfigured = (message) => new AppError(503, "PAYMENT_NOT_CONFIGURED", message);

// FACTORY METHOD. The caller asks for a provider by name and receives an object that follows the
// PaymentProvider contract. The caller never imports MayaProvider or PayMongoProvider.
// To add a gateway: write one subclass and add one entry here.
const builders = {
    maya: ({ maya = {} }) => {
        if (!maya.publicKey || !maya.secretKey) throw notConfigured("Maya is not configured on this server.");
        return new MayaProvider(maya);
    },
    paymongo: ({ paymongo = {} }) => {
        if (!paymongo.secretKey) throw notConfigured("PayMongo is not configured on this server.");
        return new PayMongoProvider(paymongo);
    }
};

export const PROVIDER_NAMES = Object.keys(builders);

export function createPaymentProvider(kind, settings = {}) {
    const build = builders[kind];
    if (!build) throw notConfigured(`Unknown payment provider "${kind}".`);
    return build(settings);
}