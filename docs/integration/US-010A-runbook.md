# US-010A: DeepTravel 旅客闭环体验 Runbook

端到端验证旅客从商品浏览到支付成功生成票券的完整闭环。

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-010A |
| **PRD** | PRD-008 |
| **Status** | Done |
| **Last Updated** | 2025-12-18 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ⚠️ 部分自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/prd-008-*.json` |
| Newman Command | `npm run test:prd 008` |
| Related Cards | `miniprogram-product-catalog`, `miniprogram-order`, `wallyt-payment`, `bundle-ticket-engine` |

---

## 🎯 Business Context

### 用户旅程

```
旅客浏览商品目录
  → 查看商品详情与权益
  → 检查库存可用性
  → 创建订单
  → 完成微信支付
  → 系统自动生成票券
  → 旅客查看票券与二维码
```

### 业务验收标准 (来自 Story)

| Sub-Story | Given | When | Then |
|-----------|-------|------|------|
| **A - 查询** | 管理后台已发布可售商品 | 旅客搜索商品 | 系统展示商品列表、详情与库存 |
| **B - 下单** | 旅客选择商品与数量 | 旅客提交订单 | 系统生成待支付订单 |
| **C - 支付** | 订单状态为待支付 | 旅客完成微信支付 | 系统显示支付成功 |
| **D - 出票** | 支付已完成 | 系统处理支付回调 | 自动生成电子票券，旅客可查看 |

### 测试目标

- [ ] 验证商品目录查询与详情展示
- [ ] 验证订单创建与支付流程
- [ ] 验证票券生成与二维码获取
- [ ] 验证各 API 端点正常响应

---

## 🔧 Prerequisites

### 环境准备

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **启动命令** | `npm run build && npm start` | 编译并启动服务 |
| **健康检查** | `curl http://localhost:8080/healthz` | 验证服务运行中 |

### 测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| **User** | `Authorization: Bearer test-user-token` | 用户端操作 |
| **Traveler ID** | `buyer-1001` | 旅客标识 |

### 前置数据

| 数据 | 要求 | 验证方式 |
|------|------|----------|
| Product 101 | 3-in-1 pass 存在且有库存 | `GET /miniprogram/products` 返回包含 id=101 |
| Product Functions | 权益配置完整 | 产品详情 functions[] 非空 |

---

## 🧪 Test Scenarios

### Module 1: 商品目录查询

**Related Card**: `miniprogram-product-catalog`
**Coverage**: 3/3 ACs (100%)

#### TC-TRV-001: 获取商品列表

**AC Reference**: `miniprogram-product-catalog.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 服务运行中，商品数据已配置 | GET /miniprogram/products | 返回 200，包含商品列表 |

**执行命令**:
```bash
curl -s http://localhost:8080/miniprogram/products | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `products.length >= 1`
- [ ] 每个商品有 id, name, price
- [ ] 支持分页参数

---

#### TC-TRV-002: 获取商品详情

**AC Reference**: `miniprogram-product-catalog.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品 101 存在 | GET /miniprogram/products/101 | 返回商品详情与权益信息 |

**执行命令**:
```bash
curl -s http://localhost:8080/miniprogram/products/101 | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 functions[] 权益数组
- [ ] 每个 function 有 code, label, quantity
- [ ] 返回价格与描述信息

---

#### TC-TRV-003: 检查库存可用性

**AC Reference**: `miniprogram-product-catalog.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品 101 有库存 | GET /miniprogram/products/101/availability | 返回库存可用状态 |

**执行命令**:
```bash
curl -s "http://localhost:8080/miniprogram/products/101/availability?quantity=1" | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `available` 为 true
- [ ] 返回可用数量信息

---

### Module 2: 订单创建与管理

**Related Card**: `miniprogram-order`
**Coverage**: 4/4 ACs (100%)

#### TC-TRV-004: 创建订单

**AC Reference**: `miniprogram-order.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品 101 有库存，用户已认证 | POST /miniprogram/orders | 返回订单 ID，状态为 PENDING |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/miniprogram/orders \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-user-token' \
  -d '{
    "product_id": 101,
    "quantity": 1,
    "order_no": "DT-ORDER-'$(date +%s)'",
    "customer_type": "direct"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200/201
- [ ] 响应包含 `order_id`
- [ ] `status` 为 "PENDING" 或 "PENDING_PAYMENT"
- [ ] 保存 `order_id` 供后续步骤使用

---

#### TC-TRV-005: 查询订单列表

**AC Reference**: `miniprogram-order.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已创建订单 | GET /miniprogram/orders | 返回用户订单列表 |

**执行命令**:
```bash
curl -s http://localhost:8080/miniprogram/orders \
  -H 'Authorization: Bearer test-user-token' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含之前创建的订单
- [ ] 每个订单有 order_id, status, created_at

---

#### TC-TRV-006: 查询订单详情

**AC Reference**: `miniprogram-order.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单 ORDER_ID 存在 | GET /miniprogram/orders/:id | 返回订单完整详情 |

**执行命令**:
```bash
# 使用之前创建的 ORDER_ID
curl -s http://localhost:8080/miniprogram/orders/$ORDER_ID \
  -H 'Authorization: Bearer test-user-token' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含订单项目明细
- [ ] 包含金额信息

---

#### TC-TRV-007: 订单不存在返回 404

**AC Reference**: `miniprogram-order.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单 999999 不存在 | GET /miniprogram/orders/999999 | 返回 404 |

**执行命令**:
```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  http://localhost:8080/miniprogram/orders/999999 \
  -H 'Authorization: Bearer test-user-token'
```

**验证点**:
- [ ] 返回状态码 404
- [ ] 错误消息包含 "not found"

---

### Module 3: 支付流程

**Related Card**: `wallyt-payment`
**Coverage**: 2/2 ACs (100%)

#### TC-TRV-008: 模拟支付成功

**AC Reference**: `miniprogram-order.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单状态为 PENDING | POST /miniprogram/orders/:id/simulate-payment | 订单状态变为 PAID |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/miniprogram/orders/$ORDER_ID/simulate-payment \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-user-token' \
  -d '{"amount": 19900}' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 订单状态变为 "PAID"
- [ ] 触发票券生成流程

---

#### TC-TRV-009: 重复支付幂等性

**AC Reference**: `wallyt-payment.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单已支付 | 再次调用 simulate-payment | 返回相同结果，不重复扣款 |

**执行命令**:
```bash
# 再次调用支付接口
curl -s -X POST http://localhost:8080/miniprogram/orders/$ORDER_ID/simulate-payment \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-user-token' \
  -d '{"amount": 19900}' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 订单状态仍为 "PAID"
- [ ] 不产生重复支付记录

---

### Module 4: 票券生成与查看

**Related Card**: `bundle-ticket-engine`
**Coverage**: 3/3 ACs (100%)

#### TC-TRV-010: 支付后票券自动生成

**AC Reference**: `bundle-ticket-engine.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单已支付成功 | 查询订单详情 | 包含已生成的票券信息 |

**执行命令**:
```bash
curl -s http://localhost:8080/miniprogram/orders/$ORDER_ID \
  -H 'Authorization: Bearer test-user-token' | jq '.tickets'
```

**验证点**:
- [ ] tickets 数组非空
- [ ] 每张票券有 ticket_code
- [ ] 票券状态为 "ACTIVE"

---

#### TC-TRV-011: 获取票券二维码

**AC Reference**: `bundle-ticket-engine.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券已生成且状态为 ACTIVE | POST /miniprogram/tickets/:code/qr | 返回二维码数据 |

**执行命令**:
```bash
# 获取票券 code
TICKET_CODE=$(curl -s http://localhost:8080/miniprogram/orders/$ORDER_ID \
  -H 'Authorization: Bearer test-user-token' | jq -r '.tickets[0].ticket_code')

# 生成二维码
curl -s -X POST http://localhost:8080/miniprogram/tickets/$TICKET_CODE/qr \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-user-token' \
  -d '{"expiry_minutes": 5}' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 qr_data 或 qr_token
- [ ] 包含过期时间信息

---

#### TC-TRV-012: 票券不存在返回 404

**AC Reference**: `bundle-ticket-engine.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券 INVALID-CODE 不存在 | POST /miniprogram/tickets/INVALID-CODE/qr | 返回 404 |

**执行命令**:
```bash
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST http://localhost:8080/miniprogram/tickets/INVALID-CODE/qr \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer test-user-token' \
  -d '{"expiry_minutes": 5}'
```

**验证点**:
- [ ] 返回状态码 404
- [ ] 错误消息包含 "not found"

---

## 📊 Test Summary

### 验证清单

| 模块 | 测试用例数 | 状态 |
|------|-----------|------|
| Module 1: 商品目录 | 3 | pending |
| Module 2: 订单管理 | 4 | pending |
| Module 3: 支付流程 | 2 | pending |
| Module 4: 票券生成 | 3 | pending |
| **Total** | **12** | - |

### 自动化测试

```bash
# 运行 PRD-008 自动化测试
npm run test:prd 008

# 运行快速冒烟测试
npx newman run postman/QUICK-SMOKE-TESTS.postman_collection.json
```

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (4 scenarios)

- [ ] **TC-PROD-001**: 浏览商品目录并查看详情
  - 操作: 访问商品列表 API → 查看商品 101 详情 → 检查库存可用性
  - **Expected**: 商品列表包含 id、名称、价格；详情包含权益配置；库存状态返回 available: true

- [ ] **TC-ORDER-001**: 创建订单
  - 操作: 选择商品 101 → 提交订单创建请求（quantity=1）
  - **Expected**: 返回 order_id，订单状态为 PENDING 或 PENDING_PAYMENT

- [ ] **TC-PAY-001**: 完成支付并生成票券
  - 操作: 获取待支付订单 → 模拟支付成功
  - **Expected**: 订单状态变为 PAID，自动生成票券，票券状态为 ACTIVE

- [ ] **TC-VERIFY-001**: 获取票券二维码
  - 操作: 查询订单详情获取 ticket_code → 请求生成二维码
  - **Expected**: 返回 qr_data/qr_token，包含过期时间信息

### Round 2: 异常场景 (4 scenarios)

- [ ] **TC-ORDER-002**: 订单不存在
  - 操作: 查询不存在的订单 ID（999999）
  - **Expected**: 返回 404，错误信息包含 "not found"

- [ ] **TC-PAY-002**: 重复支付幂等性
  - 操作: 对同一订单重复调用 simulate-payment
  - **Expected**: 返回成功，订单状态保持 PAID，不产生重复支付记录

- [ ] **TC-VERIFY-002**: 票券不存在
  - 操作: 请求生成无效票券码（INVALID-CODE）的二维码
  - **Expected**: 返回 404，错误信息包含 "not found"

- [ ] **TC-PROD-002**: 库存不足场景
  - 操作: 查询库存不足商品的可用性（quantity > 可用库存）
  - **Expected**: 返回 available: false 或库存不足提示

---

## 📎 相关资产

| 资产 | 路径 |
|------|------|
| Story 文档 | `docs/stories/US-010A-traveler-loop.md` |
| PRD 文档 | `docs/prd/PRD-008-miniprogram-phase1.md` |
| Newman Collection | `postman/auto-generated/prd-008-*.json` |
| Frontend E2E | `docs/integration/US-010A-frontend-e2e-runbook.md` |

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 新增 QA E2E Checklist |
| 1.0 | 2025-12-18 | Claude | 初始版本 |
