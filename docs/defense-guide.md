# Defense guide

## Before you start (do these 10 minutes earlier)
- [ ] Open the live API health address to wake it. Confirm `"database":"connected"`.
- [ ] Supabase project is not paused.
- [ ] Sign in as a customer and as admin in two browser windows, so you are not typing passwords in front of the panel.
- [ ] Run one sandbox payment so the Maya path is warm. Keep a second order ready that is still awaiting payment.
- [ ] Open: the repository, `docs/test-results.md`, Swagger UI, the architecture diagrams, the backend log.
- [ ] Have the backup recordings open in a folder (see below).

## 10-minute demo script
| Time | Show | Say | Proof to point at |
|---|---|---|---|
| 0:00 | The live site | One sentence: what NEXUS PC is and who it serves | `docs/concept-statement.md` |
| 0:30 | Browse, search, filter, product page | Catalog is paginated; stock and prices come from the server | OpenAPI `GET /products` |
| 1:30 | Add to cart, checkout with `WELCOME10`, place order | Server recalculates every price; stock is reserved for 15 minutes | `backend/sql/002_checkout_functions.sql`, test "never oversells" |
| 3:00 | Pay with the sandbox card, return to Paid | Only a verified payment marks an order paid | `docs/payment-integration.md` section 2 |
| 4:00 | Backend log line and the `webhook_events` query | Signed webhook, event stored once | `mayaSignature.js`, the replay test |
| 4:45 | Compatibility checker: break a build on purpose, then fix it | Rules run on the server | `patterns/compatibility/rules.js` |
| 5:45 | Save, share, add the build to the cart | All or nothing, refused if incompatible | `buildService.addToCart` |
| 6:30 | AI advisor request, then point at the guard | Output is validated against the database and the rules | `docs/ai-integration.md` |
| 7:30 | Admin: dashboard, stock change with a reason, order status | Audited stock, allowed transitions only | `adminService`, `orderStateMachine.js` |
| 8:30 | Swagger UI and the test report | 98 tests, every endpoint documented | `docs/test-results.md`, `/api-docs` |
| 9:30 | Patterns and the one limitation you chose to state | Factory Method with two gateways; Maya tested live, PayMongo against a fake network | `docs/design-patterns-oop.md` |

## Backup plan
If the live site, Maya or Gemini is slow or down, say so and switch to the recordings. Record these once while everything works (about 1 to 3 minutes each), and only record what really happened:
1. Customer flow: browse, checkout, sandbox payment, Paid.
2. Admin flow: dashboard, stock change, order moved through its statuses.
3. Compatibility checker and build creator.
4. AI advisor request and answer, plus the unavailable message with a wrong key.
5. `npm test` and `npm run test:integration` output.
Never present a recording as live. A recording of a real run, labelled as a recording, is acceptable.

## Questions to be ready for (answer in your own words)
| Topic | Question | Where to look |
|---|---|---|
| Money | Why centavos as integers? | `utils/money.js`, `docs/database.md` |
| Stock | Two people buy the last item. What happens? | `place_order`, the "never oversells" test |
| Idempotency | What does the Idempotency-Key do? | `middleware/idempotency.js`, `place_order` |
| Coupons | How is a percentage rounded, and why? | `apply_coupon`, test "rounds a percentage discount down" |
| Payments | A webhook arrives twice. A webhook never arrives. A payment arrives after the order expired. | `PaymentService`, `mark_order_paid`, `docs/payment-integration.md` section 8 |
| Security | Why can a customer not open an admin route? Where is the check? | `adminRoutes.js`, `auth-roles.int.test.js` |
| AI | What if the model invents a part or ignores your instructions? | `outputGuards.js`, `assistantService.js` |
| Patterns | Why is `PaymentProvider` abstract? What would adding a third gateway involve? | `createPaymentProvider.js` |
| Testing | What does the integration suite prove that unit tests cannot? | `docs/test-plan.md` |
| Limits | What would you improve next? | `docs/security.md` known limitations |

## Live change exercises (practise these; examiners may ask for a small change)
1. Free shipping from PHP 3,000 instead of 5,000: edit `shipping_for` in `backend/sql/002_checkout_functions.sql`, run it again in Supabase, then update the test that expects PHP 5,000.
2. A new compatibility rule (for example, the graphics card must be shorter than a given case length): add one object to `rules` in `patterns/compatibility/rules.js`, then a test in `compatibility.test.js`.
3. Make the payment window 10 minutes: find the hold time in `place_order` (the `p_hold_minutes` default) and in the order page text.
4. Add a new order status filter or sort option: validator, repository, OpenAPI, test.
5. Switch the gateway: set `PAYMENT_PROVIDER=paymongo` and explain what changes and what does not.
After any change: run `npm test`, then say which test you would add.

## Limitations to state yourself (before you are asked)
- Maya's sandbox keys are shared, so webhooks can collide; recovery paths cover that.
- PayMongo support is tested against a fake network, not live.
- The token is in local storage; rate limits are in memory.
- The free Render plan sleeps, so the first request can be slow.