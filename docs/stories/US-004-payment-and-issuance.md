---
id: US-004
title: Payment notification marks order paid and issues tickets (synchronous)
owner: Product
status: "Done"
priority: High
last_update: 2025-10-19T23:44:00+0800
business_requirement: "PRD-001"
cards:
  - payment-webhook
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
**Story A — 支付成功**
- Given 存在一笔待支付订单，且支付网关发送了成功通知
- When 系统收到支付成功通知
- Then 订单状态变为"已支付"，库存扣减一次，票券生成一次

**Story B — 重复通知**
- Given 同一笔支付通知再次到达
- When 系统收到重复的支付通知
- Then 系统忽略重复通知，不会重复出票

**Story C — 数据冲突**
- Given 同一支付交易号对应不同的订单或金额
- When 系统收到异常支付通知
- Then 系统拒绝处理并标记为冲突

## Non-functional constraints
- Idempotency on (gateway,gateway_txn_id)
- Transactional update for order + inventory; issuance is idempotent per order

## Links
- Cards: payment-webhook