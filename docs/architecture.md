# System architecture

## 1. Context
```mermaid
flowchart LR
    Customer["Customer (browser)"]
    Admin["Admin (browser)"]
    subgraph Vercel["Vercel (HTTPS)"]
        Web["React app (Vite build)"]
    end
    subgraph Render["Render (HTTPS)"]
        Api["Express API"]
    end
    Db[("Supabase PostgreSQL")]
    Maya["Maya Checkout (sandbox)"]
    Gemini["Google Gemini API"]

    Customer --> Web
    Admin --> Web
    Web -->|"JSON over HTTPS with a Bearer token"| Api
    Api -->|"service role key, server only"| Db
    Api -->|"create checkout, find payment"| Maya
    Maya -->|"signed webhook"| Api
    Api -->|"catalog and request text only"| Gemini
    Web -.->|"redirects the customer to pay"| Maya
```
Trust boundaries: the browser is untrusted (prices, roles and quantities are always re-checked on the server). The database key and the AI key exist only on the server. Maya's webhook is untrusted until its signature is verified.

## 2. Layers of the backend
```mermaid
flowchart TB
    Req["HTTP request"] --> MW["Middleware: request id, CORS, helmet, rate limits, authenticate, authorize, validate"]
    MW --> Routes["Routes (routers only)"]
    Routes --> Controllers["Controllers (read validated input, one service call, format the response)"]
    Controllers --> Services["Services (business rules)"]
    Services --> Patterns["Patterns: payment providers, compatibility rules, AI output guards, order state machine"]
    Services --> Repos["Repositories (data access only)"]
    Repos --> Db[("PostgreSQL tables and SQL functions")]
    Patterns -.-> Gateways["Maya, PayMongo, Gemini"]
```
Rules that must not be split up (stock reservation, coupon redemption, marking an order paid) live in SQL functions, so each runs as one database transaction.

## 3. Checkout sequence, including the webhook and the missed-webhook paths
```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant W as React app
    participant A as Express API
    participant D as PostgreSQL
    participant M as Maya

    C->>W: Click Place order
    W->>A: POST orders with an Idempotency-Key
    A->>D: place_order locks stock, reserves it for 15 minutes, redeems the coupon
    D-->>A: order in status pending_payment
    A-->>W: 201 order
    C->>W: Click Pay with Maya
    W->>A: POST orders/id/pay
    A->>M: Create checkout (requestReferenceNumber is the order id)
    M-->>A: checkoutId and redirectUrl
    A->>D: attach_payment_session
    A-->>W: checkoutUrl
    W->>M: Redirect the customer to the hosted payment page
    C->>M: Pay with a sandbox card

    alt Happy path, the signed webhook arrives
        M->>A: POST webhooks/maya
        A->>A: Verify signature and timestamp
        A->>D: store the event once, then mark_order_paid
        D-->>A: paid, or duplicate, amount_mismatch, late_payment
        A-->>M: 200
    else The webhook is missed or slow
        M-->>W: Redirect to orders/id with payment=success
        W->>A: POST orders/id/sync-payment (repeats every 3 seconds)
        A->>M: Find the payment by order id
        A->>D: mark_order_paid (the same function)
    end

    Note over A,D: Every minute a background job also recovers paid orders with no webhook, expires unpaid orders and returns their stock, and closes payment sessions of cancelled or expired orders
```

## 4. Order lifecycle
```mermaid
stateDiagram-v2
    [*] --> pending_payment
    pending_payment --> paid: verified payment
    pending_payment --> cancelled: customer or admin cancels
    pending_payment --> expired: 15 minutes pass
    paid --> processing: admin
    paid --> cancelled: after a refund
    processing --> shipped: admin
    shipped --> delivered: admin
```
"paid" and "expired" are set only by the system. A payment that arrives for a cancelled or expired order is never marked paid: the order is flagged for a refund.

## 5. Background work
`backend/server.js` runs one sweep every minute: recover paid orders whose webhook never arrived, expire stale unpaid orders (returning stock and coupons), and close unused payment sessions. The database functions lock rows, so running the sweep on two server instances is safe.

## 6. Error format
Every failure uses `{ success: false, error: { code, message, details? }, requestId }`. Stack traces, SQL and provider messages go to the server log only.