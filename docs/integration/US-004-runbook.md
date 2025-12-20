# US-004: Payment Notify & Ticket Issuance Runbook

支付通知与票券发放完整测试：创建订单 → 支付通知 → 票券发放 → 幂等性验证

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-004 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-004-*.json` |
| Newman Command | `npm run test:story 004` |
| Related Cards | `payment-webhook`, `ticket-issuance` |

---

## 🎯 Business Context

### 用户旅程

```
用户下单
  → 跳转支付
  → 支付成功
  → 支付网关回调
  → 系统发放票券
  → 用户可查看票券
```

### 测试目标

- [ ] 验证支付通知处理
- [ ] 验证票券同步发放
- [ ] 验证支付失败处理
- [ ] 验证幂等性（重复通知）

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **支付网关** | `mock` | 测试用模拟网关 |
| **用户 Token** | `user123` | 查看票券用 |

---

## 🧪 Test Scenarios

### Module 1: 订单创建

**Related Card**: `order-create`
**Coverage**: 2/2 ACs (100%)

#### TC-PAY-001: 创建待支付订单

**AC Reference**: `order-create.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效商品和数量 | POST /orders | 返回 200，订单状态 PENDING |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 order_id
- [ ] status = PENDING
- [ ] 包含 out_trade_no

---

#### TC-PAY-002: 订单包含商品明细

**AC Reference**: `order-create.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 多个商品项 | POST /orders | 返回订单含全部商品 |

**验证点**:
- [ ] items 包含所有商品
- [ ] 金额计算正确

---

### Module 2: 支付通知处理

**Related Card**: `payment-webhook`
**Coverage**: 4/4 ACs (100%)

#### TC-PAY-003: 支付成功通知

**AC Reference**: `payment-webhook.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 待支付订单存在 | POST /payments/notify (SUCCESS) | 订单变为 PAID，票券发放 |

**验证点**:
- [ ] 返回 status = processed
- [ ] order_status = PAID
- [ ] tickets_issued 数组不为空
- [ ] 票券包含 ticket_code

---

#### TC-PAY-004: 支付失败通知

**AC Reference**: `payment-webhook.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 待支付订单存在 | POST /payments/notify (FAILED) | 订单保持 PENDING，无票券 |

**验证点**:
- [ ] 返回 status = failed
- [ ] order_status = PENDING
- [ ] 无票券发放

---

#### TC-PAY-005: 幂等性 - 重复通知

**AC Reference**: `payment-webhook.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已处理的支付通知 | POST /payments/notify (相同 txn_id) | 返回 200，不重复发票 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 不创建重复票券
- [ ] 幂等响应

---

#### TC-PAY-006: 无效订单 ID

**AC Reference**: `payment-webhook.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 不存在的 order_id | POST /payments/notify | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 提示订单不存在

---

### Module 3: 票券发放验证

**Related Card**: `ticket-issuance`
**Coverage**: 3/3 ACs (100%)

#### TC-PAY-007: 票券同步发放

**AC Reference**: `ticket-issuance.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 支付成功通知 | 检查 /my/tickets | 新票券立即可见 |

**验证点**:
- [ ] 票券在响应中立即返回
- [ ] 票券状态 = ACTIVE
- [ ] 包含正确的权益信息

---

#### TC-PAY-008: 票券关联订单

**AC Reference**: `ticket-issuance.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已发放票券 | 查询票券详情 | 包含 order_id |

**验证点**:
- [ ] ticket.order_id = 原订单 ID
- [ ] 可追溯到原始订单

---

#### TC-PAY-009: 原子性 - 失败回滚

**AC Reference**: `ticket-issuance.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 发票过程中出错 | 系统异常 | 订单和票券都回滚 |

**验证点**:
- [ ] 无部分发放
- [ ] 订单状态不变
- [ ] 可重试处理

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 订单创建 | 2 | pending |
| 支付通知处理 | 4 | pending |
| 票券发放验证 | 3 | pending |
| **Total** | **9** | **0/9 通过** |

---

## 🔗 Related Documentation

- [payment-webhook](../cards/payment-webhook.md)
- [ticket-issuance](../cards/ticket-issuance.md)
- [order-create](../cards/order-create.md)

## Expected Response Formats

### Successful Payment Response
```json
{
  "status": "processed",
  "order_id": 12345,
  "order_status": "PAID",
  "tickets_issued": [
    {
      "ticket_code": "TKT-ABC123",
      "product_id": 101,
      "product_name": "3-in-1 Transport Pass"
    }
  ]
}
```

### Failed Payment Response
```json
{
  "status": "failed",
  "order_id": 12345,
  "order_status": "PENDING",
  "error": "Payment failed"
}
```

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [ ] **TC-ORDER-101**: 创建待支付订单
  - 操作: 用户选择商品 (product_id=101, qty=1) → 调用 POST /orders
  - **Expected**: 返回 200，订单创建成功，status = PENDING，包含 order_id 和 out_trade_no

- [ ] **TC-PAY-101**: 支付成功通知处理
  - 操作: 订单创建成功 → 支付网关发送成功通知 → 调用 POST /payments/notify (SUCCESS)
  - **Expected**: 返回 status = processed，order_status = PAID，tickets_issued 数组不为空

- [ ] **TC-PAY-102**: 票券同步发放
  - 操作: 支付成功后 → 立即查询 GET /my/tickets
  - **Expected**: 新票券立即可见，status = ACTIVE，包含正确的权益信息，可追溯到原始订单 ID

- [ ] **TC-PAY-103**: 库存扣减一次
  - 操作: 支付成功 → 检查库存表
  - **Expected**: 商品库存减 1，且只扣减一次

- [ ] **TC-PAY-104**: 核销记录可追溯
  - 操作: 支付成功并出票 → 查询票券详情
  - **Expected**: 票券包含 order_id，可追溯到原始订单

### Round 2: 异常场景 (4 scenarios)

- [ ] **TC-PAY-201**: 支付失败通知处理
  - 操作: 订单创建成功 → 支付网关发送失败通知 → 调用 POST /payments/notify (FAILED)
  - **Expected**: 返回 status = failed，order_status = PENDING，无票券发放

- [ ] **TC-PAY-202**: 重复支付通知幂等性
  - 操作: 已处理的支付通知 → 再次发送相同 gateway_txn_id 的通知
  - **Expected**: 返回 200，不创建重复票券，库存不重复扣减，幂等响应

- [ ] **TC-PAY-203**: 无效订单 ID 被拒绝
  - 操作: 使用不存在的 order_id → 调用 POST /payments/notify
  - **Expected**: 返回 404，提示订单不存在

- [ ] **TC-PAY-204**: 数据冲突检测
  - 操作: 同一 gateway_txn_id 对应不同订单或金额 → 发送支付通知
  - **Expected**: 系统拒绝处理并标记为冲突，返回错误

### Round 3: 边界测试 (2 scenarios)

- [ ] **TC-PAY-301**: 原子性 - 出票失败回滚
  - 操作: 模拟出票过程中异常（如数据库连接失败）
  - **Expected**: 订单状态不变，无部分出票，可重试处理

- [ ] **TC-PAY-302**: 高并发重复通知
  - 操作: 同时发送 5 个相同的支付成功通知
  - **Expected**: 只有一个通知被处理，其余返回幂等响应，最终只发放一次票券

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | AI | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | Initial | 初始版本 |
