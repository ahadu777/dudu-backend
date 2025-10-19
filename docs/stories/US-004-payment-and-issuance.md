---
id: US-004
title: Payment notification marks order paid and issues tickets (synchronous)
owner: Product
status: Approved
priority: High
last_update: 2025-10-19T23:44:00+0800
---

## Business goal
On successful payment, mark the order as PAID, commit inventory exactly once, and issue tickets exactly once—all within a simple, debuggable flow.

## Actors
- Payment gateway (webhook)
- Orders subsystem
- Tickets issuance (internal call)

## Scope (in)
- Webhook verification (HMAC) → Deduplicate by gateway_txn_id → Mark order PAID → Commit inventory → Synchronous call to issue tickets

## Acceptance (Given/When/Then)
**Story A — Success**
- Given a PENDING_PAYMENT order and a valid HMAC webhook with status=SUCCESS
- When POST /payments/notify
- Then order → PAID, inventory committed once, and tickets issued exactly once; response includes { ok:true, processed:true, issued:true, tickets:n }

**Story B — Duplicate**
- Given the same gateway_txn_id arrives again
- When POST /payments/notify
- Then 200 with processed:false and no double-issuance

**Story C — Conflict**
- Given the same gateway_txn_id maps to a different order_id or amount
- When POST /payments/notify
- Then 409 conflict

## Non-functional constraints
- Idempotency on (gateway,gateway_txn_id)
- Transactional update for order + inventory; issuance is idempotent per order

## Links
- Cards: payment-webhook, tickets-issuance