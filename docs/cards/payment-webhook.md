---
card: "Payment webhook"
slug: payment-webhook
team: "A - Commerce"
oas_paths: ["/payments/notify"]
migrations: []
status: "Done"
branch: ""
pr: ""
newman_report: ""
last_update: "2025-10-19T22:40:00+0800"
related_stories: ["US-001", "US-004"]
---

# Payment webhook — Dev Notes

## Purpose
Receive payment notification from payment gateway and synchronously issue tickets.

## Contract
- `POST /payments/notify` — webhook from payment provider

## Request
```json
{
  "order_id": 12345,
  "payment_status": "SUCCESS",
  "paid_at": "2025-01-01T12:00:00Z",
  "signature": "abc123"
}
```

## Rules
1) Validate signature (mock validation for now)
2) Find order by ID
3) Check order status is PENDING
4) Update order status to PAID with paid_at timestamp
5) Commit inventory (reserved → sold)
6) **Synchronously call ticket issuance module**
7) Return 200 OK

## Invariants
- Idempotent: Multiple calls with same order_id return same result
- Only PENDING orders can be marked as PAID
- Inventory must be committed atomically with order update

## Error Cases
- Invalid signature → 401
- Order not found → 404
- Order already paid → 200 (idempotent)
- Ticket issuance fails → 500 (rollback order status)

## Observability
- Log `payment.webhook.received` with order_id
- Log `payment.webhook.success` or `payment.webhook.failed`
- Metric `payment.webhook.count`