# US-012: OTA Platform Integration Runbook

完整 OTA 集成测试：认证 → 库存查询 → 预订管理 → 预生成票券 → 激活出票 → 场馆核销

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-012 |
| **PRD** | PRD-002 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-012-*.json` |
| Newman Command | `npm run test:story 012` |
| Related Cards | `ota-channel-management`, `ota-premade-tickets`, `ota-reservation-management` |

---

## 🎯 Business Context

### 用户旅程

```
OTA 合作伙伴认证
  → 查询可用库存
  → 创建批量预订
  → 批量生成预售票券
  → 为客户激活票券
  → 客户在场馆核销
```

### 测试目标

- [ ] 验证 OTA API 认证机制
- [ ] 验证库存分配和预订流程
- [ ] 验证预生成票券和激活流程
- [ ] 验证完整核销流程

---

## 🔧 Prerequisites

> 📍 **环境配置**: 详见 [_environments.md](./_environments.md)

| 环境 | Base URL |
|------|----------|
| 本地开发 | `http://localhost:8080` |
| 线上开发 | `https://mesh.synque.ai` |

| 项目 | 值 | 说明 |
|------|-----|------|
| **OTA API Key** | `ota_test_key_12345` | 测试用 API Key |
| **Bearer Token** | `test-api-key` | 预生成票券用 |

---

## 🧪 Test Scenarios

### Module 1: OTA 认证

**Related Card**: `ota-channel-management`
**Coverage**: 2/2 ACs (100%)

#### TC-OTA-001: 无 API Key 访问被拒绝

**AC Reference**: `ota-channel-management.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | OTA 端点已启用 | GET /api/ota/inventory (无 Header) | 返回 401，错误码 API_KEY_REQUIRED |

**验证点**:
- [ ] 返回状态码 401
- [ ] 错误消息包含 "X-API-Key header is required"

---

#### TC-OTA-002: 无效 API Key 被拒绝

**AC Reference**: `ota-channel-management.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用无效 API Key | GET /api/ota/inventory | 返回 403，错误码 INVALID_API_KEY |

**验证点**:
- [ ] 返回状态码 403
- [ ] 错误消息包含 "not valid"

---

### Module 2: 库存查询

**Related Card**: `ota-channel-management`
**Coverage**: 2/2 ACs (100%)

#### TC-OTA-003: 查询 OTA 库存

**AC Reference**: `ota-channel-management.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 API Key | GET /api/ota/inventory | 返回 200，包含产品库存 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 available_quantities 对象
- [ ] 产品 106, 107, 108 的库存总和约 5000

---

#### TC-OTA-004: 验证渠道分离

**AC Reference**: `ota-channel-management.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | OTA 和直销渠道并存 | GET /catalog (直销) vs GET /api/ota/inventory (OTA) | 库存数量不同 |

**验证点**:
- [ ] OTA 库存与直销库存独立
- [ ] 无库存冲突

---

### Module 3: 预订管理

**Related Card**: `ota-reservation-management`
**Coverage**: 4/4 ACs (100%)

#### TC-OTA-005: 创建小批量预订

**AC Reference**: `ota-reservation-management.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 API Key，库存充足 | POST /api/ota/reserve (25 units) | 返回 200，包含 reservation_id |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 reservation_id
- [ ] 返回 reserved_until 时间
- [ ] 包含 pricing_snapshot

---

#### TC-OTA-006: 预订后库存减少

**AC Reference**: `ota-reservation-management.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已创建 25 单位预订 | GET /api/ota/inventory | 库存减少 25 |

**验证点**:
- [ ] 产品 106 库存 = 原库存 - 25

---

#### TC-OTA-007: 超出单次预订限制

**AC Reference**: `ota-reservation-management.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 API Key | POST /api/ota/reserve (150 units) | 返回 400，验证错误 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 错误消息包含 "1 and 100"

---

#### TC-OTA-008: 预订不存在产品

**AC Reference**: `ota-reservation-management.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 API Key | POST /api/ota/reserve (product_id: 999) | 返回 404，产品不存在 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 错误码 PRODUCT_NOT_FOUND

---

### Module 4: 预生成票券

**Related Card**: `ota-premade-tickets`
**Coverage**: 4/4 ACs (100%)

#### TC-OTA-009: 批量生成票券

**AC Reference**: `ota-premade-tickets.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 Bearer Token | POST /api/ota/tickets/bulk-generate (10 tickets) | 返回 200，生成 10 张票 |

**验证点**:
- [ ] 返回状态码 200
- [ ] tickets 数组长度 = 10
- [ ] 每张票状态 = PRE_GENERATED
- [ ] 每张票有唯一 ticket_code

---

#### TC-OTA-010: 生成票券认证失败

**AC Reference**: `ota-premade-tickets.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Bearer Token | POST /api/ota/tickets/bulk-generate | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 错误消息包含 "Authorization"

---

#### TC-OTA-011: 超出批量生成限制

**AC Reference**: `ota-premade-tickets.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 Bearer Token | POST /api/ota/tickets/bulk-generate (150 tickets) | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 验证错误：数量超限

---

#### TC-OTA-012: 查询票券列表

**AC Reference**: `ota-premade-tickets.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已生成票券 | GET /api/ota/tickets?status=PRE_GENERATED | 返回票券列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 支持 status 筛选
- [ ] 支持分页 (page, limit)
- [ ] 返回 total_count

---

### Module 5: 票券激活

**Related Card**: `ota-premade-tickets`
**Coverage**: 3/3 ACs (100%)

#### TC-OTA-013: 激活票券为客户出票

**AC Reference**: `ota-premade-tickets.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有 PRE_GENERATED 票券 | POST /api/ota/tickets/activate | 返回 200，包含订单和 QR |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 order_id
- [ ] 返回 qr_code
- [ ] 票券状态变为 ACTIVE
- [ ] 包含 ticket_price 和 currency

---

#### TC-OTA-014: 激活不存在票券

**AC Reference**: `ota-premade-tickets.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 使用无效 ticket_code | POST /api/ota/tickets/activate | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 错误码 TICKET_NOT_FOUND

---

#### TC-OTA-015: 查询客户订单

**AC Reference**: `ota-premade-tickets.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已激活票券 | GET /api/ota/orders/:id/tickets | 返回订单票券和 QR |

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 tickets 数组
- [ ] 每张票有 qr_code
- [ ] 包含客户信息

---

### Module 6: 场馆核销

**Related Card**: `venue-enhanced-scanning`
**Coverage**: 3/3 ACs (100%)

#### TC-OTA-016: 生成加密 QR 码

**AC Reference**: `venue-enhanced-scanning.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已激活的票券 | POST /qr/:ticket_code | 返回 encrypted_data |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 encrypted_data
- [ ] 返回 jti (QR Token ID)

---

#### TC-OTA-017: 解密 QR 预览（不核销）

**AC Reference**: `venue-enhanced-scanning.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有 encrypted_data | POST /qr/decrypt | 返回票券信息，不消耗权益 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 customer_info
- [ ] 包含 entitlements
- [ ] remaining_uses 不变

---

#### TC-OTA-018: 场馆扫描核销

**AC Reference**: `venue-enhanced-scanning.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有 encrypted_data | POST /venue/scan | 核销成功，权益减少 |

**验证点**:
- [ ] 返回 result: success
- [ ] remaining_uses 减少 1
- [ ] 返回核销详情

---

#### TC-OTA-019: 防重复核销

**AC Reference**: `venue-enhanced-scanning.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 同一 QR 同一功能已核销 | POST /venue/scan (重复) | 返回 ALREADY_REDEEMED |

**验证点**:
- [ ] reason = ALREADY_REDEEMED
- [ ] 不重复消耗权益

---

#### TC-OTA-020: 核销其他功能

**AC Reference**: `venue-enhanced-scanning.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | ferry_boarding 已核销 | POST /venue/scan (gift_redemption) | 可以核销其他功能 |

**验证点**:
- [ ] 不同功能可独立核销
- [ ] 各功能权益独立计数

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| OTA 认证 | 2 | pending |
| 库存查询 | 2 | pending |
| 预订管理 | 4 | pending |
| 预生成票券 | 4 | pending |
| 票券激活 | 3 | pending |
| 场馆核销 | 5 | pending |
| **Total** | **20** | **0/20 通过** |

---

## 🔗 Related Documentation

- [ota-channel-management](../cards/ota-channel-management.md)
- [ota-premade-tickets](../cards/ota-premade-tickets.md)
- [ota-reservation-management](../cards/ota-reservation-management.md)
- [venue-enhanced-scanning](../cards/venue-enhanced-scanning.md)

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (10 scenarios)

- [ ] **TC-OTA-101**: OTA 合作伙伴认证
  - 操作: 使用有效 API Key → 请求 OTA 端点
  - **Expected**: 认证通过，可访问 OTA 功能

- [ ] **TC-OTA-102**: 查询可用库存
  - 操作: OTA 查询 /api/ota/inventory
  - **Expected**: 返回产品 106-108 的可用库存，总计约 5000 套餐

- [ ] **TC-OTA-103**: 创建批量预订
  - 操作: OTA 提交预订请求（25 units）
  - **Expected**: 返回 reservation_id，库存减少 25

- [ ] **TC-OTA-104**: 批量生成预售票券
  - 操作: OTA 使用 Bearer Token → 批量生成 10 张票券
  - **Expected**: 返回 10 张 PRE_GENERATED 状态票券，每张有唯一 ticket_code

- [ ] **TC-OTA-105**: 为客户激活票券
  - 操作: OTA 提交激活请求（含客户信息）
  - **Expected**: 票券状态变为 ACTIVE，返回 order_id 和 qr_code

- [ ] **TC-OTA-106**: 查询客户订单
  - 操作: OTA 查询 /api/ota/orders/:id/tickets
  - **Expected**: 返回订单票券列表，含 QR 码和客户信息

- [ ] **TC-OTA-107**: 客户在场馆核销
  - 操作: 客户到场 → 操作员扫描 QR 码
  - **Expected**: 核销成功，权益减少，流程与直销票券一致

- [ ] **TC-OTA-108**: 渠道库存隔离验证
  - 操作: 对比 /catalog (直销) 和 /api/ota/inventory (OTA) 库存
  - **Expected**: OTA 和直销库存独立，无冲突

- [ ] **TC-OTA-109**: 查询票券列表
  - 操作: OTA 查询 /api/ota/tickets?status=PRE_GENERATED&page=1&limit=10
  - **Expected**: 返回分页票券列表，支持状态筛选，仅显示该 OTA 的票券

- [ ] **TC-OTA-110**: 票券使用完毕状态更新
  - 操作: 核销完所有权益
  - **Expected**: 票券状态自动更新为 USED

### Round 2: 异常场景 (6 scenarios)

- [ ] **TC-OTA-201**: 无 API Key 访问
  - 操作: 不提供 X-API-Key header → 请求 OTA 端点
  - **Expected**: 返回 401，错误码 API_KEY_REQUIRED

- [ ] **TC-OTA-202**: 无效 API Key
  - 操作: 使用错误的 API Key → 请求 OTA 端点
  - **Expected**: 返回 403，错误码 INVALID_API_KEY

- [ ] **TC-OTA-203**: 超出单次预订限制
  - 操作: 尝试预订 150 units（超过限制）
  - **Expected**: 返回 400，提示单次预订限制 1-100

- [ ] **TC-OTA-204**: 预订不存在产品
  - 操作: 尝试预订 product_id: 999
  - **Expected**: 返回 404，错误码 PRODUCT_NOT_FOUND

- [ ] **TC-OTA-205**: 超出批量生成限制
  - 操作: 尝试批量生成 150 张票券
  - **Expected**: 返回 400，提示数量超限

- [ ] **TC-OTA-206**: 激活不存在的票券
  - 操作: 使用无效 ticket_code 尝试激活
  - **Expected**: 返回 404，错误码 TICKET_NOT_FOUND

### Round 3: 边界测试 (4 scenarios)

- [ ] **TC-OTA-301**: 大批量预订
  - 操作: OTA 连续创建多个 100 units 预订
  - **Expected**: 库存正确扣减，无并发冲突

- [ ] **TC-OTA-302**: 批量生成票券上限
  - 操作: 批量生成 100 张票券（上限）
  - **Expected**: 成功生成，所有票券状态正确

- [ ] **TC-OTA-303**: 防重复核销跨终端
  - 操作: 同一 QR 在不同场馆扫描
  - **Expected**: 第二次扫描返回 ALREADY_REDEEMED

- [ ] **TC-OTA-304**: 价格快照锁定
  - 操作: 批次生成后 → 修改产品定价 → 激活票券
  - **Expected**: 使用生成时的价格快照，不受后续价格变动影响

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | System | 初始版本 |
