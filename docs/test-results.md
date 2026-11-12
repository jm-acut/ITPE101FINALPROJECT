# Test results

Generated automatically by `npm run test:report` on 2026-11-12. Do not edit by hand.

## Unit and validation tests (no database)

**23 passed, 0 failed, 23 total.**

| File | Test | Result | ms |
|---|---|---|---|
| tests/assistant.test.js | AI output guards discards ids that are not in the catalog or are not real ids | PASS | 4 |
| tests/assistant.test.js | AI output guards throws away model text that looks like a price | PASS | 1 |
| tests/assistant.test.js | AI output guards never lets model text carry HTML tags | PASS | 1 |
| tests/assistant.test.js | AI output guards removes the characters a customer could use to fake our prompt tags | PASS | 1 |
| tests/assistant.test.js | AI output guards rejects model output with the wrong shape | PASS | 3 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) requires sign-in (401) | PASS | 70 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a request that is too short (422) | PASS | 11 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a request that is too long (422) | PASS | 9 |
| tests/assistant.test.js | assistant API (rules that run before any AI call) rejects a budget that is too low or not a number (422) | PASS | 13 |
| tests/builds.api.test.js | builds API (rules that run before any database query) requires sign-in to save a build (401) | PASS | 77 |
| tests/builds.api.test.js | builds API (rules that run before any database query) requires sign-in to add a build to the cart (401) | PASS | 9 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects an empty parts list on the public checker (422) | PASS | 7 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects a malformed part id (422) | PASS | 7 |
| tests/builds.api.test.js | builds API (rules that run before any database query) rejects an invalid share code (422) | PASS | 6 |
| tests/builds.api.test.js | builds API (rules that run before any database query) validates the build name for a signed-in customer (422) | PASS | 8 |
| tests/compatibility.test.js | compatibility engine accepts a fully compatible build and reports the power numbers | PASS | 5 |
| tests/compatibility.test.js | compatibility engine rejects a processor and motherboard with different sockets | PASS | 2 |
| tests/compatibility.test.js | compatibility engine rejects memory of the wrong type for the motherboard | PASS | 1 |
| tests/compatibility.test.js | compatibility engine rejects a power supply that is too weak, and accepts a stronger one | PASS | 1 |
| tests/compatibility.test.js | compatibility engine rejects too many parts of one kind | PASS | 0 |
| tests/compatibility.test.js | compatibility engine treats missing parts as warnings, not errors | PASS | 0 |
| tests/compatibility.test.js | compatibility engine warns instead of crashing when a part has no specs | PASS | 0 |
| tests/compatibility.test.js | compatibility engine lists errors before warnings | PASS | 0 |

## Integration tests (real HTTP calls against a test database)

**33 passed, 0 failed, 33 total.**

| File | Test | Result | ms |
|---|---|---|---|
| tests/integration/ai.int.test.js | AI fallback answers with a controlled 503 and no internal details when the assistant is unavailable | PASS | 882 |
| tests/integration/ai.int.test.js | AI fallback keeps the rest of the store working while the assistant is down | PASS | 148 |
| tests/integration/ai.int.test.js | AI fallback still requires sign-in for the assistant (401) | PASS | 5 |
| tests/integration/auth-roles.int.test.js | authentication registers a customer, signs in and reads the profile | PASS | 1631 |
| tests/integration/auth-roles.int.test.js | authentication rejects a duplicate email with 409 | PASS | 769 |
| tests/integration/auth-roles.int.test.js | authentication gives the same generic answer for a wrong password and an unknown email | PASS | 1549 |
| tests/integration/auth-roles.int.test.js | authentication blocks an operator-injection login with 422 | PASS | 7 |
| tests/integration/auth-roles.int.test.js | role enforcement returns 401 on every admin route without a token | PASS | 55 |
| tests/integration/auth-roles.int.test.js | role enforcement returns 403 on every admin route for a customer token, including nested routes | PASS | 659 |
| tests/integration/auth-roles.int.test.js | role enforcement lets an admin reach the dashboard | PASS | 494 |
| tests/integration/auth-roles.int.test.js | admin product management creates a product, keeps an audited stock trail, hides it and deletes it | PASS | 2474 |
| tests/integration/auth-roles.int.test.js | admin product management validates product input (422) | PASS | 397 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server ignores a price sent by the client and prices from the database | PASS | 1582 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server rounds a percentage discount down to the centavo | PASS | 1523 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server makes shipping free from PHP 5,000 | PASS | 1576 |
| tests/integration/checkout.int.test.js | checkout pricing is calculated on the server refuses an empty cart (409) | PASS | 757 |
| tests/integration/checkout.int.test.js | coupon rules rejects an expired coupon, an unknown code and an unmet minimum spend (422) | PASS | 1807 |
| tests/integration/checkout.int.test.js | coupon rules enforces the per-customer limit and gives the coupon back when the order is cancelled | PASS | 2857 |
| tests/integration/checkout.int.test.js | stock and orders refuses to put more in the cart than is in stock (409) | PASS | 1001 |
| tests/integration/checkout.int.test.js | stock and orders reserves stock when an order is placed and returns it when the order is cancelled | PASS | 2280 |
| tests/integration/checkout.int.test.js | stock and orders never oversells the last item when two customers check out at the same time | PASS | 3433 |
| tests/integration/checkout.int.test.js | stock and orders creates only one order when the same Idempotency-Key is sent twice | PASS | 2207 |
| tests/integration/checkout.int.test.js | stock and orders requires an Idempotency-Key header (422) | PASS | 743 |
| tests/integration/checkout.int.test.js | stock and orders hides another customer's order (404) | PASS | 2434 |
| tests/integration/payments.int.test.js | webhook signature verification rejects a webhook with no signature (401) and changes nothing | PASS | 2267 |
| tests/integration/payments.int.test.js | webhook signature verification rejects a webhook whose body was changed after signing (401) | PASS | 1969 |
| tests/integration/payments.int.test.js | webhook signature verification rejects an old timestamp (401), which blocks replays of captured requests | PASS | 2029 |
| tests/integration/payments.int.test.js | verified payment events marks the order paid, consumes the reservation, and ignores a replay of the same event | PASS | 3370 |
| tests/integration/payments.int.test.js | verified payment events flags a payment with the wrong amount and does not mark the order paid | PASS | 2573 |
| tests/integration/payments.int.test.js | verified payment events never marks a cancelled order paid; it flags it for a refund instead | PASS | 3084 |
| tests/integration/payments.int.test.js | verified payment events acknowledges an event for an unknown order without crashing | PASS | 141 |
| tests/integration/payments.int.test.js | verified payment events acknowledges and ignores other event types | PASS | 2067 |
| tests/integration/payments.int.test.js | paying refuses to start a payment for an order that is already paid (409) | PASS | 2644 |

**Overall: 56 of 56 tests passed.**
