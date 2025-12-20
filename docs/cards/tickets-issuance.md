---
card: "Tickets issuance (sync)"
slug: tickets-issuance
team: "B - Fulfillment"
oas_paths: []
migrations: ["db/migrations/0005_tickets_table.sql"]
status: "Done"
readiness: "mvp"
branch: ""
pr: ""
newman_report: "reports/newman/tickets-issuance.json"
last_update: "2025-10-24T17:30:00+08:00"
related_stories: ["US-001", "US-004"]
---

# Tickets issuance (sync) — Dev Notes

## Status & Telemetry
- Status: Done
- Readiness: mvp
- Spec Paths: Internal service (no direct API endpoints)
- Migrations: db/migrations/0005_tickets_table.sql
- Newman: Internal service • reports/newman/tickets-issuance.json
- Last Update: 2025-10-24T17:30:00+08:00

## 0) Prerequisites
- order-create card implemented (orders must exist)
- payment-webhook card calls this service
- Product catalog with function definitions available
- Mock data store with ticket storage capability

## 1) API Sequence (Context)
```mermaid
sequenceDiagram
  participant WEBHOOK as Payment Webhook
  participant SERVICE as Ticket Service
  participant STORE as Mock Store
  WEBHOOK->>+SERVICE: issueTicketsForPaidOrder(orderId)
  SERVICE->>STORE: getOrder(orderId)
  STORE-->>SERVICE: order with items
  SERVICE->>SERVICE: Generate tickets for each item
  SERVICE->>STORE: saveTickets(tickets[])
  SERVICE-->>-WEBHOOK: tickets[]
```

## 2) Contract (OAS 3.0.3)
```yaml
# Internal TypeScript service interface - no REST API
interface TicketService {
  issueTicketsForPaidOrder(orderId: number): Promise<Ticket[]>
}

# Ticket entity schema
components:
  schemas:
    Ticket:
      type: object
      properties:
        ticket_code:
          type: string
          description: Unique ticket identifier
          example: "TKT-123-1-1"
        order_id:
          type: integer
          description: Order that generated this ticket
        user_id:
          type: integer
          description: Ticket owner
        product_id:
          type: integer
          description: Product this ticket represents
        status:
          type: string
          enum: [valid, used, void]
          description: Current ticket status
        valid_from:
          type: string
          format: date-time
          description: When ticket becomes valid
        valid_until:
          type: string
          format: date-time
          description: When ticket expires
        issued_at:
          type: string
          format: date-time
          description: When ticket was created
        functions:
          type: array
          items:
            type: object
            properties:
              function_code:
                type: string
                example: "bus"
              label:
                type: string
                example: "Bus Ride"
              quantity:
                type: integer
                example: 2
          description: Entitlements included with this ticket
```

## 3) Invariants
- Only PAID orders can have tickets issued
- Ticket codes must be globally unique across all tickets
- Each product function becomes a ticket entitlement
- One ticket per quantity unit (qty=2 → 2 separate tickets)
- Idempotent: Multiple calls with same orderId return same tickets
- Tickets inherit validity period from product configuration

## 4) Validations, Idempotency & Concurrency
- Validate order exists and status is PAID
- Validate all products in order exist and are active
- Generate unique ticket codes using format: `TKT-{orderId}-{itemIndex}-{ticketIndex}`
- Check for existing tickets for orderId (idempotency)
- Use transaction boundaries to ensure atomicity
- Handle concurrent issuance attempts gracefully

## 5) Rules & Writes (TX)
**issueTicketsForPaidOrder(orderId):**
1) Begin transaction
2) Load order with FOR UPDATE lock
3) Verify order status is PAID (throw if not)
4) Check if tickets already exist for this order (return existing if found)
5) For each order item:
   - Load product details and functions
   - Create qty number of individual tickets
   - Generate unique ticket code for each
   - Set validity dates based on product configuration
   - Copy product functions as ticket entitlements
6) Save all tickets to store atomically
7) Update order with ticket count
8) Commit transaction
9) Log issuance completion
10) Return created tickets array

## 6) Data Impact & Transactions
**Migration:** `db/migrations/0005_tickets_table.sql`
```sql
CREATE TABLE tickets (
  ticket_code VARCHAR(50) PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  status ENUM('valid', 'used', 'void') DEFAULT 'valid',
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  functions JSON NOT NULL,
  INDEX idx_tickets_order (order_id),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_status (status),
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);
```

**Data Flow:**
- Input: Order ID (from payment webhook)
- Processing: Generate individual tickets based on order items
- Output: Array of created ticket entities
- Storage: Tickets stored in mock data store

## 7) Observability
- Log `tickets.issuance.started` with `{order_id, item_count}`
- Log `tickets.issuance.completed` with `{order_id, tickets_created}`
- Log `tickets.issuance.failed` with `{order_id, error_reason}`
- Log `tickets.issuance.idempotent` with `{order_id, existing_count}`
- Metric `tickets.issued.count` - Total tickets created
- Metric `tickets.issuance.duration_ms` - Performance tracking
- Alert on issuance failures or unusual delays

## 8) Acceptance — Given / When / Then

### 正常流程

#### AC-1: 基础出票
- **Given** 订单 order_id=123 状态为 PAID，包含 2x Transport Pass (product 101)
- **When** `issueTicketsForPaidOrder(123)` 被调用
- **Then** 创建 2 张独立票券，每张有唯一 ticket_code
- **And** 每张票券包含 bus/ferry/metro 权益

#### AC-2: 混合产品出票
- **Given** 订单包含 1x Transport Pass + 1x Day Pass
- **When** 出票
- **Then** 创建 2 张票券，各自权益基于对应产品

#### AC-3: 幂等性
- **Given** 订单 order_id=123 已完成出票
- **When** 再次调用 `issueTicketsForPaidOrder(123)`
- **Then** 返回相同的票券（不创建重复）

### 异常流程

#### AC-4: 订单未支付
- **Given** 订单 order_id=456 状态为 PENDING
- **When** 尝试出票
- **Then** 抛出错误，不创建任何票券

#### AC-5: 产品不存在
- **Given** 订单引用了不存在的 product_id=99999
- **When** 尝试出票
- **Then** 抛出错误，包含产品验证信息

#### AC-6: 订单不存在
- **Given** order_id=88888 不存在
- **When** 尝试出票
- **Then** 抛出错误，`{ error: "ORDER_NOT_FOUND" }`

### 边界情况

#### AC-7: 大量商品出票
- **Given** 订单包含 50 个不同商品，每个 qty=2
- **When** 出票
- **Then** 创建 100 张票券，所有票券正确关联权益
- **And** 处理时间 < 5 秒

#### AC-8: 并发出票请求
- **Given** 两个线程同时对 order_id=123 调用出票
- **When** 并发执行
- **Then** 只有一个线程创建票券，另一个返回已存在的票券
- **And** 不会创建重复票券

#### AC-9: 票券代码唯一性
- **Given** 系统已有 10000 张票券
- **When** 新订单出票
- **Then** 新票券的 ticket_code 全局唯一
- **And** 格式符合 `TKT-{orderId}-{itemIndex}-{ticketIndex}`

## 9) Postman Coverage
- Internal service testing via ticket-dependent endpoints:
- POST /payments/notify → triggers ticket issuance → verify tickets created
- GET /my/tickets → verify issued tickets appear for user
- POST /tickets/{code}/qr-token → verify issued tickets can generate QR codes
- Idempotency test: Multiple payment webhooks for same order
- Error handling: Invalid order IDs, unpaid orders, missing products
- Load test: Bulk ticket issuance performance