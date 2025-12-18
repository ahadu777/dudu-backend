# US-016: Ticket Activation and Time-Slot Reservation Runbook

票券激活与预约系统完整测试：激活流程 → 预约创建 → 操作员验证 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-016 |
| **PRD** | PRD-006 |
| **Status** | Draft |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ⚠️ 部分自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-016-*.json` |
| Newman Command | `npm run test:story 016` |
| Related Cards | `ticket-activation`, `time-slot-reservation` |

---

## 🎯 Business Context

### 用户旅程

```
预售模式:
  购买票券(inactive) → 激活票券 → 预约时段 → 到场验证

即时模式:
  购买票券(auto-active) → 预约时段 → 到场验证
```

### 测试目标

- [ ] 验证预售票券激活流程
- [ ] 验证即时激活模式
- [ ] 验证激活后预约
- [ ] 验证操作员增强扫描

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **激活模式** | deferred / immediate | 预售/即时 |
| **依赖** | US-015 已实现 | 预约核验功能 |

---

## 🧪 Test Scenarios

### Module 1: 预售票券激活

**Related Card**: `ticket-activation`
**Coverage**: 4/4 ACs (100%)

#### TC-ACT-001: 购买预售票券

**AC Reference**: `ticket-activation.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | activation_mode = deferred | POST /orders | 票券状态 = inactive |

**验证点**:
- [ ] 订单创建成功
- [ ] 票券 status = inactive
- [ ] 未激活票券无法预约

---

#### TC-ACT-002: 激活票券

**AC Reference**: `ticket-activation.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有 inactive 票券 | POST /api/tickets/:id/activate | 状态变为 active |

**验证点**:
- [ ] 返回 status = active
- [ ] 返回 activated_at
- [ ] 可以开始预约

---

#### TC-ACT-003: 查询激活状态

**AC Reference**: `ticket-activation.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已激活票券 | GET /api/tickets/:id/status | 返回激活信息 |

**验证点**:
- [ ] status = active
- [ ] activation_mode = deferred
- [ ] activated_at 有值

---

#### TC-ACT-004: 重复激活被拒绝

**AC Reference**: `ticket-activation.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已激活票券 | POST /api/tickets/:id/activate | 返回错误 |

**验证点**:
- [ ] 提示已激活
- [ ] 状态不变

---

### Module 2: 即时激活模式

**Related Card**: `ticket-activation`
**Coverage**: 2/2 ACs (100%)

#### TC-ACT-005: 即时模式自动激活

**AC Reference**: `ticket-activation.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | activation_mode = immediate | POST /orders | 票券自动激活 |

**验证点**:
- [ ] 票券 status = active
- [ ] activation_mode = immediate
- [ ] activated_at 已设置

---

#### TC-ACT-006: 验证自动激活

**AC Reference**: `ticket-activation.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 即时模式票券 | GET /api/tickets/:id/status | 返回 active |

**验证点**:
- [ ] status = active
- [ ] 无需手动激活

---

### Module 3: 激活后预约

**Related Card**: `time-slot-reservation`
**Coverage**: 3/3 ACs (100%)

#### TC-ACT-007: 激活票券创建预约

**AC Reference**: `time-slot-reservation.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已激活票券 | POST /api/reservations | 预约成功 |

**验证点**:
- [ ] reservation_id 返回
- [ ] 时段已锁定
- [ ] 票券状态更新

---

#### TC-ACT-008: 未激活票券无法预约

**AC Reference**: `time-slot-reservation.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 未激活票券 | POST /api/reservations | 返回错误 |

**验证点**:
- [ ] 提示需先激活
- [ ] 预约未创建

---

#### TC-ACT-009: 修改预约时段

**AC Reference**: `time-slot-reservation.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已有预约 | PUT /api/reservations/:id | 预约已更新 |

**验证点**:
- [ ] 新日期/时段生效
- [ ] 旧时段容量释放

---

### Module 4: 操作员增强扫描

**Related Card**: `ticket-activation`
**Coverage**: 3/3 ACs (100%)

#### TC-ACT-010: 扫描未激活票券

**AC Reference**: `ticket-activation.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | inactive 票券 | POST /operators/validate-ticket | color_code = RED |

**验证点**:
- [ ] color_code = RED
- [ ] message 包含 "not activated"
- [ ] allow_entry = false

---

#### TC-ACT-011: 扫描已激活无预约票券

**AC Reference**: `ticket-activation.AC-8`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | active 无预约 | POST /operators/validate-ticket | color_code = YELLOW |

**验证点**:
- [ ] color_code = YELLOW
- [ ] message 包含 "No reservation"

---

#### TC-ACT-012: 取消预约

**AC Reference**: `time-slot-reservation.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已有预约 | DELETE /api/reservations/:id | 预约已取消 |

**验证点**:
- [ ] 预约状态 = cancelled
- [ ] 票券回到 active (无预约)
- [ ] 时段容量恢复

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 预售票券激活 | 4 | pending |
| 即时激活模式 | 2 | pending |
| 激活后预约 | 3 | pending |
| 操作员增强扫描 | 3 | pending |
| **Total** | **12** | **0/12 通过** |

---

## 🔗 Related Documentation

- [ticket-activation](../cards/ticket-activation.md)
- [time-slot-reservation](../cards/time-slot-reservation.md)
- [US-015-runbook](US-015-runbook.md) - 已实现的预约核验功能

## Implementation Status

| Feature | Status |
|---------|--------|
| 票券预约系统 | ✅ 已实现 (US-015) |
| 操作员颜色码验证 | ✅ 已实现 (US-015) |
| 票券激活 (inactive → active) | ❌ 待实现 |
| 双购买模式 (immediate/deferred) | ❌ 待实现 |

> **注意**: 当前只有 US-015 的预约核验功能已实现。票券激活功能待 PRD-006 实施。
