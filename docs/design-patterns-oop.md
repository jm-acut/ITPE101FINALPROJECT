# Design patterns and object-oriented design

## 1. How a request travels (MVC / layered)
Every request goes through the same layers. Each layer has one job.

Example: placing an order, `POST /api/v1/orders`.
1. `src/routes/orderRoutes.js`: checks the Idempotency-Key (`middleware/idempotency.js`) and the body (`middleware/validate.js` with `validators/orderSchemas.js`), after `authenticate`.
2. `src/controllers/orderController.js`: reads the validated input, calls one service method, chooses 201 or 200.
3. `src/services/orderService.js`: the business rules (ownership, building the response).
4. `src/repositories/orderRepository.js`: talks to the database only. It calls the SQL function `place_order`, which reserves stock, redeems the coupon and creates the order in one transaction.
5. The response leaves through `utils/response.js` and, on failure, `middleware/errorHandler.js` (one error format).

Model: the "model" of MVC is the data layer: repositories plus the SQL functions and tables (`backend/sql`). The views are the React pages.
Trade-off: more files than putting everything in a route handler. Rejected alternative: fat route handlers, because rules (like prices) would be copied into several routes and could not be tested without HTTP.

## 2. Singleton
- `src/config/database.js`: one Supabase client, imported by every repository.
- `src/config/env.js`: configuration is validated once at startup and frozen.
- `src/patterns/payment/paymentFactory.js`: one payment provider per process (`getPaymentProvider`).
Problem solved: no duplicate connections and no part of the code reading raw environment variables.
Trade-off: global state is harder to test. We limit that by keeping the Factory Method (`createPaymentProvider`) free of globals and by injecting collaborators into `PaymentService` (section 5).
Rejected alternative: creating a client per request (wasteful and easy to misconfigure).

## 3. Factory Method (payment providers)
- Abstract base: `patterns/payment/PaymentProvider.js`.
- Concrete products: `MayaProvider.js` and `PayMongoProvider.js`.
- Factory: `patterns/payment/createPaymentProvider.js`. A registry maps a name to a builder.
- Consumer: `services/PaymentService.js` receives a provider through `getProvider` and only uses the base contract: `createCheckout`, `findPayment`, `cancelCheckout`, `parseWebhook`.
- Selection: the setting `PAYMENT_PROVIDER` (maya or paymongo) in `backend/.env`.
The two gateways really differ: Maya amounts are in pesos and looked up by order id, PayMongo amounts are in centavos and looked up by session id, Maya signs with RSA plus a nonce, PayMongo with HMAC. The providers hide those differences, so the service has no gateway-specific code.
Evidence: `tests/paymentProviders.test.js` runs the same calls through both providers using only the base type.
Trade-off: an extra layer. Rejected alternative: `if (provider === "maya")` branches inside the service, which spread every new gateway across the whole service.

## 4. Decorator (middleware)
`authenticate`, `authorize("admin")`, `validate(...)`, the rate limiters and `requireIdempotencyKey` wrap a route handler and add one behaviour each without editing the handler. In `routes/adminRoutes.js` a single line, `router.use(authenticate, authorize("admin"))`, protects every admin route.
Trade-off: order matters. The AI limiter counts per user, so it must run after `authenticate`. Rejected alternative: checking the role inside every controller (easy to forget on one route).

## 5. Facade
`PaymentService.startPayment` hides the order rules, the payment window, session reuse, the gateway call and the database write behind one method, so `paymentController` is a single call. `assistantService.recommend` does the same for retrieval, the AI call, validation and the repair attempt.
Trade-off: the facade can grow large; we keep it a thin coordinator that delegates.

## 6. Strategy
- Compatibility rules: `patterns/compatibility/rules.js`. Each rule is an object with the same shape, `{ code, check(context) }`, and the engine runs them all. A new rule is one new object; the engine does not change.
- The payment provider is also a strategy chosen at runtime by configuration.
Honest note: the compatibility rules all run on every check, so they are a rule set more than "pick one at runtime". The runtime selection is the provider.

## 7. State (order lifecycle)
`patterns/orderStateMachine.js` holds the only table of allowed order moves. The admin service and the customer cancel both ask it, and the database function `transition_order` only applies a move if the order is still in the status the caller saw.

## 8. Patterns not used, and why
- Observer: nothing needs to broadcast events to several listeners yet. The webhook handler calls one service.
- Proxy: the rate limiters and the AI output guards already sit in front of the AI client as middleware and functions; a wrapper object would add nothing.

## 9. Object-oriented design
Abstraction and inheritance: `PaymentProvider` is abstract (its constructor refuses direct creation and every method throws "Not implemented"). `MayaProvider` and `PayMongoProvider` extend it, one level deep. Inheritance is justified because both really are a "payment provider" and callers use them through the base type with the same result shapes (Liskov): each returns centavos and the same event fields.
Encapsulation: secrets and helpers are private (`#secretKey`, `#webhookSecret`, `#call`). Nothing outside a provider can read a key. `PaymentService` keeps its collaborators private too.
Composition: `PaymentService` is built from collaborators it is given: the provider getter, the payment and order repositories, the order service, the client address and a logger. It does not create or import them. The production wiring is in `services/paymentService.js`. The tests build it with fakes (`tests/paymentService.test.js`), so the payment rules are tested without a database or a gateway.
Where we chose composition over inheritance: the compatibility rules are separate objects the engine composes, not subclasses of a rule base class; `PaymentService` has a provider, it is not one.

## 10. Refactoring record
Before: `services/paymentService.js` was a module of functions that imported the database repositories and the gateway factory directly. It could only be tested with a real database.
After: `PaymentService` is a class whose collaborators are injected; `paymentService.js` only wires the real ones. Behaviour did not change.
Why: to depend on the PaymentProvider contract only and to make the rules testable.
Proof that behaviour is unchanged: the signed-webhook integration tests (`tests/integration/payments.int.test.js`) passed before and after, and 13 unit tests now cover the service directly.
Commits: (paste the real commit ids or links of the refactor here)

## 11. Known limitations
- `PayMongoProvider` follows PayMongo's documentation and is tested against a fake network. It has not been tried against PayMongo's live service because account verification was not available. Maya is the gateway tested end to end in its sandbox.
- With shared Maya sandbox keys, webhook registration can collide with other users, so a missed webhook is recovered by the retrieve-on-return and scheduled checks.