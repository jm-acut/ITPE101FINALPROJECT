# Business rules

Errors use one format: `{ "success": false, "error": { "code", "message", "details?" }, "requestId" }`.
Money is stored as whole centavos and is always calculated on the server.

## Accounts and roles
| Rule | Endpoint | Error when violated |
|---|---|---|
| An email can have only one account. | `POST /auth/register` | 409 `EMAIL_TAKEN` |
| Wrong email or password gives the same generic answer. | `POST /auth/login` | 401 `INVALID_CREDENTIALS` |
| Passwords need 8+ characters with a letter and a number. | `POST /auth/register` | 422 `VALIDATION_ERROR` |
| Protected routes need a valid, unexpired token. | all protected routes | 401 `UNAUTHENTICATED`, `INVALID_TOKEN`, `TOKEN_EXPIRED` |
| Only an admin can use admin routes. The check runs on the server. | `/admin/*` | 403 `FORBIDDEN` |
| A customer can only see and change their own cart, orders and builds. Another person's record looks like a missing one. | `/cart`, `/orders/:id`, `/builds/:id` | 404 `ORDER_NOT_FOUND`, `BUILD_NOT_FOUND` |

## Catalog and inventory
| Rule | Endpoint | Error when violated |
|---|---|---|
| Customers never see inactive products. | `GET /products`, `GET /products/:id` | 404 `PRODUCT_NOT_FOUND` |
| A product that appears in an order cannot be deleted; deactivate it instead. | `DELETE /admin/products/:id` | 409 `PRODUCT_HAS_ORDERS` |
| Product names are unique. | `POST/PATCH /admin/products` | 409 `PRODUCT_NAME_TAKEN` |
| Stock changes only through an audited adjustment (previous value, new value, reason, who). | `POST /admin/products/:id/stock` | 409 `STOCK_NEGATIVE`, 422 `INVALID_ADJUSTMENT` |

## Cart and checkout
| Rule | Endpoint | Error when violated |
|---|---|---|
| The cart lives on the server. Prices and names come from the database, never from the browser. | `/cart/*` | n/a |
| Quantity cannot exceed stock or 99 per item. | `POST/PATCH /cart/items` | 409 `INSUFFICIENT_STOCK`, 409 `QUANTITY_LIMIT` |
| Checkout needs an `Idempotency-Key`. Repeating the same key returns the same order (200), never a second one. | `POST /orders` | 422 `VALIDATION_ERROR` |
| Placing an order reserves stock at once (all or nothing). Two buyers cannot get the last item. | `POST /orders` | 409 `INSUFFICIENT_STOCK`, 409 `PRODUCT_UNAVAILABLE` |
| Shipping is PHP 150, free from PHP 5,000 subtotal. | `POST /orders`, `POST /orders/quote` | n/a |
| Price and name are copied into the order, so later changes never alter it. | `POST /orders` | n/a |
| Unpaid orders are held for 15 minutes, then expire and return their stock and coupon. | background job, `GET /orders/:id` | status `expired` |

## Coupons
| Rule | Endpoint | Error when violated |
|---|---|---|
| The code must exist and be active. | `POST /orders/quote`, `POST /orders` | 422 `COUPON_INVALID` |
| It must not be expired. | same | 422 `COUPON_EXPIRED` |
| Total uses must not be exceeded. | same | 422 `COUPON_EXHAUSTED` |
| Minimum spend must be met. | same | 422 `COUPON_MIN_SPEND` |
| Per-customer limit must not be exceeded. | same | 422 `COUPON_ALREADY_USED` |
| Percentage discounts round down to the centavo. A fixed discount never exceeds the subtotal. Discounts apply to the subtotal only, not shipping. | same | n/a |
| A used coupon cannot be deleted; deactivate it. Codes are unique. | `DELETE /admin/coupons/:id`, `POST /admin/coupons` | 409 `COUPON_IN_USE`, 409 `COUPON_CODE_TAKEN` |

## Order lifecycle
| Rule | Endpoint | Error when violated |
|---|---|---|
| Allowed moves: pending_payment to paid, cancelled or expired; paid to processing or cancelled; processing to shipped; shipped to delivered. | `PATCH /admin/orders/:id/status` | 409 `INVALID_TRANSITION` |
| "Paid" and "expired" are set only by the system, never by hand. | same | 409 `SYSTEM_STATUS` |
| A customer can cancel only an unpaid order. | `POST /orders/:id/cancel` | 409 `ORDER_NOT_CANCELLABLE` |
| A paid order cannot be cancelled by hand; it needs a refund first. | `PATCH /admin/orders/:id/status` | 409 `REFUND_REQUIRED` |
| Every move is recorded with who and when. | all status changes | n/a |

## Payments (Maya Checkout sandbox)
| Rule | Endpoint | Error when violated |
|---|---|---|
| Only a verified payment event can mark an order paid. The redirect page never does. | `POST /webhooks/maya` | n/a |
| The webhook signature (RSA-SHA256) and a 5-minute timestamp window are checked. Missing or wrong signature changes nothing. | `POST /webhooks/maya` | 401 `INVALID_SIGNATURE` |
| Each payment event is stored once. A repeated event is acknowledged and ignored. | `POST /webhooks/maya` | n/a (200, outcome `duplicate`) |
| The paid amount and currency must equal the order. If not, the order is flagged for review. | webhook and reconciliation | order flagged |
| A payment that arrives after the order was cancelled or expired is never marked paid. The order is flagged "refund required". | webhook and reconciliation | order flagged |
| A missed webhook is recovered by asking the gateway: when the customer returns, and by a job every minute. | `POST /orders/:id/sync-payment`, background job | n/a |
| Only unpaid orders inside their payment window can be paid. | `POST /orders/:id/pay` | 409 `ORDER_NOT_PAYABLE`, 409 `PAYMENT_WINDOW_ENDED` |

## PC builds (differentiated features)
| Rule | Endpoint | Error when violated |
|---|---|---|
| Processor and motherboard must use the same socket. | `POST /builds/check` | issue `SOCKET_MISMATCH` (error) |
| Every memory kit must match the motherboard's memory type (processor's if no motherboard). | `POST /builds/check` | issue `RAM_TYPE_MISMATCH` (error) |
| The power supply must cover the estimated draw (processor + graphics card + 75 W) plus 40% headroom, rounded up to 50 W, and never less than the graphics card maker's advice. | `POST /builds/check` | issue `PSU_TOO_WEAK` (error) |
| At most 1 processor, motherboard, graphics card and power supply; 2 memory kits; 4 storage drives. | `POST /builds/check` | issue `TOO_MANY_PARTS` (error) |
| Missing, out-of-stock and spec-less parts are warnings, not errors. | `POST /builds/check` | issues `MISSING_PART`, `OUT_OF_STOCK`, `SPEC_MISSING` (warning) |
| Only existing, sold products can be saved in a build. | `POST/PATCH /builds` | 422 `VALIDATION_ERROR` |
| A customer can save at most 20 builds. | `POST /builds` | 409 `BUILD_LIMIT` |
| A build with compatibility errors cannot be added to the cart. | `POST /builds/:id/add-to-cart` | 409 `BUILD_INCOMPATIBLE` |
| Adding a build to the cart is all or nothing, and respects stock including what is already in the cart. | `POST /builds/:id/add-to-cart` | 409 `INSUFFICIENT_STOCK` |
| A shared build is read-only, hides who owns it, and always shows live prices and stock. | `GET /builds/shared/:code` | 404 `SHARE_NOT_FOUND` |