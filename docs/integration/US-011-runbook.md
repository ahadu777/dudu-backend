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
