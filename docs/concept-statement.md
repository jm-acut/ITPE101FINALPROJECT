# Concept statement: NEXUS PC

**Student:** (John Michael G. Acut) · **Course:** ITPE101 · **Date:** (November,12,2026)

## The business
NEXUS PC is an online store for PC components (processors, motherboards, memory, graphics cards, storage and power supplies). The product is not just parts: it is a PC that actually works. Buying parts that do not fit each other is the most common and most expensive mistake for first-time builders.

## Customers
Students, gamers and first-time PC builders who know what they want to do with a PC but not which parts fit together. They want to browse, compare, save a plan, share it, and pay safely.

## Administrator
Store staff who keep the catalog accurate (prices, stock and the technical specs the rules depend on), adjust inventory with a recorded reason, manage coupons, and move paid orders through processing, shipping and delivery. They review orders flagged for refund or review.

## Why the concept needs custom rules
Compatibility is the product. A generic store would happily sell an AM5 processor with an AM4 motherboard. NEXUS PC must decide, on the server, whether parts work together and refuse to sell a broken build.

## Differentiated features
1. **Compatibility checker.** The server evaluates a list of parts against rules: one socket for processor and motherboard, one memory type for the board and every memory kit, a power supply large enough for the estimated draw plus headroom, and limits on how many parts of each kind a build may have. Rule enforced: *incompatible parts are reported with a specific reason* (endpoint `POST /api/v1/builds/check`).
2. **Build creator with save, share and build-to-cart.** Customers save named builds to their account and share a read-only link. Rule enforced: *a build with compatibility errors, or without enough stock for every part, cannot be added to the cart, and adding is all-or-nothing* (endpoint `POST /api/v1/builds/:id/add-to-cart`).

## Data model changes
`products.specs` (JSON) stores the technical attributes the rules read. `pc_builds` stores saved builds and an optional share code.