---
card: "Order create (idempotent)"
slug: order-create-idempotent
team: "A - Commerce"
oas_paths: ["/orders"]
migrations: ["migrations/0002_orders.sql"]
status: "Done"
branch: "feat/a-orders-create"
pr: ""
newman_report: "reports/newman/order-create.json"
last_update: "2025-10-19T17:59:00+08:00"
---

# Purpose
Create order and reserve inventory atomically; idempotent via (user_id, out_trade_no).

# Contract
See `/openapi/openapi.json` paths: /orders (3.0.3). Examples live in the card.

# Rules & Writes (TX)
1) Idempotency check & payload hash → return same order or 409.
2) Lock inventory rows (`SELECT ... FOR UPDATE`), check stock rule.
3) Insert `orders` + `order_items`, update `reserved_count`.
4) Emit `orders.created`.

# Evidence
- Postman run: `{{baseUrl}}/orders` … result: 200 (retry: same order_id)
- Newman JSON: `reports/newman/order-create.json`