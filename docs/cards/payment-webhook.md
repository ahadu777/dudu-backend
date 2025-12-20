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

## Acceptance — Given / When / Then

### 正常流程

#### AC-1: 支付成功 - 订单状态更新
- **Given** 订单 order_id=123 存在且 status='PENDING'
- **When** `POST /payments/notify` `{ order_id: 123, payment_status: "SUCCESS", paid_at: "...", signature: "valid" }`
- **Then** 返回 200 OK
- **And** 订单 status 变为 'PAID'
- **And** 订单 paid_at 被记录

#### AC-2: 支付成功 - 库存确认
- **Given** 订单包含 product_id=101, qty=2
- **When** 支付成功通知处理完成
- **Then** `products.reserved` 减少 2
- **And** `products.sold` 增加 2

#### AC-3: 支付成功 - 同步出票
- **Given** 订单 order_id=123 支付成功
- **When** webhook 处理完成
- **Then** 同步创建票券（tickets 表有新记录）
- **And** 票券数量 = 订单 qty

#### AC-4: 幂等性 - 重复支付通知
- **Given** 订单 order_id=123 已经是 'PAID' 状态
- **When** 再次 `POST /payments/notify` 相同 order_id
- **Then** 返回 200 OK（幂等）
- **And** 不重复创建票券

### 异常流程

#### AC-5: 无效签名
- **Given** signature 字段无效或缺失
- **When** `POST /payments/notify`
- **Then** 返回 401，`{ error: "INVALID_SIGNATURE" }`
- **And** 订单状态不变

#### AC-6: 订单不存在
- **Given** order_id=99999 不存在
- **When** `POST /payments/notify` `{ order_id: 99999, ... }`
- **Then** 返回 404，`{ error: "ORDER_NOT_FOUND" }`

#### AC-7: 订单非 PENDING 状态
- **Given** 订单 status='CANCELLED'
- **When** `POST /payments/notify`
- **Then** 返回 400/409，`{ error: "INVALID_ORDER_STATUS" }`

#### AC-8: 出票失败回滚
- **Given** 出票模块返回错误
- **When** 支付通知处理中
- **Then** 返回 500
- **And** 订单状态回滚（不变为 PAID）
- **And** 库存不提交

### 边界情况

#### AC-9: 支付失败通知
- **Given** 订单 order_id=123 存在且 status='PENDING'
- **When** `POST /payments/notify` `{ payment_status: "FAILED" }`
- **Then** 返回 200 OK
- **And** 订单状态可更新为 'CANCELLED' 或保持 'PENDING'
- **And** 释放预留库存

#### AC-10: 并发支付通知
- **Given** 两个相同 order_id 的支付通知同时到达
- **When** 并发处理
- **Then** 只有一个成功更新订单状态
- **And** 另一个返回幂等响应