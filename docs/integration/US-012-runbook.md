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

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
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
