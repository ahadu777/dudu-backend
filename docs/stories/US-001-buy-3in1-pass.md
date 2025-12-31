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
  - catalog-endpoint
  - order-create
  - wallyt-payment          # 替代已废弃的 payment-webhook
  - my-tickets
  - qr-generation-api
  - operators-login
  - venue-enhanced-scanning  # 包含核销和 /venue/redemptions
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
- Given 用户浏览可购买的套餐商品
- When 用户选择商品并提交订单
- Then 系统预留库存，用户看到订单待支付状态和15分钟支付倒计时

**Story B — Payment & issuance (sync)**
- Given 用户有一笔待支付订单
- When 用户完成支付
- Then 订单状态变为已支付，用户收到票券

**Story C — View & QR**
- Given 用户已购买票券
- When 用户查看我的票券并请求二维码
- Then 用户看到票券权益列表和用于核销的动态二维码

**Story D — Redemption & reporting**
- Given 操作员已登录验票系统
- When 操作员扫描用户的二维码
- Then 系统显示核销结果，用户权益使用次数减少，核销记录被保存

## Non-functional constraints
- Idempotency for order create & webhook  
- Atomic decrement at scan  
- Rotating QR token (≤ 60s)

## Data notes
- Inventory invariant: reserved + sold ≤ sellable  
- Redemption events include operator, location, ts

## Links
- OAS: `/openapi/openapi.json`
- Related cards: `order-create`, `wallyt-payment`, `my-tickets`, `qr-generation-api`, `venue-enhanced-scanning`
