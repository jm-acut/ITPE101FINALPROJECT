# Test results

Generated automatically by `npm run test:report` on 2026-11-17. Do not edit by hand.

## Unit and validation tests (no database)

**64 passed, 0 failed, 64 total.**

| File | Test | Result | ms |
|---|---|---|---|
| tests/assistant.test.js | AI output guards discards ids that are not in the catalog or are not real ids | PASS | 3 |
| tests/assistant.test.js | AI output guards throws away model text that looks like a price | PASS | 1 |
| tests/assistant.test.js | AI output guards never lets model text carry HTML tags | PASS | 0 |
| tests/assistant.test.js | AI output guards removes the characters a customer could use to fake our prompt tags | PASS | 0 |
| tests/assistant.test.js | AI output guards rejects model output with the wrong shape | PASS | 1 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) requires sign-in (401) | PASS | 48 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a request that is too short (422) | PASS | 7 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a request that is too long (422) | PASS | 6 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a budget that is too low or not a number (422) | PASS | 9 |
| tests/builds.api.test.js | builds API (rules that run before any database query) requires sign-in to save a build (401) | PASS | 52 |
| tests/builds.api.test.js | builds API (rules that run before any database query) requires sign-in to add a build to the cart (401) | PASS | 6 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects an empty parts list on the public checker (422) | PASS | 5 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects a malformed part id (422) | PASS | 4 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects an invalid share code (422) | PASS | 5 |
| tests/builds.api.test.js | builds API (rules that run before any database query) validates the build name for a signed-in customer (422) | PASS | 5 |
| tests/compatibility.test.js | compatibility engine accepts a fully compatible build and reports the power numbers | PASS | 4 |
| tests/compatibility.test.js | compatibility engine rejects a processor and motherboard with different sockets | PASS | 1 |
| tests/compatibility.test.js | compatibility engine rejects memory of the wrong type for the motherboard | PASS | 0 |
| tests/compatibility.test.js | compatibility engine rejects a power supply that is too weak, and accepts a stronger one | PASS | 0 |
| tests/compatibility.test.js | compatibility engine rejects too many parts of one kind | PASS | 0 |
| tests/compatibility.test.js | compatibility engine treats missing parts as warnings, not errors | PASS | 0 |
| tests/compatibility.test.js | compatibility engine warns instead of crashing when a part has no specs | PASS | 0 |
| tests/compatibility.test.js | compatibility engine lists errors before warnings | PASS | 0 |
| tests/openapi.test.js | OpenAPI specification (T-10) declares OpenAPI 3, an authentication scheme and a shared error shape | PASS | 4 |
| tests/openapi.test.js | OpenAPI specification (T-10) documents at least 40 operations with unique operation ids | PASS | 1 |
| tests/openapi.test.js | OpenAPI specification (T-10) gives every operation a tag, a summary, a success response and an example | PASS | 4 |
| tests/openapi.test.js | OpenAPI specification (T-10) declares every path parameter and marks protected operations with the bearer scheme | PASS | 2 |
| tests/openapi.test.js | OpenAPI specification (T-10) resolves every $ref | PASS | 6 |
| tests/openapi.test.js | the frontend uses only documented endpoints (T-24) finds the frontend's API calls | PASS | 0 |
| tests/openapi.test.js | the frontend uses only documented endpoints (T-24) has no call to an undocumented endpoint | PASS | 0 |
| tests/openapi.test.js | the frontend uses only documented endpoints (T-24) documents methods in lowercase OpenAPI form only | PASS | 3 |
| tests/paymentProviders.test.js | PaymentProvider (abstract base class) cannot be created directly | PASS | 2 |
| tests/paymentProviders.test.js | PaymentProvider (abstract base class) makes a subclass implement every method | PASS | 2 |
| tests/paymentProviders.test.js | the factory (Factory Method) builds a different concrete class for each name, all usable as the base type | PASS | 1 |
| tests/paymentProviders.test.js | the factory (Factory Method) refuses an unknown provider name with a controlled 503 | PASS | 0 |
| tests/paymentProviders.test.js | the factory (Factory Method) refuses a provider whose keys are missing with a controlled 503 | PASS | 0 |
| tests/paymentProviders.test.js | both providers answer the same contract creates a checkout through the base type, each gateway in its own units | PASS | 1 |
| tests/paymentProviders.test.js | both providers answer the same contract turns a gateway refusal into a controlled 502 for both | PASS | 3 |
| tests/paymentProviders.test.js | both providers answer the same contract finds a paid payment and reports centavos for both | PASS | 1 |
| tests/paymentProviders.test.js | both providers answer the same contract reports 'not paid' for an unknown payment and fails clearly when the gateway is down | PASS | 1 |
| tests/paymentProviders.test.js | both providers answer the same contract closes a session and reports whether the gateway agreed | PASS | 1 |
| tests/paymentProviders.test.js | MayaProvider webhooks accepts a signed payment and converts pesos to centavos | PASS | 3 |
| tests/paymentProviders.test.js | MayaProvider webhooks rounds a fractional peso amount to the exact centavo | PASS | 1 |
| tests/paymentProviders.test.js | MayaProvider webhooks rejects a missing, altered, or stale signature with 401 | PASS | 2 |
| tests/paymentProviders.test.js | MayaProvider webhooks acknowledges and ignores other event types | PASS | 1 |
| tests/paymentProviders.test.js | MayaProvider webhooks does not treat a reference that is not ours as an order | PASS | 1 |
| tests/paymentProviders.test.js | PayMongoProvider webhooks accepts a signed payment, already in centavos | PASS | 1 |
| tests/paymentProviders.test.js | PayMongoProvider webhooks rejects a missing, altered, or wrongly signed body with 401 | PASS | 1 |
| tests/paymentProviders.test.js | PayMongoProvider webhooks ignores other event types and live events sent to a test-mode key | PASS | 0 |
| tests/paymentProviders.test.js | PayMongoProvider webhooks reads the newer envelope shape and builds a stable event id | PASS | 0 |
| tests/paymentProviders.test.js | PayMongoProvider webhooks refuses to verify anything when no webhook secret is configured | PASS | 0 |
| tests/paymentService.test.js | PaymentService.startPayment asks the provider for a checkout, stores the session, and returns its address | PASS | 5 |
| tests/paymentService.test.js | PaymentService.startPayment sends the customer to the same session when Pay is clicked twice (no second checkout) | PASS | 0 |
| tests/paymentService.test.js | PaymentService.startPayment refuses an order that is not awaiting payment, or whose window ended | PASS | 1 |
| tests/paymentService.test.js | PaymentService.startPayment hides another customer's order | PASS | 0 |
| tests/paymentService.test.js | PaymentService.handleEvent applies a verified payment once and records the event | PASS | 1 |
| tests/paymentService.test.js | PaymentService.handleEvent acknowledges a duplicate without applying it again | PASS | 0 |
| tests/paymentService.test.js | PaymentService.handleEvent retries an event whose earlier attempt failed midway | PASS | 0 |
| tests/paymentService.test.js | PaymentService.handleEvent ignores other event types and events for orders that are not ours, storing nothing | PASS | 1 |
| tests/paymentService.test.js | PaymentService.handleEvent passes the database's verdict through (for example a late payment) | PASS | 0 |
| tests/paymentService.test.js | PaymentService recovery paths syncPayment asks the gateway only when a payment session exists, then applies a paid result | PASS | 1 |
| tests/paymentService.test.js | PaymentService recovery paths reconcilePending recovers orders whose webhook never arrived | PASS | 1 |
| tests/paymentService.test.js | PaymentService recovery paths cleanupDeadSessions closes unpaid sessions, and treats money that arrived as a late payment | PASS | 1 |
| tests/paymentService.test.js | PaymentService recovery paths does nothing when payments are not configured | PASS | 0 |

## Integration tests (real HTTP calls against a test database)

**34 passed, 0 failed, 34 total.**

| File | Test | Result | ms |
|---|---|---|---|
| tests/integration/ai.int.test.js | AI fallback answers with a controlled 503 and no internal details when the assistant is unavailable | PASS | 1404 |
| tests/integration/ai.int.test.js | AI fallback keeps the rest of the store working while the assistant is down | PASS | 194 |
| tests/integration/ai.int.test.js | AI fallback still requires sign-in for the assistant (401) | PASS | 4 |
| tests/integration/auth-roles.int.test.js | authentication registers a customer, signs in and reads the profile | PASS | 1442 |
| tests/integration/auth-roles.int.test.js | authentication rejects a duplicate email with 409 | PASS | 833 |
| tests/integration/auth-roles.int.test.js | authentication gives the same generic answer for a wrong password and an unknown email | PASS | 1959 |
| tests/integration/auth-roles.int.test.js | authentication blocks an operator-injection login with 422 | PASS | 7 |
| tests/integration/auth-roles.int.test.js | role enforcement returns 401 on every admin route without a token | PASS | 67 |
| tests/integration/auth-roles.int.test.js | role enforcement returns 403 on every admin route for a customer token, including nested routes | PASS | 807 |
| tests/integration/auth-roles.int.test.js | role enforcement lets an admin reach the dashboard | PASS | 540 |
| tests/integration/auth-roles.int.test.js | admin product management creates a product, keeps an audited stock trail, hides it and deletes it | PASS | 3379 |
| tests/integration/auth-roles.int.test.js | admin product management validates product input (422) | PASS | 545 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server ignores a price sent by the client and prices from the database | PASS | 2077 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server rounds a percentage discount down to the centavo | PASS | 1944 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server makes shipping free from PHP 5,000 | PASS | 1774 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server refuses an empty cart (409) | PASS | 822 |
| tests/integration/checkout.int.test.js | coupon rules rejects an expired coupon, an unknown code and an unmet minimum spend (422) | PASS | 2083 |
| tests/integration/checkout.int.test.js | coupon rules enforces the per-customer limit and gives the coupon back when the order is cancelled | PASS | 4047 |
| tests/integration/checkout.int.test.js | stock and orders refuses to put more in the cart than is in stock (409) | PASS | 1345 |
| tests/integration/checkout.int.test.js | stock and orders reserves stock when an order is placed and returns it when the order is cancelled | PASS | 3214 |
| tests/integration/checkout.int.test.js | stock and orders never oversells the last item when two customers check out at the same time | PASS | 4861 |
| tests/integration/checkout.int.test.js | stock and orders creates only one order when the same Idempotency-Key is sent twice | PASS | 2973 |
| tests/integration/checkout.int.test.js | stock and orders requires an Idempotency-Key header (422) | PASS | 791 |
| tests/integration/checkout.int.test.js | stock and orders hides another customer's order (404) | PASS | 3001 |
| tests/integration/contract.int.test.js | the running API matches the OpenAPI specification answers every documented operation with a documented status | PASS | 6582 |
| tests/integration/payments.int.test.js | webhook signature verification rejects a webhook with no signature (401) and changes nothing | PASS | 2665 |
| tests/integration/payments.int.test.js | webhook signature verification rejects a webhook whose body was changed after signing (401) | PASS | 2435 |
| tests/integration/payments.int.test.js | webhook signature verification rejects an old timestamp (401), which blocks replays of captured requests | PASS | 2450 |
| tests/integration/payments.int.test.js | verified payment events marks the order paid, consumes the reservation, and ignores a replay of the same event | PASS | 4456 |
| tests/integration/payments.int.test.js | verified payment events flags a payment with the wrong amount and does not mark the order paid | PASS | 3241 |
| tests/integration/payments.int.test.js | verified payment events never marks a cancelled order paid; it flags it for a refund instead | PASS | 3878 |
| tests/integration/payments.int.test.js | verified payment events acknowledges an event for an unknown order without crashing | PASS | 180 |
| tests/integration/payments.int.test.js | verified payment events acknowledges and ignores other event types | PASS | 2566 |
| tests/integration/payments.int.test.js | paying refuses to start a payment for an order that is already paid (409) | PASS | 3244 |

**Overall: 98 of 98 tests passed.**
