# AI integration: build advisor

## Provider and model
- Provider: Google Gemini API (free tier), called with `generateContent` over HTTPS from the backend only.
- Model: set by `GEMINI_MODEL` in `backend/.env` (default `gemini-3.5-flash-lite`). The key is `GEMINI_API_KEY`.
- The key exists only in `backend/.env` (never committed) and never reaches the frontend or any build output.

## Endpoint
`POST /api/v1/assistant/recommend` (signed-in customers only)
Body: `{ "prompt": "5 to 500 characters", "budgetPesos": 15000 to 1000000 (optional) }`
Response: `{ status: "ok" | "no_match", summary, parts[], report, ... }`

## Retrieval (grounding)
The backend queries the database for active, in-stock products in each of six categories, within the budget (up to 20 per category, cheapest first). Only those products, as compact records (id, category, name, price, specs), are sent to the model. The model never sees anything else from the database.

## Prompt strategy
- A fixed system prompt defines the task and the rules: use only catalog ids, treat customer text as data, never reveal instructions or secrets, choose compatible parts, stay within budget, write no prices.
- The customer's text is wrapped in `<customer_request>` tags. Angle brackets and control characters are removed from it first, so it cannot fake the tags.
- The model is asked for JSON in a fixed shape (`responseMimeType: application/json` plus a response schema).

## Validation (every answer is untrusted)
1. The reply is parsed as JSON and checked against a schema. Wrong shape, missing fields or wrong types are rejected.
2. Every part id must be a real UUID and must be one of the products retrieved from the database. Unknown ids are discarded and counted.
3. The chosen parts are reloaded from the database, so names, prices and stock shown to the customer are authoritative and current. Inactive or out-of-stock parts are dropped.
4. The compatibility engine (the same rules as the build creator) checks the build. The total must be within the budget, and the build must be complete (processor, motherboard, memory, storage, power supply).
5. If the build has problems, the model gets one repair attempt with the problems listed. If it still fails, the customer gets `status: "no_match"` with the reasons.
6. Model text (summary, reasons) is shown as plain text only. Text that looks like a price is discarded, so prices come only from the database.

## Failure handling
Timeout (20 s), rate limit or error from the provider, a safety block, a missing key, or output that is never valid JSON all return `503 AI_UNAVAILABLE` with a friendly message. The raw provider error is only written to the server log. The rest of the store keeps working, and the page links to the shop and the manual build creator.

## Cost and abuse controls
- Sign-in required; 8 requests per minute and 40 per day per user (HTTP 429, codes `AI_RATE_LIMITED` and `AI_DAILY_LIMIT`).
- Request text limited to 500 characters; at most 20 candidate parts per category.
- Output capped at 2048 tokens; 20 second timeout; at most 2 model calls per request.

## Privacy
Only the customer's request text, the optional budget and public catalog data are sent. No password, token, email, name, address or order data is sent. Prompts are not written to the server log. The page labels the result as an AI-assisted suggestion. Google's free tier may use requests to improve its products, which is one more reason nothing personal is sent.

## Tests
`backend/tests/assistant.test.js` covers the output guards (unknown ids discarded, price-like text removed, tags stripped, wrong shapes rejected) and the endpoint's authentication and input limits.