---
id: US-001
title: Buy a package and redeem via QR across multiple functions
owner: Product
status: Approved
priority: High
last_update: 2025-10-19T23:24:28+0800
---

## Business goal
Enable a user to purchase a package with multiple functions (bus, ferry, museum), receive tickets, and redeem at gates with traceability.

## Actors
- Buyer (end-user)
- Operator (gate staff)
- Business Analyst (reporting)

## Scope (in)
- Browse → Order → Payment notify → Issue tickets → Show QR → Scan → Reporting

## Out of scope (now)
- Refunds, reschedules, partner revenue share, coupons marketplace

## Acceptance (Given/When/Then)
**Story A — Purchase**  
- Given products are for sale  
- When the user creates an order (idempotent)  
- Then inventory is reserved and an order is `PENDING_PAYMENT`

**Story B — Payment & issuance (sync)**  
- Given a pending order  
- When the gateway notifies SUCCESS (valid HMAC)  
- Then order becomes `PAID`, inventory commits, and tickets are issued exactly once

**Story C — View & QR**  
- Given the user has tickets  
- When they call `/my/tickets` and `/tickets/{code}/qr-token`  
- Then tickets include entitlements and a short-lived token is returned

**Story D — Redemption & reporting**  
- Given an operator session  
- When `/tickets/scan` is called with a valid token and function  
- Then remaining uses decrement atomically and a redemption event is stored

## Non-functional constraints
- Idempotency for order create & webhook  
- Atomic decrement at scan  
- Rotating QR token (≤ 60s)

## Data notes
- Inventory invariant: reserved + sold ≤ sellable  
- Redemption events include operator, location, ts

## Links
- OAS: `/openapi/openapi.json`  
- Related cards: `order-create-idempotent`, `payment-webhook`, `tickets-issuance`, `my-tickets`, `qr-token`, `tickets-scan`
