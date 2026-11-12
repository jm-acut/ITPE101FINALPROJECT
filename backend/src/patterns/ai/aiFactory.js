import env from "../../config/env.js";
import AppError from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import GeminiClient from "./GeminiClient.js";

let instance = null;

// Factory: the rest of the app asks for "the AI client". The key never leaves this backend.
export function getGeminiClient() {
    if (!env.GEMINI_API_KEY) {
        logger.warn("GEMINI_API_KEY is missing in backend/.env");
        throw new AppError(503, "AI_UNAVAILABLE", "The assistant is not available right now. You can still browse the shop or use the Build PC page.");
    }
    instance ??= new GeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
    return instance;
}