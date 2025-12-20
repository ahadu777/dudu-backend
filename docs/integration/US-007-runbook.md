# US-007: Ticket Cancellation and Refund Runbook

票券取消退款完整测试：查看政策 → 取消票券 → 退款处理 → 幂等性验证

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-007 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-007-*.json` |
| Newman Command | `npm run test:story 007` |
| Related Cards | `ticket-cancellation`, `refund-processing` |

---

## 🎯 Business Context

### 用户旅程

```
用户查看票券
  → 决定取消
  → 查看退款政策
  → 提交取消请求
  → 系统计算退款
  → 退款到账
```

### 测试目标

- [ ] 验证退款政策查询
- [ ] 验证票券取消流程
- [ ] 验证退款金额计算
- [ ] 验证幂等性处理

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **用户 Token** | `user123` | 测试用户 |
| **测试票券** | 需要已购票券 | 前置条件 |

---

## 🧪 Test Scenarios

### Module 1: 退款政策

**Related Card**: `ticket-cancellation`
**Coverage**: 2/2 ACs (100%)

#### TC-CAN-001: 查看退款政策

**AC Reference**: `ticket-cancellation.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 系统配置了退款政策 | GET /cancellation-policies | 返回 200，包含政策列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 policies 数组
- [ ] 包含 refund_percentage 规则
- [ ] 包含 conditions 说明

---

#### TC-CAN-002: 政策包含使用率规则

**AC Reference**: `ticket-cancellation.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 基于使用率的退款政策 | GET /cancellation-policies | 包含不同使用率的退款比例 |

**验证点**:
- [ ] unused: 100% 退款
- [ ] partial_use_low (≤50%): 50% 退款
- [ ] partial_use_high (51-99%): 25% 退款
- [ ] fully_used: 0% 退款

---

### Module 2: 票券取消

**Related Card**: `ticket-cancellation`
**Coverage**: 4/4 ACs (100%)

#### TC-CAN-003: 取消活跃票券

**AC Reference**: `ticket-cancellation.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户有活跃票券 | POST /tickets/:code/cancel | 返回 200，票券变为 void |

**验证点**:
- [ ] 返回状态码 200
- [ ] ticket_status = void
- [ ] 返回 refund_amount
- [ ] 返回 cancelled_at

---

#### TC-CAN-004: 幂等性 - 重复取消

**AC Reference**: `ticket-cancellation.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已取消的票券 | POST /tickets/:code/cancel | 返回 200，refund_id = ALREADY_CANCELLED |

**验证点**:
- [ ] 返回状态码 200
- [ ] 不重复处理退款
- [ ] refund_id = ALREADY_CANCELLED

---

#### TC-CAN-005: 非本人票券被拒绝

**AC Reference**: `ticket-cancellation.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 其他用户的票券 | POST /tickets/:code/cancel | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 不泄露票券存在

---

#### TC-CAN-006: 无认证取消被拒绝

**AC Reference**: `ticket-cancellation.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | POST /tickets/:code/cancel | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示需要认证

---

### Module 3: 退款处理

**Related Card**: `refund-processing`
**Coverage**: 3/3 ACs (100%)

#### TC-CAN-007: 查看退款历史

**AC Reference**: `refund-processing.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户有退款记录 | GET /my/refunds | 返回退款列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 refunds 数组
- [ ] 每条记录包含金额和状态

---

#### TC-CAN-008: 退款金额计算

**AC Reference**: `refund-processing.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 未使用票券取消 | POST /tickets/:code/cancel | refund_amount = 原价 × 100% |

**验证点**:
- [ ] 退款金额计算正确
- [ ] 符合政策规则

---

#### TC-CAN-009: 已核销票券取消

**AC Reference**: `refund-processing.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已全部核销的票券 | POST /tickets/:code/cancel | refund_amount = 0 |

**验证点**:
- [ ] 返回 refund_amount = 0
- [ ] 票券仍可取消（状态变 void）

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 退款政策 | 2 | pending |
| 票券取消 | 4 | pending |
| 退款处理 | 3 | pending |
| **Total** | **9** | **0/9 通过** |

---

## 🔗 Related Documentation

- [ticket-cancellation](../cards/ticket-cancellation.md)
- [refund-processing](../cards/refund-processing.md)

## Business Rules

### 退款计算规则

| 使用率 | 退款比例 |
|--------|---------|
| 0% (未使用) | 100% |
| 1-50% | 50% |
| 51-99% | 25% |
| 100% (全部使用) | 0% |

### 状态转换规则

- ✅ `active` → `void`
- ✅ `partially_redeemed` → `void`
- ❌ `redeemed` → 无法取消
- ❌ `expired` → 无法取消
- ℹ️ `void` → 幂等返回

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [ ] **TC-CAN-E2E-001**: 取消未使用票券获得全额退款
  - 操作: 用户有 ACTIVE 状态票券 → 申请取消 → 系统处理
  - **Expected**: 票券状态变为 VOID，计算 100% 退款金额，退款成功

- [ ] **TC-CAN-E2E-002**: 取消部分使用票券获得部分退款
  - 操作: 用户有已核销 30% 的票券 → 申请取消 → 系统处理
  - **Expected**: 票券状态变为 VOID，计算 50% 退款金额（1-50% 使用率规则）

- [ ] **TC-CAN-E2E-003**: 查看退款政策
  - 操作: 查询系统退款政策 → GET /cancellation-policies
  - **Expected**: 返回基于使用率的退款规则（0%→100%, 1-50%→50%, 51-99%→25%, 100%→0%）

- [ ] **TC-CAN-E2E-004**: 查看取消和退款历史
  - 操作: 用户取消票券后 → 查看 GET /my/refunds
  - **Expected**: 显示取消记录，包含取消时间、退款金额、处理状态

- [ ] **TC-CAN-E2E-005**: 幂等性 - 重复取消请求
  - 操作: 对已取消的票券再次发起取消请求
  - **Expected**: 返回 200，refund_id = ALREADY_CANCELLED，不重复处理退款

### Round 2: 异常场景 (3 scenarios)

- [ ] **TC-CAN-E2E-006**: 拒绝已完全使用票券的取消
  - 操作: 用户有 100% 已核销的票券 → 尝试取消
  - **Expected**: 系统拒绝取消请求，提示"票券已完全使用，无法退款"

- [ ] **TC-CAN-E2E-007**: 拒绝非本人票券取消
  - 操作: 用户 A 尝试取消用户 B 的票券
  - **Expected**: 返回 404，不泄露票券是否存在，拒绝操作

- [ ] **TC-CAN-E2E-008**: 拒绝无认证的取消请求
  - 操作: 不提供 Authorization header → 发起取消请求
  - **Expected**: 返回 401，提示需要认证

---

## 📝 Revision History

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1 | 2025-12-18 | 添加 QA E2E Checklist |
| v1.0 | 2025-12-17 | 初始版本 |
