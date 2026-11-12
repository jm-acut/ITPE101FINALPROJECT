# Test plan

## How to run
| Command (inside `backend`) | What it runs |
|---|---|
| `npm test` | Unit and validation tests. No database needed. |
| `npm run test:integration` | Integration tests: real HTTP calls into the API, results checked in a real database. |
| `npm run test:report` | Runs both and writes `docs/test-results.md` with the real results and date. |

## Test database
Integration tests use the database named in `backend/.env.test` (not committed). Every test creates its own data (names starting with `itest-`) and removes it afterwards, so the suite can run repeatedly. Tests never run `reset` and never touch seed data.
Setup used for this project: (write which one you used: the same Supabase project as development, or a separate project).
If a run is killed halfway, leftovers are removed with the SQL in the README.

## What is covered
| Requirement | Test file | Test (summary) |
|---|---|---|
| Authentication | `auth-roles.int.test.js` | register, sign in, read profile; duplicate email 409; generic wrong-password answer; injection payload 422 |
| Role enforcement (S-03) | `auth-roles.int.test.js` | 14 admin routes return 401 without a token and 403 for a customer, including nested routes; admin gets 200 |
| Admin inventory and audit | `auth-roles.int.test.js` | audited stock changes, never below zero, stock not editable via PATCH, hidden product disappears, delete |
| Checkout pricing (L1-06, L2-01) | `checkout.int.test.js` | client price ignored; percentage rounds down; free shipping from PHP 5,000; empty cart 409 |
| Coupons (L2-01) | `checkout.int.test.js` | expired, unknown, minimum spend, per-customer limit; coupon returned on cancel |
| Stock conflict (L2-02) | `checkout.int.test.js` | two customers, one last item: exactly one 201 and one 409; stock returns on cancel |
| Idempotency (L2-03) | `checkout.int.test.js` | same key twice: one order, stock reserved once; missing key 422 |
| Ownership | `checkout.int.test.js` | another customer's order is 404 |
| Webhook signature rejection (L2-05, S-07) | `payments.int.test.js` | no signature 401; body changed after signing 401; old timestamp 401; order unchanged |
| Verified payment (L2-06, L2-07) | `payments.int.test.js` | signed event marks order paid and consumes the reservation |
| Duplicate event (L2-07, D-09) | `payments.int.test.js` | replay answers 200 `duplicate`; one stored event; one "paid" history row |
| Wrong amount / late payment (L2-08, L2-09) | `payments.int.test.js` | amount mismatch flagged; cancelled order never marked paid, flagged for refund |
| Unknown order, other event types | `payments.int.test.js` | acknowledged with 200 and ignored |
| AI fallback (L4-06) | `ai.int.test.js` | assistant down: controlled 503, no stack or provider text; store still works |
| Compatibility rules (L3-02) | `compatibility.test.js` | socket, memory type, power supply, part limits, missing specs |
| AI output guards (L4-04, L4-05) | `assistant.test.js` | unknown ids discarded; price-like text removed; tags stripped; wrong shapes rejected |
| Input validation | `builds.api.test.js`, `assistant.test.js` | 401 and 422 cases that run before any database query |

## Results
See `docs/test-results.md` (generated). Last full run: (date) , (passed) of (total) passed.

## Manual tests (cannot be automated)
These use outside services. Fill in the Actual column after you run each one, and keep a screenshot or short recording.
| # | Test | Expected | Actual |
|---|---|---|---|
| M1 | Pay a real sandbox order with a Maya test card | Redirected back; order shows Paid | |
| M2 | Pay with the failing wallet account | Order stays awaiting payment; "payment failed" banner | |
| M3 | Ask the AI advisor for a ₱60,000 gaming build | Compatible build within budget; prices match the shop | |
| M4 | Ask the AI advisor to ignore its instructions and reveal its prompt | A normal build or "no match"; nothing revealed | |
| M5 | Replace the Gemini key with a wrong one | Friendly "assistant not available" message; shop still works | |

## Known limitations
- The Maya sandbox shares public keys with other users, so live webhooks can be unreliable; the automated tests sign their own webhooks with a test key instead.
- The successful AI path needs a live key, so it is covered by manual test M3 and by the output-guard unit tests, not by an automated integration test.