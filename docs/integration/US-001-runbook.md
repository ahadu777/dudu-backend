# US-001: Buy package & redeem via QR

完整端到端流程：浏览商品 → 创建订单 → 支付通知 → 出票 → 查看票券 → 生成二维码 → 操作员扫描 → 核销

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-001 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ⚠️ 部分自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-001-*.json` |
| Newman Command | `npm run test:story 001` |
| Related Cards | catalog-endpoint, order-create, payment-webhook, tickets-issuance, my-tickets, qr-generation-api, operators-login, venue-enhanced-scanning |

---

## 🎯 Business Context

### 用户旅程

```
用户浏览商品目录
  → 选择套餐并下单
  → 完成支付
  → 系统自动出票
  → 用户查看票券和权益
  → 用户生成动态二维码
  → 操作员登录验票系统
  → 扫描二维码完成核销
  → 系统记录核销事件
```

### 业务验收标准 (来自 Story)

| Sub-Story | Given | When | Then |
|-----------|-------|------|------|
| **A - Purchase** | 用户浏览可购买的套餐商品 | 用户选择商品并提交订单 | 系统预留库存，订单状态为待支付 |
| **B - Payment** | 用户有一笔待支付订单 | 用户完成支付 | 订单状态变为已支付，用户收到票券 |
| **C - View & QR** | 用户已购买票券 | 用户查看票券并请求二维码 | 显示票券权益和动态二维码 |
| **D - Redemption** | 操作员已登录验票系统 | 操作员扫描用户二维码 | 核销成功，权益使用次数减少 |

### 测试目标

- [ ] 验证完整购买到核销的端到端流程
- [ ] 验证各 API 端点正常响应
- [ ] 验证幂等性（订单创建、支付通知）
- [ ] 验证核销防重放机制

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
| **User** | `Authorization: Bearer user123` | 用户端操作（查看票券、生成二维码） |
| **Operator** | `alice / secret123` | 操作员登录，获取 operator_token |

### 前置数据

| 数据 | 要求 | 验证方式 |
|------|------|----------|
| Product 101 | 3-in-1 pass 存在且 status=active | `GET /catalog` 返回包含 id=101 |
| Product Functions | ferry, bus, mrt 权益配置 | 产品 functions[] 非空 |
| Operator alice | 用户名密码已配置 | `POST /operators/login` 成功 |

### 环境变量（可选）

```bash
# QR 加密相关
QR_ENCRYPTION_KEY=your-encryption-key
QR_SIGNING_SECRET=your-signing-secret

# JWT 相关
OPERATOR_JWT_SECRET=your-operator-jwt-secret
```

---

## 🧪 Test Scenarios

### Module 1: Catalog 商品目录

**Related Card**: `catalog-endpoint`
**Coverage**: 2/2 ACs (100%)

#### TC-CAT-001: 获取商品列表

**AC Reference**: `catalog-endpoint.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 服务运行中，产品数据已配置 | GET /catalog | 返回 200，包含产品列表 |

**执行命令**:
```bash
curl -s http://localhost:8080/catalog | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `products.length >= 1`
- [ ] 包含 product id=101 (3-in-1 pass)
- [ ] 每个产品有 `functions[]` 且非空

---

#### TC-CAT-002: 产品包含权益信息

**AC Reference**: `catalog-endpoint.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 101 存在 | GET /catalog | 产品 functions 包含 ferry/bus/mrt |

**执行命令**:
```bash
curl -s http://localhost:8080/catalog | jq '.products[] | select(.id==101) | .functions'
```

**验证点**:
- [ ] functions 数组非空
- [ ] 包含 function_code (如 ferry, bus, mrt)
- [ ] 每个 function 有 label 和 quantity

---

### Module 2: Order 订单创建

**Related Card**: `order-create`
**Coverage**: 3/3 ACs (100%)

#### TC-ORD-001: 创建简单订单

**AC Reference**: `order-create.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 101 存在且有库存 | POST /orders 提交订单 | 返回 order_id，状态为 PENDING |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "test-'$(date +%s)'"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200/201
- [ ] 响应包含 `order_id` (数字)
- [ ] `status` 为 "PENDING" 或 "CREATED"
- [ ] 保存 `order_id` 供后续步骤使用

---

#### TC-ORD-002: 订单幂等性验证

**AC Reference**: `order-create.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已创建订单 out_trade_no=X | 再次提交相同 out_trade_no | 返回相同 order_id，不重复创建 |

**执行命令**:
```bash
# 第一次创建
TRADE_NO="idempotent-test-$(date +%s)"
RESP1=$(curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"product_id\":101,\"qty\":1}],\"channel_id\":1,\"out_trade_no\":\"$TRADE_NO\"}")
echo "First: $RESP1"

# 第二次创建（相同 out_trade_no）
RESP2=$(curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"product_id\":101,\"qty\":1}],\"channel_id\":1,\"out_trade_no\":\"$TRADE_NO\"}")
echo "Second: $RESP2"

# 验证 order_id 相同
echo $RESP1 | jq '.order_id'
echo $RESP2 | jq '.order_id'
```

**验证点**:
- [ ] 两次请求返回相同 `order_id`
- [ ] 数据库只有一条订单记录
- [ ] 库存只预留一次

---

#### TC-ORD-003: 复杂定价订单（游轮套餐）

**AC Reference**: `order-create.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 107 (Pet Plan) 存在 | POST /orders with pricing_context | 返回正确的价格计算 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{
      "product_id": 107,
      "qty": 1,
      "pricing_context": {
        "booking_dates": ["2025-12-21"],
        "customer_breakdown": [
          {"customer_type": "adult", "count": 2}
        ]
      }
    }],
    "channel_id": 1,
    "out_trade_no": "pet-plan-'$(date +%s)'"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200/201
- [ ] `amounts.total` = 376 (188 × 2)
- [ ] `pricing_breakdown` 包含 per_customer_costs
- [ ] 每个 customer_type 价格正确

---

### Module 3: Payment 支付通知

**Related Card**: `payment-webhook`, `tickets-issuance`
**Coverage**: 4/4 ACs (100%)

#### TC-PAY-001: 支付成功通知

**AC Reference**: `payment-webhook.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 存在 PENDING 状态的订单 | POST /payments/notify 支付成功 | 订单状态变为 PAID，票券已出票 |

**执行命令**:
```bash
# 使用前面创建的 ORDER_ID
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": <ORDER_ID>,
    "payment_status": "SUCCESS",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "signature": "valid-mock-signature"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 订单状态变为 "PAID"
- [ ] 响应包含出票信息或 tickets 数组

---

#### TC-PAY-002: 支付通知幂等性

**AC Reference**: `payment-webhook.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单已支付 (PAID) | 再次发送支付通知 | 返回 200，不重复出票 |

**执行命令**:
```bash
# 对同一订单再次发送支付通知
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": <ORDER_ID>,
    "payment_status": "SUCCESS",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "signature": "valid-mock-signature"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200（幂等成功）
- [ ] 票券数量不变（不重复出票）

---

#### TC-PAY-003: 无效订单 ID

**AC Reference**: `payment-webhook.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 订单 ID 不存在 | POST /payments/notify | 返回 404 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": 99999999,
    "payment_status": "SUCCESS",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "signature": "valid-mock-signature"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 404
- [ ] 错误信息包含 "not found" 或类似描述

---

#### TC-PAY-004: 无效签名

**AC Reference**: `payment-webhook.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 签名无效 | POST /payments/notify | 返回 401 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": <ORDER_ID>,
    "payment_status": "SUCCESS",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "signature": "invalid-signature"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 401
- [ ] 订单状态不变

---

### Module 4: Tickets 票券查看

**Related Card**: `my-tickets`
**Coverage**: 2/2 ACs (100%)

#### TC-TKT-001: 查看我的票券

**AC Reference**: `my-tickets.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已购买并支付订单 | GET /my/tickets | 返回票券列表，包含权益 |

**执行命令**:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/my/tickets | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `tickets` 数组非空
- [ ] 每张票有 `ticket_code`
- [ ] 每张票有 `entitlements[]` 数组

---

#### TC-TKT-002: 票券包含权益详情

**AC Reference**: `my-tickets.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券已出票 | GET /my/tickets | 权益包含 function_code 和 remaining_uses |

**执行命令**:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/my/tickets | jq '.tickets[0].entitlements'
```

**验证点**:
- [ ] 每个 entitlement 有 `function_code`
- [ ] 每个 entitlement 有 `label`
- [ ] 每个 entitlement 有 `remaining_uses` (数字)
- [ ] function_code 包含如 ferry, bus, mrt

---

### Module 5: QR 二维码生成

**Related Card**: `qr-generation-api`
**Coverage**: 3/3 ACs (100%)

#### TC-QR-001: 生成加密二维码

**AC Reference**: `qr-generation-api.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户有有效票券 | POST /qr/:code 生成二维码 | 返回 qr_image 和 encrypted_data |

**执行命令**:
```bash
# 使用前面获取的 TICKET_CODE
curl -s -X POST \
  -H "Authorization: Bearer user123" \
  http://localhost:8080/qr/<TICKET_CODE> | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `qr_image` (base64 PNG)
- [ ] 响应包含 `encrypted_data`
- [ ] 响应包含 `expires_at` (过期时间)
- [ ] 保存 `encrypted_data` 供核销使用

---

#### TC-QR-002: 解密二维码（不核销）

**AC Reference**: `qr-generation-api.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有有效的 encrypted_data | POST /qr/decrypt | 返回票券信息，不消耗权益 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/qr/decrypt \
  -H 'Content-Type: application/json' \
  -d '{
    "encrypted_data": "<ENCRYPTED_DATA>"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `ticket_code`
- [ ] 响应包含 `jti` (唯一标识)
- [ ] 响应包含 `ticket_info` (票券详情)
- [ ] 权益 `remaining_uses` 不变（未消耗）

---

#### TC-QR-003: 查询票券详情

**AC Reference**: `qr-generation-api.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券存在 | GET /qr/:code/info | 返回完整票券信息 |

**执行命令**:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/qr/<TICKET_CODE>/info | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `customer_info`
- [ ] 响应包含 `entitlements[]`
- [ ] 响应包含 `product_info`

---

### Module 6: Operator 操作员认证

**Related Card**: `operators-login`
**Coverage**: 2/2 ACs (100%)

#### TC-OP-001: 操作员登录成功

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 操作员 alice 已配置 | POST /operators/login 正确凭证 | 返回 operator_token |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "secret123"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `operator_token`
- [ ] Token 为有效 JWT 格式
- [ ] 保存 `operator_token` 供核销使用

---

#### TC-OP-002: 操作员登录失败（错误密码）

**AC Reference**: `operators-login.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 操作员 alice 存在 | POST /operators/login 错误密码 | 返回 401 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "wrong-password"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 401
- [ ] 不返回 token
- [ ] 错误信息明确（如 "invalid credentials"）

---

### Module 7: Scanning 票券核销

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 4/4 ACs (100%)

#### TC-SCAN-001: 首次核销成功

**AC Reference**: `venue-enhanced-scanning.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 操作员已登录，有有效 QR token | POST /venue/scan | 核销成功，remaining_uses 减少 |

**执行命令**:
```bash
# 使用前面获取的 OPERATOR_TOKEN 和 ENCRYPTED_DATA
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<ENCRYPTED_DATA>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] `result` = "success"
- [ ] 响应包含 `remaining_uses` (数字)
- [ ] `remaining_uses` 比核销前减少 1

---

#### TC-SCAN-002: 重复核销拒绝（防重放）

**AC Reference**: `venue-enhanced-scanning.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一 QR token 已核销 | 再次 POST /venue/scan | 返回 reject，原因 ALREADY_REDEEMED |

**执行命令**:
```bash
# 使用同一个 ENCRYPTED_DATA 再次核销
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<ENCRYPTED_DATA>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] `result` = "reject"
- [ ] `reason` = "ALREADY_REDEEMED" 或类似
- [ ] 权益使用次数不变

---

#### TC-SCAN-003: 无效功能码

**AC Reference**: `venue-enhanced-scanning.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券不包含该功能权益 | POST /venue/scan with invalid function_code | 返回错误 |

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<ENCRYPTED_DATA>",
    "function_code": "invalid_function",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] `result` = "reject" 或返回 400
- [ ] 错误信息说明功能码无效或不存在

---

#### TC-SCAN-004: 过期二维码

**AC Reference**: `venue-enhanced-scanning.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | QR token 已过期 | POST /venue/scan | 返回 reject，原因 EXPIRED |

**执行命令**:
```bash
# 使用过期的 QR token（需等待过期或使用测试数据）
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<EXPIRED_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**验证点**:
- [ ] `result` = "reject"
- [ ] `reason` 包含 "EXPIRED" 或 "expired"
- [ ] 权益使用次数不变

---

## 📊 Test Summary

### 执行进度

| Module | Card | 场景数 | Pass | Fail | Skip | 覆盖率 |
|--------|------|--------|------|------|------|--------|
| 1. Catalog | catalog-endpoint | 2 | 0 | 0 | 0 | 0% |
| 2. Order | order-create | 3 | 0 | 0 | 0 | 0% |
| 3. Payment | payment-webhook | 4 | 0 | 0 | 0 | 0% |
| 4. Tickets | my-tickets | 2 | 0 | 0 | 0 | 0% |
| 5. QR | qr-generation-api | 3 | 0 | 0 | 0 | 0% |
| 6. Operator | operators-login | 2 | 0 | 0 | 0 | 0% |
| 7. Scanning | venue-enhanced-scanning | 4 | 0 | 0 | 0 | 0% |
| **Total** | - | **20** | **0** | **0** | **0** | **0%** |

### AC 覆盖映射

| Card | AC 总数 | 已测试 | 覆盖率 | 状态 |
|------|---------|--------|--------|------|
| catalog-endpoint | 2 | 0 | 0% | pending |
| order-create | 3 | 0 | 0% | pending |
| payment-webhook | 4 | 0 | 0% | pending |
| my-tickets | 2 | 0 | 0% | pending |
| qr-generation-api | 3 | 0 | 0% | pending |
| operators-login | 2 | 0 | 0% | pending |
| venue-enhanced-scanning | 4 | 0 | 0% | pending |
| **Total** | **20** | **0** | **0%** | pending |

---

## 🚀 Quick Execution

### 自动化测试 (Newman)

```bash
# 运行此 Story 的测试
npm run test:story 001

# 或直接运行 Newman
npx newman run postman/auto-generated/us-001-buy-3in1-pass.postman_collection.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman/us-001-e2e.xml
```

### 完整手工测试流程

```bash
#!/bin/bash
# US-001 完整端到端测试脚本
set -e

export BASE=http://localhost:8080

echo "=== 1. 检查服务健康 ==="
curl -s $BASE/healthz | jq '.'

echo "=== 2. 获取商品目录 ==="
curl -s $BASE/catalog | jq '.products[0] | {id, name, status}'

echo "=== 3. 创建订单 ==="
ORDER_RESP=$(curl -s -X POST $BASE/orders \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"e2e-'$(date +%s)'"}')
ORDER_ID=$(echo $ORDER_RESP | jq -r '.order_id')
echo "Order ID: $ORDER_ID"

echo "=== 4. 模拟支付通知 ==="
curl -s -X POST $BASE/payments/notify \
  -H 'Content-Type: application/json' \
  -d "{\"order_id\":$ORDER_ID,\"payment_status\":\"SUCCESS\",\"paid_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"signature\":\"valid-mock-signature\"}" | jq '.'

echo "=== 5. 获取票券 ==="
TICKET_RESP=$(curl -s -H "Authorization: Bearer user123" $BASE/my/tickets)
TICKET_CODE=$(echo $TICKET_RESP | jq -r '.tickets[0].ticket_code')
echo "Ticket Code: $TICKET_CODE"

echo "=== 6. 生成二维码 ==="
QR_RESP=$(curl -s -X POST -H "Authorization: Bearer user123" $BASE/qr/$TICKET_CODE)
ENCRYPTED_DATA=$(echo $QR_RESP | jq -r '.encrypted_data')
echo "Encrypted Data: ${ENCRYPTED_DATA:0:50}..."

echo "=== 7. 操作员登录 ==="
OP_RESP=$(curl -s -X POST $BASE/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}')
OP_TOKEN=$(echo $OP_RESP | jq -r '.operator_token')
echo "Operator Token: ${OP_TOKEN:0:50}..."

echo "=== 8. 核销票券 ==="
SCAN_RESP=$(curl -s -X POST $BASE/venue/scan \
  -H "Authorization: Bearer $OP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"qr_token\":\"$ENCRYPTED_DATA\",\"function_code\":\"ferry\",\"venue_code\":\"central-pier\"}")
echo $SCAN_RESP | jq '.'

echo "=== 9. 验证结果 ==="
RESULT=$(echo $SCAN_RESP | jq -r '.result')
if [ "$RESULT" = "success" ]; then
  echo "✅ E2E 测试通过！"
else
  echo "❌ E2E 测试失败: $(echo $SCAN_RESP | jq -r '.reason')"
  exit 1
fi
```

---

## 🔍 Troubleshooting

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 服务无响应 | 服务未启动 | `npm run build && npm start` |
| 401 Unauthorized | Token 无效或过期 | 检查 Authorization header 格式 |
| 404 Not Found | 资源不存在 | 检查 ID 是否正确，订单/票券是否已创建 |
| 订单创建失败 | 产品不存在或无库存 | `GET /catalog` 确认产品 101 存在 |
| 票券为空 | 支付通知未成功 | 检查 payment notify 响应 |
| QR 生成失败 | 票券不存在 | 确认 ticket_code 正确 |
| 核销失败 | QR 过期或已使用 | 重新生成 QR，检查 function_code |

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 2.0 | 2025-12-17 | AI | 升级为详细版 Runbook，添加 Given-When-Then 格式 |
| 1.0 | 2025-11 | - | 初始简洁版 |
