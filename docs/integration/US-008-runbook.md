# US-008: Promotion Detail View Runbook

促销详情查看完整测试：浏览目录 → 查看详情 → 库存信息 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-008 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-008-*.json` |
| Newman Command | `npm run test:story 008` |
| Related Cards | `promotion-detail`, `catalog-endpoint` |

---

## 🎯 Business Context

### 用户旅程

```
用户浏览商品目录
  → 点击感兴趣的商品
  → 查看详细信息
  → 查看促销特征
  → 决定是否购买
```

### 测试目标

- [ ] 验证促销详情查询
- [ ] 验证库存信息显示
- [ ] 验证不同状态商品
- [ ] 验证错误处理

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **认证** | 无需认证 | 公开端点 |
| **测试商品** | 101-105 | 种子数据 |

---

## 🧪 Test Scenarios

### Module 1: 目录浏览

**Related Card**: `catalog-endpoint`
**Coverage**: 2/2 ACs (100%)

#### TC-PRO-001: 获取商品目录

**AC Reference**: `catalog-endpoint.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 系统有商品数据 | GET /catalog | 返回 200，包含商品列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回商品数组
- [ ] 包含基本信息 (id, sku, name, status)

---

#### TC-PRO-002: 目录包含功能信息

**AC Reference**: `catalog-endpoint.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品配置了功能 | GET /catalog | 每个商品包含 functions |

**验证点**:
- [ ] functions 数组不为空
- [ ] 包含 function_code 和 label

---

### Module 2: 促销详情

**Related Card**: `promotion-detail`
**Coverage**: 4/4 ACs (100%)

#### TC-PRO-003: 查看活跃商品详情

**AC Reference**: `promotion-detail.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品 101 为活跃状态 | GET /catalog/promotions/101 | 返回完整促销信息 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 包含 description 营销文案
- [ ] 包含 features 特征列表
- [ ] 包含 images 图片 URL
- [ ] 包含 badges 促销标签

---

#### TC-PRO-004: 促销包含库存信息

**AC Reference**: `promotion-detail.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 查询促销详情 | GET /catalog/promotions/101 | 返回库存数据 |

**验证点**:
- [ ] inventory.sellable_cap 存在
- [ ] inventory.available 存在
- [ ] inventory.sold_count 存在

---

#### TC-PRO-005: 查看已归档商品

**AC Reference**: `promotion-detail.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品 105 为归档状态 | GET /catalog/promotions/105 | 返回归档商品信息 |

**验证点**:
- [ ] status = archived
- [ ] features 包含 "Currently unavailable"

---

#### TC-PRO-006: 促销包含销售时间

**AC Reference**: `promotion-detail.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 商品有限时销售 | GET /catalog/promotions/101 | 返回销售时间 |

**验证点**:
- [ ] sale_start_at 存在
- [ ] sale_end_at 存在

---

### Module 3: 错误处理

**Related Card**: `promotion-detail`
**Coverage**: 2/2 ACs (100%)

#### TC-PRO-007: 无效商品 ID 格式

**AC Reference**: `promotion-detail.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 非数字商品 ID | GET /catalog/promotions/invalid | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示 ID 格式错误

---

#### TC-PRO-008: 不存在的商品

**AC Reference**: `promotion-detail.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 不存在的商品 ID | GET /catalog/promotions/999 | 返回 404 |

**验证点**:
- [ ] 返回状态码 404
- [ ] 提示商品不存在

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 目录浏览 | 2 | pending |
| 促销详情 | 4 | pending |
| 错误处理 | 2 | pending |
| **Total** | **8** | **0/8 通过** |

---

## 🔗 Related Documentation

- [promotion-detail](../cards/promotion-detail.md)
- [catalog-endpoint](../cards/catalog-endpoint.md)

## Expected Response Format

### Promotion Detail Response
```json
{
  "promotion": {
    "id": 101,
    "sku": "PASS-3IN1",
    "name": "3-in-1 Transport Pass",
    "description": "Save 40% with our popular...",
    "unit_price": 25,
    "status": "active",
    "sale_start_at": "2024-10-01T00:00:00Z",
    "sale_end_at": "2024-12-31T23:59:59Z",
    "functions": [...],
    "inventory": {
      "sellable_cap": 1000,
      "available": 1000
    },
    "features": [...],
    "images": [...],
    "badges": [...]
  }
}
```

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [x] **TC-PRO-E2E-001**: 浏览商品目录并查看详情
  - 操作: 用户打开商品列表页 → 点击某个商品 → 查看详情页
  - **Expected**: 显示完整详情页，包括描述、价格、套餐内容、营销图片
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-PRO-E2E-002**: 查看价格信息
  - 操作: 在商品详情页 → 查看价格显示
  - **Expected**: 清晰显示不同客户类型（成人/儿童/长者）的价格，包含阶梯定价规则
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-PRO-E2E-003**: 查看库存状态
  - 操作: 在商品详情页 → 查看库存信息
  - **Expected**: 显示实时库存可用数量（可售数量 - 已预订 - 已售出）
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-PRO-E2E-004**: 查看商品特征和营销内容
  - 操作: 浏览商品详情页 → 查看 features、images、badges
  - **Expected**: 显示营销文案、特征列表、图片画廊、促销标签
  - **Result**: ✅ 通过 (2025-12-20)

- [x] **TC-PRO-E2E-005**: 进入购买流程
  - 操作: 查看商品详情 → 点击购买按钮
  - **Expected**: 系统引导用户进入下单流程（跳转到订单创建页面）
  - **Result**: ✅ 通过 (2025-12-20)

### Round 2: 异常场景 (3 scenarios)

- [x] **TC-PRO-E2E-006**: 查看已下架商品
  - 操作: 尝试访问已下架或不可用的商品详情
  - **Expected**: 显示友好提示"该商品暂不可用"，状态显示为 archived
  - **Result**: ✅ 通过 (2025-12-20)

- [ ] **TC-PRO-E2E-007**: 无效商品 ID
  - 操作: 访问不存在的商品 ID (如 /catalog/promotions/999)
  - **Expected**: 返回 404，提示"商品不存在"

- [ ] **TC-PRO-E2E-008**: 商品 ID 格式错误
  - 操作: 访问非数字的商品 ID (如 /catalog/promotions/invalid)
  - **Expected**: 返回 400，提示 ID 格式错误

---

## 📝 Revision History

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1 | 2025-12-18 | 添加 QA E2E Checklist |
| v1.0 | 2025-12-17 | 初始版本 |
