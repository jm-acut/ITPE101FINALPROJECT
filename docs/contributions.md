# Individual contribution statement

**Student:** (full name) · **Course:** ITPE101 (IT PROFEL 1) · **Project:** NEXUS PC · **Work mode:** individual

## Modules
| Area | What was built | Main files |
|---|---|---|
| Accounts and roles | Registration, login, profile, customer and admin roles, token checks | `authService`, `middleware/auth.js`, `authRoutes` |
| Catalog | Search, filters, sorting, pagination, product pages, admin product management | `productService`, `productRepository`, `adminRoutes` |
| Cart and checkout | Server cart, quote, coupons, shipping rule, order with stock reservation, idempotency, order history, cancel | `cartService`, `orderService`, `backend/sql/002_checkout_functions.sql` |
| Inventory and admin | Audited stock changes, order management, dashboard, coupon management | `inventoryService`, `adminService`, `couponService` |
| Payments | Maya checkout, signed webhooks, duplicate and late-payment handling, recovery, second gateway class | `patterns/payment/*`, `PaymentService`, `webhookController` |
| PC features | Compatibility rule engine, build creator, save, share, build-to-cart | `patterns/compatibility/*`, `buildService` |
| AI | Grounded build advisor with validation, fallback and rate limits | `assistantService`, `patterns/ai/*` |
| API contract and tests | OpenAPI specification, Swagger UI, Postman collection, unit and integration tests | `src/docs/openapi.js`, `postman/`, `backend/tests/` |
| Frontend | All pages, cart and auth state, admin screens, builder | `frontend/src` |

## Patterns and object-oriented design
MVC and layers, Singleton, Factory Method, Decorator, Facade, Strategy, State; abstract `PaymentProvider` with two subclasses, composition in `PaymentService`, encapsulation with private fields. See `docs/design-patterns-oop.md`.

## Tests
64 unit tests and 34 integration tests (see `docs/test-results.md` for the latest run).

## Documentation
Everything in `docs/`, the README, `openapi.yaml` and the Postman collection.

## Use of AI assistance
(Describe honestly how you used an AI assistant, as your course requires: what it helped with, what you reviewed and changed yourself, and what you can explain without it. Do not leave this blank.)

## Consistency with Git history
The commits in the repository reflect this work. (Run `git log --oneline` and confirm the history is incremental.)

Signed: ____________________  Date: ____________