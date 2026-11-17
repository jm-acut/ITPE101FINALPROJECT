# Security review

## Requirement checklist
| # | Requirement | How it is met | Evidence |
|---|---|---|---|
| S-01 | Passwords hashed, never stored or logged in plain text | bcrypt with 12 rounds; the hash is never returned; passwords are never passed to the logger | `services/authService.js`; test "registers a customer..." checks no password in the response |
| S-02 | Short-lived tokens, secret in the environment | JWT HS256 expiring in 2 hours; only the HS256 algorithm is accepted; secret comes from `JWT_SECRET` (at least 32 characters, checked at startup) | `middleware/auth.js`, `config/env.js`; `security.test.js` (wrong secret, alg none); `api.test.js` (tampered, expired) |
| S-03 | Roles enforced by middleware on every protected route | `authenticate` plus `authorize("admin")` once for the whole admin router; cart, orders, builds and assistant routes require a token and only touch the caller's own data | `routes/adminRoutes.js`; `auth-roles.int.test.js` (14 admin routes: 401 without a token, 403 for a customer) |
| S-04 | Every write endpoint validates input | Zod schemas run in `validate()` before the controller; unknown fields are stripped; list sorting accepts a fixed set of values | `validators/*`; Postman invalid-input requests; OpenAPI documents 422 on every body or parameter |
| S-05 | Parameterized database access; operator injection blocked | The Supabase client and SQL functions use parameters, never string-built SQL; search text is stripped of filter characters; email must be a string | `repositories/*`, `backend/sql/*`; test "blocks an operator-injection login" |
| S-06 | Secrets only in `.env` or hosting settings; `.env` ignored; `.env.example` has no values | `.gitignore` lists `.env` and `.env.*` (except the example); hosting variables are set in Render and Vercel | `git ls-files` lists only `.env.example` files |
| S-07 | Webhooks verified with the raw body | The route is mounted before the JSON parser with `express.raw`; the provider verifies the signature and a 5-minute timestamp; invalid requests get 401 | `routes/webhookRoutes.js`, `mayaSignature.js`; `payments.int.test.js`, `paymentProviders.test.js` |
| S-08 | Amount, currency and status verified before paid | `mark_order_paid` compares amount and currency with the order; the retrieve and scheduled paths ask the gateway | `backend/sql/004_payment_functions.sql`; test "flags a payment with the wrong amount..." |
| S-09 | CORS allows only the frontend and local origins | Allow-list from `CLIENT_URL`; production refuses non-HTTPS origins | `app.js`, `config/env.js`; `security.test.js` |
| S-10 | Security headers and rate limiting | `helmet()` on every route except the docs page; limits on all API routes (600 per 15 minutes), sign-in (30 per 15 minutes), and the AI advisor (8 per minute, 40 per day per user) | `app.js`, `middleware/rateLimiter.js`; `security.test.js` (headers). Rate limiting is switched off in tests |
| S-11 | No stack traces, SQL, paths or secrets in errors | One error handler returns a fixed shape with a request id; details go to the server log | `middleware/errorHandler.js`; `security.test.js`; `ai.int.test.js` |
| S-12 | AI key backend-only; AI output untrusted | The key is read only on the server; output is parsed against a schema, ids are checked against the database, price-like text is dropped, text is shown as plain text | `patterns/ai/*`, `docs/ai-integration.md`; `assistant.test.js` |
| S-13 | Dependencies audited | `npm audit` run on both projects (results below) | Below |
| S-14 | HTTPS in the deployed app | Render and Vercel both serve HTTPS; production refuses non-HTTPS origins | Live checks below |

## Dependency audit (S-13)
Date: (date)
- backend: `npm audit` result: (paste the summary line, for example "found 0 vulnerabilities")
- backend, production only: `npm audit --omit=dev`: (paste)
- frontend: `npm audit`: (paste)
Findings left open and why: (write each, or "none")

## Live deployment checks (S-14)
Date: (date). API: (url). Site: (url).
- HTTPS padlock on both: (yes)
- `curl.exe -I <api>/api/v1/health` shows `strict-transport-security`: (yes)
- A request with `Origin: https://evil.example` is answered 403 `CORS_BLOCKED`: (yes)
- Swagger UI loads at `<api>/api-docs`: (yes)
- Demo admin password changed on the live database: (yes)

## Known limitations
- The login token is stored in the browser's local storage. A script injected into the page could read it; an httpOnly cookie would be safer.
- Rate limits are held in server memory: they reset on restart and are not shared between servers.
- The Maya sandbox keys are public and shared, so sandbox payment data is not private.
- There is no email verification or password reset.