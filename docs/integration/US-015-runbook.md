# US-015: Ticket Reservation & Validation Runbook

票券预约验证完整测试：时段查询 → 票券验证 → 创建预约 → 操作员核验

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-015 |
| **PRD** | PRD-007 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-015-*.json` |
| Newman Command | `npm run test:story 015` |
| Related Cards | `reservation-slot-management`, `customer-reservation-portal`, `operator-validation-scanner` |

---

## 🎯 Business Context

### 用户旅程

```
客户流程:
  查看可用时段 → 验证票券 → 创建预约 → 到场验证

操作员流程:
  登录系统 → 扫描 QR → 验证票券 → 允许/拒绝入场
```

### 测试目标

- [ ] 验证时段查询功能
- [ ] 验证票券状态检查
- [ ] 验证预约创建流程
- [ ] 验证操作员核验流程

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **数据模式** | Directus / Mock | USE_DIRECTUS=true 启用 |
| **测试票券** | TKT-20251201-ABC123 | 已激活票券 |

---

## 🧪 Test Scenarios

### Module 1: 时段管理

**Related Card**: `reservation-slot-management`
**Coverage**: 3/3 ACs (100%)

#### TC-RSV-001: 查询可用时段

**AC Reference**: `reservation-slot-management.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 系统有时段配置 | GET /api/reservation-slots/available?month=2025-12 | 返回时段列表 |

**验证点**:
- [ ] 返回 success = true
- [ ] data 按日期分组
- [ ] 每个 slot 包含 id, start_time, end_time
- [ ] 显示 capacity_status (AVAILABLE/LIMITED/FULL)

---

#### TC-RSV-002: 时段容量正确

**AC Reference**: `reservation-slot-management.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 时段有预约记录 | GET /api/reservation-slots/available | available_count 正确 |

**验证点**:
- [ ] total_capacity 正确
- [ ] available_count = total - reserved
- [ ] capacity_status 根据剩余量变化

---

#### TC-RSV-003: 无效月份格式

**AC Reference**: `reservation-slot-management.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无效月份格式 | GET /api/reservation-slots/available?month=invalid | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示日期格式错误

---

### Module 2: 票券验证

**Related Card**: `customer-reservation-portal`
**Coverage**: 4/4 ACs (100%)

#### TC-RSV-004: 已激活票券验证成功

**AC Reference**: `customer-reservation-portal.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券状态 ACTIVATED | POST /api/tickets/validate | 返回 valid = true |

**验证点**:
- [ ] success = true
- [ ] valid = true
- [ ] 返回票券详情

---

#### TC-RSV-005: 不存在票券返回错误

**AC Reference**: `customer-reservation-portal.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券码不存在 | POST /api/tickets/validate | 返回 valid = false |

**验证点**:
- [ ] success = false
- [ ] error = "Ticket not found"

---

#### TC-RSV-006: 未激活票券被拒绝

**AC Reference**: `customer-reservation-portal.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券状态非 ACTIVATED | POST /api/tickets/validate | 返回错误 |

**验证点**:
- [ ] valid = false
- [ ] error 包含 "must be activated"

---

#### TC-RSV-007: 已预约票券被拒绝

**AC Reference**: `customer-reservation-portal.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 票券已有预约 | POST /api/tickets/validate | 返回已预约错误 |

**验证点**:
- [ ] valid = false
- [ ] error 包含 "already has an active reservation"

---

### Module 3: 创建预约

**Related Card**: `customer-reservation-portal`
**Coverage**: 3/3 ACs (100%)

#### TC-RSV-008: 创建预约成功

**AC Reference**: `customer-reservation-portal.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效票券和时段 | POST /api/reservations/create | 返回预约详情 |

**验证点**:
- [ ] success = true
- [ ] 返回 reservation_id
- [ ] 返回 slot_date, slot_time
- [ ] 票券状态变为 RESERVED

---

#### TC-RSV-009: 时段容量更新

**AC Reference**: `customer-reservation-portal.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 创建预约后 | GET /api/reservation-slots/available | available_count 减少 |

**验证点**:
- [ ] available_count 减少 1
- [ ] capacity_status 可能变化

---

#### TC-RSV-010: 使用自定义联系方式

**AC Reference**: `customer-reservation-portal.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 提供 customer_email 和 phone | POST /api/reservations/create | 使用自定义联系方式 |

**验证点**:
- [ ] customer_email = 提供的值
- [ ] customer_phone = 提供的值

---

### Module 4: 操作员核验

**Related Card**: `operator-validation-scanner`
**Coverage**: 5/5 ACs (100%)

#### TC-RSV-011: 操作员登录

**AC Reference**: `operator-validation-scanner.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效操作员凭证 | POST /operators/auth | 返回 session_token |

**验证点**:
- [ ] success = true
- [ ] 返回 session_token
- [ ] 返回 expires_at

---

#### TC-RSV-012: GREEN - 当日有效预约

**AC Reference**: `operator-validation-scanner.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | RESERVED + 当日预约 | POST /operators/validate-ticket | color_code = GREEN |

**验证点**:
- [ ] color_code = GREEN
- [ ] message 包含 "Allow entry"
- [ ] allow_entry = true

---

#### TC-RSV-013: YELLOW - 非当日预约

**AC Reference**: `operator-validation-scanner.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | RESERVED + 其他日期 | POST /operators/validate-ticket | color_code = YELLOW |

**验证点**:
- [ ] color_code = YELLOW
- [ ] message 包含日期警告
- [ ] allow_entry = false

---

#### TC-RSV-014: RED - 未预约票券

**AC Reference**: `operator-validation-scanner.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 非 RESERVED 状态 | POST /operators/validate-ticket | color_code = RED |

**验证点**:
- [ ] color_code = RED
- [ ] message 包含 "Deny entry"
- [ ] allow_entry = false

---

#### TC-RSV-015: 确认入场

**AC Reference**: `operator-validation-scanner.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | GREEN 票券 | POST /operators/verify-ticket (ALLOW) | 状态变为 VERIFIED |

**验证点**:
- [ ] verification_status = VERIFIED
- [ ] 返回 verified_at
- [ ] 票券状态更新

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 时段管理 | 3 | pending |
| 票券验证 | 4 | pending |
| 创建预约 | 3 | pending |
| 操作员核验 | 5 | pending |
| **Total** | **15** | **0/15 通过** |

---

## 🔗 Related Documentation

- [reservation-slot-management](../cards/reservation-slot-management.md)
- [customer-reservation-portal](../cards/customer-reservation-portal.md)
- [operator-validation-scanner](../cards/operator-validation-scanner.md)

## Color Code Reference

| Color | Condition | Action |
|-------|-----------|--------|
| 🟢 GREEN | RESERVED + 当日预约 | 允许入场 |
| 🟡 YELLOW | RESERVED + 非当日 | 警告，需确认 |
| 🔴 RED | 未预约或无效 | 拒绝入场 |
