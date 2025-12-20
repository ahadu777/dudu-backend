# US-011: Complex Pricing System Runbook

复杂定价系统完整测试：定价规则 → 多变量计算 → 附加产品 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-011 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-011-*.json` |
| Newman Command | `npm run test:story 011` |
| Related Cards | `complex-pricing`, `addon-products` |

---

## 🎯 Business Context

### 用户旅程

```
用户选择产品
  → 选择日期（工作日/周末）
  → 选择人员类型（成人/儿童/老人）
  → 添加附加产品
  → 系统计算总价
  → 用户确认购买
```

### 测试目标

- [ ] 验证定价规则查询
- [ ] 验证工作日/周末差价
- [ ] 验证不同客户类型价格
- [ ] 验证附加产品计算

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **测试产品** | 106, 107, 108 | 复杂定价产品 |
| **测试日期** | 2025-12-15 (周一), 2025-12-20 (周六) | 工作日/周末 |

---

## 🧪 Test Scenarios

### Module 1: 定价规则查询

**Related Card**: `complex-pricing`
**Coverage**: 2/2 ACs (100%)

#### TC-PRC-001: 获取产品定价规则

**AC Reference**: `complex-pricing.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 106 有复杂定价 | GET /pricing/rules/106 | 返回完整定价规则 |

**验证点**:
- [ ] 返回 base_prices
- [ ] 返回 time_rules (周末加价)
- [ ] 返回 customer_rules
- [ ] 返回 available_addons

---

#### TC-PRC-002: 不存在产品返回 404

**AC Reference**: `complex-pricing.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 不存在的产品 ID | GET /pricing/rules/999 | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] code = PRODUCT_NOT_FOUND

---

### Module 2: 价格计算 - 基础

**Related Card**: `complex-pricing`
**Coverage**: 3/3 ACs (100%)

#### TC-PRC-003: 工作日成人价格

**AC Reference**: `complex-pricing.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 2 成人，周一 (2025-12-15) | POST /pricing/calculate | 返回 576 (2×288) |

**验证点**:
- [ ] base_price = 576
- [ ] adjustments = []
- [ ] final_total = 576

---

#### TC-PRC-004: 周末加价

**AC Reference**: `complex-pricing.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 2 成人，周六 (2025-12-20) | POST /pricing/calculate | 返回 636 (576+60) |

**验证点**:
- [ ] base_price = 576
- [ ] adjustments 包含 +60 周末加价
- [ ] final_total = 636

---

#### TC-PRC-005: 混合客户类型

**AC Reference**: `complex-pricing.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 2 成人 + 2 儿童 + 1 老人，周末 | POST /pricing/calculate | 返回 1290 |

**验证点**:
- [ ] 成人: 2×288 = 576
- [ ] 儿童: 2×188 = 376
- [ ] 老人: 1×188 = 188
- [ ] 周末加价: 5×30 = 150
- [ ] final_total = 1290

---

### Module 3: 产品差异

**Related Card**: `complex-pricing`
**Coverage**: 2/2 ACs (100%)

#### TC-PRC-006: 宠物套餐固定价

**AC Reference**: `complex-pricing.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 107，周末 | POST /pricing/calculate | 返回 188 (无周末加价) |

**验证点**:
- [ ] final_total = 188
- [ ] 无周末加价调整

---

#### TC-PRC-007: 豪华茶点套餐

**AC Reference**: `complex-pricing.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 产品 108，2 成人，工作日 | POST /pricing/calculate | 返回 1516 (2×758) |

**验证点**:
- [ ] base_price = 1516
- [ ] 高端产品定价正确

---

### Module 4: 附加产品

**Related Card**: `addon-products`
**Coverage**: 2/2 ACs (100%)

#### TC-PRC-008: 单个附加产品

**AC Reference**: `addon-products.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 2 成人 + Plan B 代币 | POST /pricing/calculate | 返回 756 (576+180) |

**验证点**:
- [ ] base_price = 576
- [ ] addons_total = 180
- [ ] final_total = 756

---

#### TC-PRC-009: 多个附加产品

**AC Reference**: `addon-products.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 家庭套餐 + 多个代币包，周末 | POST /pricing/calculate | 返回 1672 |

**验证点**:
- [ ] 基础: 952
- [ ] 周末: +120
- [ ] 附加: 600 (2×100 + 400)
- [ ] final_total = 1672

---

### Module 5: 验证与错误

**Related Card**: `complex-pricing`
**Coverage**: 3/3 ACs (100%)

#### TC-PRC-010: 无效客户类型

**AC Reference**: `complex-pricing.AC-8`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | customer_type = student | POST /pricing/calculate | 返回 422 |

**验证点**:
- [ ] 返回状态码 422
- [ ] code = INVALID_CUSTOMER_TYPE

---

#### TC-PRC-011: 无效日期格式

**AC Reference**: `complex-pricing.AC-9`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 日期格式 15-12-2025 | POST /pricing/calculate | 返回 422 |

**验证点**:
- [ ] 返回状态码 422
- [ ] code = INVALID_DATE

---

#### TC-PRC-012: 缺少必填字段

**AC Reference**: `complex-pricing.AC-10`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 缺少 product_id | POST /pricing/calculate | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示 product_id required

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 定价规则查询 | 2 | pending |
| 价格计算 - 基础 | 3 | pending |
| 产品差异 | 2 | pending |
| 附加产品 | 2 | pending |
| 验证与错误 | 3 | pending |
| **Total** | **12** | **0/12 通过** |

---

## 🔗 Related Documentation

- [complex-pricing](../cards/complex-pricing.md)
- [addon-products](../cards/addon-products.md)

## Pricing Matrix Reference

### Product 106 (Premium Plan)

| Customer Type | Weekday | Weekend |
|---------------|---------|---------|
| Adult | $288 | $318 |
| Child | $188 | $218 |
| Elderly | $188 | $218 |

### Add-on Packages

| Plan | Price | Tokens |
|------|-------|--------|
| Plan A | $100 | 10 |
| Plan B | $180 | 20 |
| Plan C | $400 | 50 |

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (8 scenarios)

- [ ] **TC-PRC-101**: 工作日成人票价查询
  - 操作: 选择 Premium Plan → 选择工作日 → 选择成人票
  - **Expected**: 显示价格 $288

- [ ] **TC-PRC-102**: 周末成人票价查询
  - 操作: 选择 Premium Plan → 选择周末 → 选择成人票
  - **Expected**: 显示价格 $318，含周末溢价 $30

- [ ] **TC-PRC-103**: 儿童票价固定价格
  - 操作: 选择任意套餐 → 选择儿童或长者票
  - **Expected**: 价格固定为 $188，不受工作日/周末影响

- [ ] **TC-PRC-104**: 不同套餐等级价格差异
  - 操作: 依次查看 Premium Plan、Pet Plan、Deluxe Tea Set 价格
  - **Expected**: Premium $288/$318，Pet $188，Deluxe $788/$888

- [ ] **TC-PRC-105**: 混合订单价格计算
  - 操作: 选择 2 成人 + 1 儿童 → 选择周末 → 查看总价
  - **Expected**: 正确显示各类型票价并汇总 (2×318 + 188 = 824)

- [ ] **TC-PRC-106**: 特殊日期定价
  - 操作: 选择特殊日期（如 2025-12-31）→ 查看价格
  - **Expected**: 应用特殊日期价格规则

- [ ] **TC-PRC-107**: 附加产品添加
  - 操作: 选择基础套餐 → 添加 Plan B 代币 → 查看总价
  - **Expected**: 总价 = 基础票价 + 附加产品价格

- [ ] **TC-PRC-108**: 订单价格明细显示
  - 操作: 完成选择 → 提交订单前查看价格明细
  - **Expected**: 显示基础价格、周末溢价、附加产品明细及总价

### Round 2: 异常场景 (4 scenarios)

- [ ] **TC-PRC-201**: 无效产品 ID
  - 操作: 尝试查询不存在的产品定价
  - **Expected**: 返回 404 错误，提示产品不存在

- [ ] **TC-PRC-202**: 无效日期格式
  - 操作: 输入错误日期格式（如 15-12-2025）
  - **Expected**: 返回 422 错误，提示日期格式错误

- [ ] **TC-PRC-203**: 无效客户类型
  - 操作: 尝试使用系统不支持的客户类型（如 student）
  - **Expected**: 返回 422 错误，提示无效客户类型

- [ ] **TC-PRC-204**: 缺少必填参数
  - 操作: 提交价格计算请求时缺少 product_id 或日期
  - **Expected**: 返回 400 错误，提示缺少必填字段

### Round 3: 边界测试 (2 scenarios)

- [ ] **TC-PRC-301**: 大额混合订单计算
  - 操作: 创建包含 10+ 成人、儿童、长者的混合订单，含多个附加产品
  - **Expected**: 价格计算准确，性能响应 < 2s

- [ ] **TC-PRC-302**: 价格规则变更后历史订单
  - 操作: 修改定价规则 → 查看已创建订单的价格
  - **Expected**: 历史订单价格不受影响，保持创建时的价格快照

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | System | 初始版本 |
