# Payment integration (Maya Checkout sandbox)

## 1. Configuration
`PAYMENT_PROVIDER=maya`, `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY`, `MAYA_BASE_URL=https://pg-sandbox.paymaya.com`. The sandbox keys are the public keys published in Maya's developer documentation, so no secret from this project is involved. Nothing here ever uses live mode. A second gateway (PayMongo) is implemented behind the same interface and selected by the same setting.

## 2. Checkout flow
1. The customer places an order. Stock is reserved for 15 minutes.
2. "Pay with Maya" calls `POST /api/v1/orders/:id/pay`. The server creates a Maya checkout for the order total (the server decides the amount) and stores the session. Pressing the button twice returns the same session.
3. The customer pays on Maya's hosted page and is sent back to `/orders/:id?payment=success`, `failed` or `cancelled`.
4. The order becomes **Paid** only when a verified payment is recorded (section 3, 6 or 7). The return page never marks an order paid by itself.

## 3. Webhook endpoint
`POST /api/v1/webhooks/maya` (and `/paymongo` for the other gateway). The route reads the body as raw bytes, the provider verifies it, and the result is one of: `paid`, `duplicate`, `amount_mismatch`, `late_payment`, `unknown_order`, `ignored`. Answers are always 200 for events we understood, and 401 for a bad signature so nothing changes.

## 4. Signature verification
Maya signs the payload with RSA. The server:
1. Reads the two headers `X-Maya-Webhook-Signature` (`nonce=...,v1=...`) and `X-Maya-Webhook-Timestamp` and rejects the request if either is missing.
2. Rejects a timestamp more than 5 minutes from now (limits replays of captured requests).
3. Flattens the JSON payload into sorted `key=value` pairs joined by `&`, adds `&nonce=<nonce>`, and verifies the signature with Maya's public keys (the sandbox publishes two; either may verify).
Code: `backend/src/patterns/payment/mayaSignature.js` and `MayaProvider.parseWebhook`. PayMongo uses an HMAC of `<timestamp>.<raw body>` (`PayMongoProvider.parseWebhook`).

## 5. Event log
Each verified payment event is stored once in `webhook_events` (unique `event_id` = payment id plus status). To show the log:
```sql
select event_id, event_type, processed, created_at from webhook_events order by created_at desc limit 10;
```
The order history shows the same moment:
```sql
select o.id, h.from_status, h.to_status, h.note, h.created_at
from order_status_history h join orders o on o.id = h.order_id
order by h.created_at desc limit 10;
```

## 6. Replay test
`backend/tests/integration/payments.int.test.js`, test "marks the order paid, consumes the reservation, and ignores a replay of the same event". It signs a webhook with a test key pair, sends it, then sends the same event again: the second answer is `duplicate`, there is one stored event and one "paid" history row. Run `npm run test:integration` and show the result.

## 7. Missed-webhook recovery
Three paths use the same database function `mark_order_paid`, so nothing is paid twice:
1. The order page calls `POST /orders/:id/sync-payment` when the customer returns, and repeats it every 3 seconds for about a minute. The server asks Maya whether the order was paid.
2. A job every minute asks Maya about every open payment session older than 30 seconds.
3. The same job checks sessions of cancelled or expired orders: if money arrived, the order is flagged for a refund; otherwise the session is closed.

## 8. Edge cases
| Situation | Result |
|---|---|
| Duplicate webhook | Acknowledged, ignored |
| Paid amount or currency differs from the order | Order stays unpaid and is flagged for review |
| Payment arrives after the order was cancelled or expired | Never marked paid; flagged "refund required"; visible in the admin dashboard |
| Webhook for an order that is not ours (shared sandbox) | 200, ignored, nothing stored |
| Wrong or missing signature, or old timestamp | 401, nothing changes |
| Gateway down while paying | Controlled 502 message; the order stays awaiting payment until its window ends |

## 9. Evidence to record (screen recording, about 3 minutes)
Record these in one take and keep the file with the project:
1. The order page awaiting payment with the countdown.
2. Pay with the sandbox card on Maya's page, then return to the order page showing **Paid**.
3. The backend terminal showing the payment event line.
4. The two SQL queries from section 5.
5. `npm run test:integration` showing the signature and replay tests passing.
Only record what really happened. If a step does not work on your machine, show the recovery path (section 7) instead and say so.

## 10. Known limitations
Maya's sandbox keys are shared with other users, so registering a webhook can collide with someone else's; this is why recovery paths exist. PayMongo support is tested against a fake network only.