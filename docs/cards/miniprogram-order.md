---
card: "Mini-program order management"
slug: miniprogram-order
team: "A - Commerce"
oas_paths: [
  "/miniprogram/orders",
  "/miniprogram/orders/{orderId}"
]
migrations: [
  "016-create-orders.ts",
  "017-create-order-payments.ts",
  "018-extend-tickets-for-miniprogram.ts"
]
status: "Done"
readiness: "mvp"
branch: "init-ai"
pr: ""
newman_report: ""
postman_collection: ""
last_update: "2025-12-01T16:00:00+08:00"
related_stories: ["US-010A"]
relationships:
  depends_on: ["miniprogram-product-catalog", "wechat-auth-login"]
  triggers: ["payment-webhook"]
  data_dependencies: ["OrderEntity", "ProductEntity", "ProductInventoryEntity", "TicketEntity"]
---

## Status & Telemetry
- Status: Done
- Readiness: mvp（小程序订单创建、列表、详情）
- Spec Paths: /miniprogram/orders, /miniprogram/orders/:id
- Migrations: 016-create-orders.ts, 017-create-order-payments.ts, 018-extend-tickets-for-miniprogram.ts
- Last Update: 2025-12-01

## 0) Prerequisites
- miniprogram-product-catalog 已实现（提供商品数据）
- wechat-auth-login 已实现（用户认证）
- products 和 product_inventory 表已存在
- orders 和 order_payments 表已创建（migrations 016-017）
- tickets 表已扩展支持小程序字段（migration 018）

## 1) API Sequence (Context)
```mermaid
sequenceDiagram
  actor USER as 小程序用户
  participant API as Miniprogram API
  participant SVC as OrderService
  participant DB as Database

  USER->>+API: POST /miniprogram/orders
  API->>API: 验证 JWT Token
  API->>SVC: createOrder(userId, request)
  SVC->>DB: 幂等检查 (user_id, order_no)
  SVC->>DB: 获取产品信息
  SVC->>DB: 检查库存（悲观锁）
  SVC->>SVC: 计算价格
  SVC->>DB: 创建订单
  SVC->>DB: 预留库存
  SVC-->>-USER: 201 { order }

  USER->>+API: GET /miniprogram/orders
  API->>SVC: getOrderList(userId, page, limit)
  SVC->>DB: 查询用户订单
  SVC-->>-USER: 200 { orders[], total }

  USER->>+API: GET /miniprogram/orders/:id
  API->>SVC: getOrderDetail(userId, orderId)
  SVC->>DB: 查询订单 + 关联票券
  SVC-->>-USER: 200 { order, tickets[] }
```

## 2) Contract (OAS 3.0.3)
```yaml
paths:
  /miniprogram/orders:
    post:
      tags: [Miniprogram - Orders]
      summary: 创建订单
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [order_no, product_id, travel_date, customer_breakdown]
              properties:
                order_no:
                  type: string
                  description: "订单号（前端生成，用于幂等）"
                  example: "MP202512010001"
                product_id:
                  type: integer
                  description: "产品ID"
                  example: 106
                travel_date:
                  type: string
                  format: date
                  description: "出行日期"
                  example: "2025-12-15"
                customer_breakdown:
                  type: array
                  description: "客户明细"
                  items:
                    type: object
                    required: [customer_type, count]
                    properties:
                      customer_type:
                        type: string
                        enum: [adult, child, elderly]
                      count:
                        type: integer
                        minimum: 1
                addons:
                  type: array
                  description: "附加项（可选）"
                  items:
                    type: object
                    properties:
                      addon_id:
                        type: string
                        enum: [tokens-plan-a, tokens-plan-b, tokens-plan-c]
                      quantity:
                        type: integer
      responses:
        "201":
          description: 订单创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        "400":
          description: 请求参数错误 / 库存不足
        "401":
          description: 未授权
        "404":
          description: 产品不存在

    get:
      tags: [Miniprogram - Orders]
      summary: 获取订单列表
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: page_size
          in: query
          schema:
            type: integer
            default: 20
            maximum: 50
      responses:
        "200":
          description: 订单列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders:
                    type: array
                    items:
                      $ref: '#/components/schemas/OrderListItem'
                  total:
                    type: integer
                  page:
                    type: integer
                  page_size:
                    type: integer

  /miniprogram/orders/{orderId}:
    get:
      tags: [Miniprogram - Orders]
      summary: 获取订单详情
      security:
        - bearerAuth: []
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: 订单详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderDetailResponse'
        "404":
          description: 订单不存在

components:
  schemas:
    OrderResponse:
      type: object
      properties:
        id:
          type: integer
        order_no:
          type: string
        status:
          type: string
          enum: [pending, confirmed, in_progress, completed, cancelled, refunded]
        product_id:
          type: integer
        product_name:
          type: string
        travel_date:
          type: string
          format: date
        quantity:
          type: integer
        total:
          type: number
        pricing_context:
          $ref: '#/components/schemas/PricingContext'
        created_at:
          type: string
          format: date-time

    PricingContext:
      type: object
      properties:
        travel_date:
          type: string
        is_weekend:
          type: boolean
        customer_breakdown:
          type: array
          items:
            type: object
            properties:
              customer_type:
                type: string
              count:
                type: integer
              unit_price:
                type: number
              total:
                type: number
        addons:
          type: array
          items:
            type: object
            properties:
              addon_id:
                type: string
              name:
                type: string
              quantity:
                type: integer
              unit_price:
                type: number
              total:
                type: number
        subtotal:
          type: number
        addons_total:
          type: number

    OrderListItem:
      type: object
      properties:
        order_id:
          type: integer
        order_no:
          type: string
        status:
          type: string
        product_id:
          type: integer
        product_name:
          type: string
        travel_date:
          type: string
        quantity:
          type: integer
        total:
          type: number
        created_at:
          type: string
        paid_at:
          type: string

    OrderDetailResponse:
      allOf:
        - $ref: '#/components/schemas/OrderResponse'
        - type: object
          properties:
            paid_at:
              type: string
            tickets:
              type: array
              items:
                type: object
                properties:
                  ticket_id:
                    type: integer
                  ticket_code:
                    type: string
                  customer_type:
                    type: string
                  status:
                    type: string
                  qr_code:
                    type: string
```

## 3) Invariants
- 订单只能由已登录用户创建
- (user_id, order_no) 组合唯一（幂等性保证）
- 订单只能查看自己的（user_id 校验）
- 库存预留使用悲观锁（FOR UPDATE）
- 订单状态流转：pending → confirmed → in_progress → completed
- 订单状态流转（取消）：pending/confirmed → cancelled → refunded

## 4) Business Rules

### 订单状态定义
| 状态 | 说明 |
|------|------|
| pending | 待支付 |
| confirmed | 已支付 |
| in_progress | 部分核销 |
| completed | 全部核销 |
| cancelled | 已取消 |
| refunded | 已退款 |

### 定价规则
- 基础价格从产品表获取 `base_price`
- 周末加价（周六周日）仅适用于成人 `weekend_premium`
- 儿童/老人使用 `customer_discounts` 中的固定价格
- 附加项固定价格：
  - tokens-plan-a: ¥100 (10个代币)
  - tokens-plan-b: ¥180 (20个代币)
  - tokens-plan-c: ¥400 (50个代币)

### 库存规则
- 创建订单时预留库存（reserved += quantity）
- 仅从 direct channel 分配中扣减
- 支付成功后：reserved → sold
- 取消订单：reserved 退回

## 5) Data Impact & Transactions

### 数据库表
| 表名 | 操作 |
|------|------|
| orders | INSERT (创建), SELECT (查询) |
| product_inventory | UPDATE (预留库存) |
| tickets | SELECT (关联查询) |
| order_payments | - (后续支付功能使用) |

### 事务处理
```typescript
await AppDataSource.transaction(async (manager) => {
  // 1. 幂等检查
  // 2. 获取产品
  // 3. 悲观锁检查库存
  // 4. 计算价格
  // 5. 创建订单
  // 6. 预留库存
});
```

## 6) Observability
- Logs:
  - `miniprogram.order.created` - 订单创建成功
  - `miniprogram.order.create.error` - 订单创建失败
  - `miniprogram.order.list` - 订单列表查询
  - `miniprogram.order.detail` - 订单详情查询

## 7) Acceptance — Given / When / Then
- Given 用户已登录，When POST /miniprogram/orders with valid data，Then 返回 201 创建成功
- Given 相同 order_no，When 重复提交，Then 返回已存在的订单（幂等）
- Given 产品库存不足，When 创建订单，Then 返回 400 INSUFFICIENT_INVENTORY
- Given 产品不存在，When 创建订单，Then 返回 404 PRODUCT_NOT_FOUND
- Given 用户未登录，When 创建订单，Then 返回 401 UNAUTHORIZED
- Given 周末出行日期，When 成人购买，Then 价格包含周末加价
- Given 订单存在，When GET /miniprogram/orders/:id，Then 返回订单详情和关联票券

## 8) Implementation Files
```
src/modules/miniprogram/
├── router.ts           # 路由定义
├── order.service.ts    # 订单业务逻辑
├── order.types.ts      # 类型定义
└── product.service.ts  # 产品业务逻辑

src/models/
├── order.entity.ts         # 订单实体
└── order-payment.entity.ts # 支付记录实体

src/migrations/
├── 016-create-orders.ts              # 创建 orders 表
├── 017-create-order-payments.ts      # 创建 order_payments 表
└── 018-extend-tickets-for-miniprogram.ts # 扩展 tickets 表
```

## 9) Integration Points
- **miniprogram-product-catalog** - 获取产品信息和库存
- **wechat-auth-login** - 用户身份认证
- **payment-webhook** - 支付回调更新订单状态
- **ticket-service** - 支付成功后生成票券

## Notes
- 当前实现为 Phase 1（创建订单、查询订单）
- Phase 2 将实现支付集成（WeChat Pay）
- Phase 3 将实现票券生成和核销流程
- 订单号由前端生成，格式建议：MP{YYYYMMDD}{HHMMSS}{RANDOM}
