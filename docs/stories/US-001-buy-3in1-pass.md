---
id: US-001
title: Buy package & redeem via QR
version: v0.4.1
last_updated: 2025-12-04T16:00:00+08:00
api_ssot: openapi/openapi-3.0.3.json
types_ssot: src/types/domain.ts
owner: Product
status: "Done"
priority: High
business_requirement: "PRD-001"
cards:
  - db-baseline               # 数据库基础架构
  - catalog-endpoint
  - order-create
  - payment-webhook
  - tickets-issuance
  - my-tickets
  - qr-generation-api
  - operators-login
  - venue-enhanced-scanning
  - reports-redemptions
notes:
  - Catalog uses products[].id/name (not product_id/product_name)
  - QR generation via /qr/:code returns encrypted QR payload
  - /operators/login responds { operator_token } (operator_id lives in JWT claims if needed)
  - /venue/scan returns entitlements[]; check remaining_uses there
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
- When they call `/my/tickets` and `POST /qr/:code`
- Then tickets include entitlements and a short-lived encrypted QR is returned

**Story D — Redemption & reporting**
- Given an operator with valid JWT token
- When `POST /venue/scan` is called with a valid QR token and function
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
- Related cards: `order-create`, `payment-webhook`, `tickets-issuance`, `my-tickets`, `qr-generation-api`, `venue-enhanced-scanning`
