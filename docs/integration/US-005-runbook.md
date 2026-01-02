# US-005: Business Reporting - Redemptions Runbook

业务报表完整测试：核销报表查询 → 多维度筛选 → 分页 → 数据分析

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-005 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-005-*.json` |
| Newman Command | `npm run test:story 005` |
| Related Cards | `redemption-reports`, `business-analytics` |

---

## 🎯 Business Context

### 用户旅程

```
管理员登录系统
  → 选择报表模块
  → 设置日期范围
  → 应用筛选条件
  → 查看核销数据
  → 导出报表
```

### 测试目标

- [ ] 验证核销报表查询
- [ ] 验证多维度筛选
- [ ] 验证分页功能
- [ ] 验证权限控制

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **Admin Token** | 需要管理员权限 | 报表访问权限 |
| **测试数据** | 运行 US-001/US-002 | 生成核销记录 |

---

## 🧪 Test Scenarios

### Module 1: 基础查询

**Related Card**: `redemption-reports`
**Coverage**: 3/3 ACs (100%)

#### TC-RPT-001: 按日期范围查询

**AC Reference**: `redemption-reports.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有核销记录存在 | GET /reports/redemptions?from=...&to=... | 返回 200，包含核销列表 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 redemptions 数组
- [ ] 每条记录包含 timestamp, ticket_code, function_code
- [ ] 数据在指定日期范围内

---

#### TC-RPT-002: 无认证访问被拒绝

**AC Reference**: `redemption-reports.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | GET /reports/redemptions | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示需要认证

---

#### TC-RPT-003: 无效日期格式

**AC Reference**: `redemption-reports.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 错误的日期格式 | GET /reports/redemptions?from=invalid | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示日期格式错误

---

### Module 2: 多维度筛选

**Related Card**: `redemption-reports`
**Coverage**: 3/3 ACs (100%)

#### TC-RPT-004: 按场馆筛选

**AC Reference**: `redemption-reports.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 多个场馆有核销记录 | GET /reports/redemptions?location_id=52 | 仅返回场馆 52 数据 |

**验证点**:
- [ ] 所有记录 location_id = 52
- [ ] 其他场馆数据被过滤

---

#### TC-RPT-005: 按功能码筛选

**AC Reference**: `redemption-reports.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 多种功能有核销 | GET /reports/redemptions?function_code=ferry | 仅返回 ferry 数据 |

**验证点**:
- [ ] 所有记录 function_code = ferry
- [ ] 其他功能数据被过滤

---

#### TC-RPT-006: 按产品筛选

**AC Reference**: `redemption-reports.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 多产品有核销 | GET /reports/redemptions?product_id=101 | 仅返回产品 101 数据 |

**验证点**:
- [ ] 所有记录 product_id = 101
- [ ] 其他产品数据被过滤

---

### Module 3: 分页与导出

**Related Card**: `business-analytics`
**Coverage**: 3/3 ACs (100%)

#### TC-RPT-007: 分页查询

**AC Reference**: `business-analytics.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 大量核销记录 | GET /reports/redemptions?limit=10&offset=0 | 返回分页数据 |

**验证点**:
- [ ] redemptions.length <= 10
- [ ] 返回 pagination 对象
- [ ] 包含 total, has_more

---

#### TC-RPT-008: 分页遍历

**AC Reference**: `business-analytics.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | offset=10 | GET /reports/redemptions?limit=10&offset=10 | 返回第二页 |

**验证点**:
- [ ] 数据与第一页不重复
- [ ] offset 正确生效

---

#### TC-RPT-009: 实时数据

**AC Reference**: `business-analytics.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 刚完成核销 | GET /reports/redemptions | 新记录立即可见 |

**验证点**:
- [ ] 最新核销记录出现
- [ ] 无延迟

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 基础查询 | 3 | pending |
| 多维度筛选 | 3 | pending |
| 分页与导出 | 3 | pending |
| **Total** | **9** | **0/9 通过** |

---

## 🔗 Related Documentation

- [redemption-reports](../cards/redemption-reports.md)
- [business-analytics](../cards/business-analytics.md)

## Query Parameters Reference

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| from | ISO datetime | Start time (required) | 2025-10-19T00:00:00+08:00 |
| to | ISO datetime | End time (required) | 2025-10-20T23:59:59+08:00 |
| location_id | number | Filter by location | 52 |
| function_code | string | Filter by function | ferry |
| product_id | number | Filter by product | 101 |
| limit | number | Results per page | 50 |
| offset | number | Results offset | 0 |

## Expected Response Format

```json
{
  "redemptions": [
    {
      "redemption_id": "red_12345",
      "timestamp": "2025-10-20T10:30:15+08:00",
      "ticket_code": "TKT-ABC123",
      "product_id": 101,
      "function_code": "ferry",
      "location_id": 52,
      "operator_id": "alice"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [ ] **TC-RPT-101**: 按日期范围查询核销记录
  - 操作: 管理员登录 → 设置日期范围 (from/to) → 调用 GET /reports/redemptions?from=...&to=...
  - **Expected**: 返回 200，包含 redemptions 数组，每条记录包含 timestamp、ticket_code、function_code，数据在指定日期范围内

- [ ] **TC-RPT-102**: 按场馆筛选核销数据
  - 操作: 在报表页面 → 选择场馆 (location_id=52) → 调用 GET /reports/redemptions?location_id=52
  - **Expected**: 所有返回记录的 location_id = 52，其他场馆数据被正确过滤

- [ ] **TC-RPT-103**: 按功能码筛选核销数据
  - 操作: 选择功能 (ferry) → 调用 GET /reports/redemptions?function_code=ferry
  - **Expected**: 所有返回记录的 function_code = ferry，其他功能数据被正确过滤

- [ ] **TC-RPT-104**: 分页查询大量数据
  - 操作: 查询核销记录 → 使用分页参数 (limit=10, offset=0) → 调用 GET /reports/redemptions?limit=10&offset=0
  - **Expected**: 返回 redemptions.length <= 10，包含 pagination 对象（total、has_more）

- [ ] **TC-RPT-105**: 实时数据可见性
  - 操作: 完成一次核销 → 立即查询报表
  - **Expected**: 最新核销记录立即出现在报表中，无延迟

### Round 2: 异常场景 (3 scenarios)

- [ ] **TC-RPT-201**: 无认证访问被拒绝
  - 操作: 不携带 Authorization header → 调用 GET /reports/redemptions
  - **Expected**: 返回 401，提示需要认证

- [ ] **TC-RPT-202**: 无效日期格式被拒绝
  - 操作: 使用错误日期格式 (from=invalid) → 调用 GET /reports/redemptions?from=invalid
  - **Expected**: 返回 400，提示日期格式错误

- [ ] **TC-RPT-203**: 缺少必需参数
  - 操作: 不提供 from/to 参数 → 调用 GET /reports/redemptions
  - **Expected**: 返回 400，提示缺少必需的日期参数

### Round 3: 边界测试 (3 scenarios)

- [ ] **TC-RPT-301**: 多条件组合筛选
  - 操作: 同时使用 location_id + function_code + product_id 筛选
  - **Expected**: 返回同时满足所有条件的记录，过滤逻辑正确

- [ ] **TC-RPT-302**: 分页遍历所有数据
  - 操作: 使用 offset=0 获取第一页 → offset=10 获取第二页 → 持续遍历
  - **Expected**: 数据不重复不遗漏，offset 正确生效，has_more 准确标识是否有更多数据

- [ ] **TC-RPT-303**: 空结果集
  - 操作: 查询不存在记录的日期范围或条件
  - **Expected**: 返回 200，redemptions 数组为空，pagination.total = 0

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | AI | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | Initial | 初始版本 |
