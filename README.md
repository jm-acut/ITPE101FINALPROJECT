# NEXUS PC

An online store for PC components with a server-side compatibility checker, a build creator, Maya sandbox payments, and an AI build advisor.

**Stack:** React (Vite) · Node.js and Express 5 · Supabase (PostgreSQL) · Maya Checkout (sandbox) · Google Gemini

**Live site:** (frontend URL, added after deployment) · **Live API:** (API URL, added after deployment) · **API docs:** (API URL)/api-docs

## What it does
- Catalog with search, filters, sorting and pagination; server-side cart; checkout with coupons and shipping rules.
- Stock is reserved when an order is placed, so two buyers cannot get the last item. Unpaid orders expire after 15 minutes.
- Payments through Maya Checkout with signed webhooks, duplicate protection, and recovery when a webhook is missed.
- Admin area: dashboard, products, audited stock changes, orders, coupons.
- **Differentiators:** PC compatibility checker, build creator (save, share, add to cart), AI build advisor.

## Prerequisites
- Node.js 20 or newer and npm
- A free Supabase project (database)
- Optional: a free Gemini API key (AI advisor). The Maya sandbox keys are public in Maya's developer documentation.

## Installation
```
git clone <repository-url>
cd <project-folder>
cd backend && npm install
cd ../frontend && npm install
```

## Environment variables
Copy each `.env.example` to `.env` and fill it in. Never commit a real `.env`.

| File | Variable | Purpose |
|---|---|---|
| backend | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database access (the secret key stays on the server) |
| backend | `JWT_SECRET`, `JWT_EXPIRES_IN` | Signs login tokens (secret at least 32 characters) |
| backend | `CLIENT_URL` | Allowed browser origins. The first one is the payment return address |
| backend | `PAYMENT_PROVIDER` | `maya` (default) or `paymongo` |
| backend | `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY`, `MAYA_BASE_URL` | Maya sandbox |
| backend | `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` | Only for `paymongo` |
| backend | `GEMINI_API_KEY`, `GEMINI_MODEL` | AI advisor |
| backend | `PORT`, `NODE_ENV` | Server settings |
| frontend | `VITE_API_BASE_URL` | Where the API lives |

## Database setup
1. In Supabase, open **SQL Editor** and run these files from `backend/sql` **in order**: `001_schema.sql`, `002_checkout_functions.sql`, `003_admin_functions.sql`, `004_payment_functions.sql`, `005_builds.sql`.
2. Load sample data (6 categories, 24 products, 3 users, 3 coupons). Safe to run again:
   ```
   cd backend
   npm run seed
   ```
3. Start over (development only, deletes everything):
   ```
   npm run reset
   npm run seed
   ```
Design of the database: `docs/database.md`.

## Run
```
cd backend && npm run dev      # API on http://localhost:5000
cd frontend && npm run dev     # site on http://localhost:5173
```
Health check: `http://localhost:5000/api/v1/health`

## Demo accounts (test-only credentials, created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | `admin@nexuspc.test` | `Admin1234` |
| Customer | `juan@nexuspc.test` | `Customer1234` |
| Customer | `maria@nexuspc.test` | `Customer1234` |

Coupons for testing: `WELCOME10` (10%, minimum ₱5,000), `SAVE500` (₱500 off, minimum ₱10,000), `EXPIRED20` (expired on purpose).

## Tests
Run from `backend`:
```
npm test                      # unit and validation tests, no database
npm run test:integration      # real HTTP calls against a test database (needs backend/.env.test)
npm run test:report           # runs both and writes docs/test-results.md
```
Details, coverage and known limitations: `docs/test-plan.md`. Latest results: `docs/test-results.md`.

## API documentation
- Swagger UI: `/api-docs` on the API server (use **Authorize** with a token from `POST /auth/login`).
- Specification: `openapi.yaml`. Regenerate with `npm run docs:openapi` in `backend`.
- Postman: run `node postman/generate.mjs` in the project root, import both files from `postman/`, choose the **NEXUS PC (local)** environment, and run the collection (59 requests with assertions and negative cases).

## Payments (Maya sandbox)
Sandbox test card: `5123 4567 8901 2346`, expiry `12/2030`, CVV `111`. To receive real webhooks on your machine, expose port 5000 with a tunnel (ngrok or Cloudflare Tunnel) and run `npm run maya:webhook -- https://YOUR-HOST/api/v1/webhooks/maya` in `backend`. Full details: `docs/payment-integration.md`.

## AI advisor
Needs `GEMINI_API_KEY`. If the key is missing or the service is down, the advisor answers with a friendly message and the rest of the store keeps working. Details: `docs/ai-integration.md`.

## Project structure
```
backend/
  src/config  routes  controllers  services  repositories  middleware  validators  utils
  src/patterns   payment providers, compatibility rules, AI guards, order state machine
  src/docs       OpenAPI specification source
  sql/           database scripts, run in order
  tests/         unit tests; tests/integration for HTTP tests against a database
frontend/src     api, components, context, pages
docs/            architecture, database, design patterns, AI, payments, rules, tests, reviews
postman/         collection generator, collection and environment (no secrets)
openapi.yaml
```

## Documentation
`docs/architecture.md` · `docs/database.md` · `docs/design-patterns-oop.md` · `docs/ai-integration.md` · `docs/payment-integration.md` · `docs/business-rules.md` · `docs/concept-statement.md` · `docs/test-plan.md` · `docs/code-review.md` · `docs/contributions.md`

## Deployment notes
- **API:** Render web service, root directory `backend`, build `npm install`, start `npm start`, health check path `/api/v1/health`. Set every backend variable in Render's environment settings. Set `CLIENT_URL` to the frontend's HTTPS address.
- **Frontend:** Vercel, root directory `frontend`, build `npm run build`, output `dist`, variable `VITE_API_BASE_URL` set to the API's HTTPS address plus `/api/v1`.
- **Payments:** after deploying, register the API's public webhook address in Maya: `npm run maya:webhook -- https://YOUR-API/api/v1/webhooks/maya`.
- Both addresses must be HTTPS.

## Deployment links
Backend: https://itpe101finalproject.onrender.com 
Swagger API Documentation: https://itpe101finalproject.onrender.com/api-docs 
Health Check: https://itpe101finalproject.onrender.com/api/v1/health 

## Known limitations
- Maya's sandbox keys are shared with other users, so webhook registration can collide; missed webhooks are recovered by the retrieve-on-return check and a scheduled check.
- `PayMongoProvider` is covered by unit tests against a fake network and has not been tried against PayMongo's live service.
- Rate limits are kept in server memory, so they reset when the server restarts.