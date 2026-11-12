import AppError from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 20_000; // cost and abuse control: never wait longer than this
const MAX_OUTPUT_TOKENS = 2048; // cost control: the answer is capped

// The customer only ever sees this message. Provider details go to the server log, never to the client.
const unavailable = () =>
    new AppError(503, "AI_UNAVAILABLE", "The assistant is not available right now. You can still browse the shop or use the Build PC page.");

export default class GeminiClient {
    #apiKey;
    #model;

    constructor({ apiKey, model }) {
        this.#apiKey = apiKey;
        this.#model = model;
    }

    get modelName() {
        return this.#model;
    }

    async #send(system, user, schema) {
        try {
            const response = await fetch(`${BASE_URL}/models/${encodeURIComponent(this.#model)}:generateContent`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": this.#apiKey },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents: [{ role: "user", parts: [{ text: user }] }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: MAX_OUTPUT_TOKENS,
                        responseMimeType: "application/json",
                        ...(schema ? { responseJsonSchema: schema } : {})
                    }
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS)
            });
            const body = await response.json().catch(() => null);
            return { ok: response.ok, status: response.status, body };
        } catch (error) {
            logger.warn("Gemini request failed", error.name === "TimeoutError" ? "timeout" : error.message);
            throw unavailable();
        }
    }

    // Returns { data } where data is the parsed JSON, or null if the model's text was not valid JSON.
    // Provider problems (timeout, 429, 5xx, safety block) become a controlled 503 AI_UNAVAILABLE.
    async generateJson({ system, user, schema }) {
        let result = await this.#send(system, user, schema);

        // Some models reject the schema field. Retry once without it. The answer is validated anyway.
        if (!result.ok && result.status === 400) {
            logger.warn("Gemini rejected the request; retrying without a response schema", String(result.body?.error?.message ?? ""));
            result = await this.#send(system, user, null);
        }

        if (!result.ok) {
            logger.warn(`Gemini error ${result.status}`, String(result.body?.error?.message ?? ""));
            throw unavailable();
        }

        const candidate = result.body?.candidates?.[0];
        if (!candidate || (candidate.finishReason && candidate.finishReason !== "STOP")) {
            logger.warn("Gemini returned no usable answer", String(candidate?.finishReason ?? result.body?.promptFeedback?.blockReason ?? "empty"));
            throw unavailable();
        }

        const text = (candidate.content?.parts ?? []).map((part) => part.text ?? "").join("").trim();
        try {
            return { data: JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) };
        } catch {
            return { data: null };
        }
    }
}