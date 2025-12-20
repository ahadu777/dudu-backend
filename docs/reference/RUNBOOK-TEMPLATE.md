# Runbook 标准模板规范

## 概述

Runbook（执行手册）是端到端测试的可执行指南，用于：
- **开发**：验证功能实现
- **QA**：系统测试和回归测试
- **PM**：验收确认和进度追踪

---

## Runbook 与其他文档的关系

```
PRD (为什么做)
  ↓
Story (用户能做什么) ←── Runbook 验证 Story 的业务验收标准
  ↓
Card (技术怎么实现) ←── Runbook 的测试场景映射到 Card 的 AC
  ↓
Code (实际代码)
```

**核心原则**：Runbook 中的每个测试场景应映射到 Card 的验收标准 (AC)

---

## 模板结构

### 文件命名

```
docs/integration/{Story-ID}-runbook.md
```

示例：`US-010A-runbook.md`、`US-001-runbook.md`

---

## 完整模板

```markdown
# {Story-ID}: {Story 标题}

{一句话描述完整的端到端流程}

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | {Story-ID} |
| **PRD** | {PRD-ID} |
| **Status** | Draft / In Progress / Done |
| **Last Updated** | YYYY-MM-DD |
| **Test Type** | API (Newman) / Frontend E2E (Manual) / Mixed |
| **Automation** | ✅ 100% / ⚠️ 部分自动化 / ❌ 手工测试 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/{collection}.json` |
| Newman Command | `npm run test:prd {N}` 或 `npm run test:story {N}` |
| Newman Report | `reports/newman/{id}-e2e.xml` |
| Related Cards | card-xxx, card-yyy |

---

## 🎯 Business Context

### 用户旅程

```
{用户起点}
  → {步骤1}
  → {步骤2}
  → ...
  → {最终结果}
```

### 测试目标

- [ ] {目标1}
- [ ] {目标2}
- [ ] {目标3}

---

## 🔧 Prerequisites

### 环境准备

- **Base URL**: `http://localhost:8080`
- **Server**: `npm run build && npm start`
- **Database**: MySQL running with seed data

### 测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| User | `Bearer user123` | 用户端操作 |
| Operator | `alice / secret123` | 操作员端操作 |

### 前置数据

- Product ID 101 (3-in-1 pass) 存在
- 测试用户已注册

---

## 🧪 Test Scenarios

### 场景组织原则

测试场景按以下方式组织：

1. **按功能模块分组**（对应 Card）
2. **每个场景映射到 Card AC**
3. **使用 Given-When-Then 格式**
4. **包含 curl 命令或操作步骤**

---

### Module 1: {模块名称}

**Related Card**: `{card-id}`
**Coverage**: {X}/{Y} ACs ({Z}%)

#### TC-{MOD}-001: {场景名称}

**AC Reference**: `{Card-ID}.AC-{N}`

| 状态 | Given | When | Then |
|------|-------|------|------|
| ⏸️ | {前置条件} | {触发动作} | {预期结果} |

**执行步骤**:

```bash
# API 测试示例
curl -s -X POST http://localhost:8080/endpoint \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq '.'
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {}
}
```

**验证点**:
- [ ] 返回状态码 200
- [ ] 响应包含 `status: success`
- [ ] 数据库状态正确更新

---

#### TC-{MOD}-002: {异常场景名称}

**AC Reference**: `{Card-ID}.AC-{N}`

| 状态 | Given | When | Then |
|------|-------|------|------|
| ⏸️ | {异常前置条件} | {触发动作} | {错误处理预期} |

**执行步骤**:

```bash
# 异常测试示例
curl -s -X POST http://localhost:8080/endpoint \
  -H 'Content-Type: application/json' \
  -d '{"invalid": "data"}' | jq '.'
```

**Expected Response**:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "..."
}
```

---

### Module 2: {模块名称}

**Related Card**: `{card-id}`
**Coverage**: {X}/{Y} ACs ({Z}%)

#### TC-{MOD}-001: {场景名称}

...

---

## 📊 Test Summary

### 执行进度

| 模块 | 场景数 | Pass | Fail | Skip | 覆盖率 |
|------|--------|------|------|------|--------|
| Module 1 | 5 | 0 | 0 | 0 | 0% |
| Module 2 | 3 | 0 | 0 | 0 | 0% |
| **Total** | **8** | **0** | **0** | **0** | **0%** |

### AC 覆盖映射

| Card | AC 总数 | 已测试 | 覆盖率 | 状态 |
|------|---------|--------|--------|------|
| card-xxx | 6 | 0 | 0% | ⏸️ |
| card-yyy | 4 | 0 | 0% | ⏸️ |

---

## 🚀 Quick Execution

### 自动化测试 (Newman)

```bash
# 运行此 Story 的测试
npm run test:story {N}

# 或直接运行 Newman
npx newman run postman/auto-generated/{collection}.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman/{id}-e2e.xml
```

### 手工测试流程

```bash
# 完整流程脚本（可复制执行）
export BASE=http://localhost:8080

# Step 1: ...
# Step 2: ...
# Step 3: ...
```

---

## 🔍 Troubleshooting

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 401 Unauthorized | Token 过期或无效 | 重新获取 Token |
| 404 Not Found | 资源不存在 | 检查 ID 是否正确 |
| 500 Server Error | 后端异常 | 查看服务器日志 |

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | YYYY-MM-DD | {author} | 初始版本 |

```

---

## 状态标识说明

| 图标 | 含义 | 使用场景 |
|------|------|----------|
| ⏸️ | 待测试 (Pending) | 测试用例已定义，尚未执行 |
| ✅ | 通过 (Pass) | 测试执行成功 |
| ❌ | 失败 (Fail) | 测试执行失败 |
| ⏭️ | 跳过 (Skip) | 因条件不满足跳过 |
| 🔄 | 重测 (Retest) | 修复后需重新测试 |

---

## 简洁版 vs 详细版

### 何时使用简洁版

适用于：
- 后端 API 测试（可快速转为 Newman 自动化）
- 开发自测
- CI/CD 集成验证

简洁版特点：
- 以 curl 命令为主
- 步骤 + 预期结果
- 无 checkbox 状态追踪

### 何时使用详细版

适用于：
- 前端 E2E 测试（手工执行）
- 发布前回归测试
- PM/QA 验收
- 需要记录测试进度

详细版特点：
- Given-When-Then 格式
- Checkbox 状态追踪
- AC 映射关系
- 覆盖率统计

### 混合版（推荐）

对于大多数 Story，建议使用混合版：

```markdown
## 🧪 Test Scenarios (Given-When-Then + curl)

### TC-001: 正常创建订单

| 状态 | Given | When | Then |
|------|-------|------|------|
| ⏸️ | 用户已登录，产品库存充足 | 提交订单请求 | 订单创建成功，状态为 pending |

**AC Reference**: `order-creation.AC-1`

**执行命令**:
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{"product_id": 101, "qty": 1}' | jq '.'
```

**验证点**:
- [ ] status = 200
- [ ] order.status = "pending"
- [ ] 库存已预留
```

---

## QA E2E Checklist 格式

### 概述

除了基于 Card AC 的 Test Scenarios，Runbook 还可以包含 **QA E2E Checklist** 部分，专门用于 QA 手动端到端测试。

**两种测试内容的区别：**

| 维度 | Test Scenarios (Card AC) | QA E2E Checklist |
|------|-------------------------|------------------|
| **来源** | Card 验收标准 | Story 业务流程 |
| **格式** | Module + TC 表格 | Round + Checklist |
| **用途** | API 级别验证 | 端到端手动测试 |
| **执行者** | 可自动化（Newman） | QA 手动执行 |
| **页面展示** | PRD Coverage Tab | 测试用例 Tab |

### QA E2E Checklist 结构

```markdown
## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (N scenarios)

- [ ] **TC-{MODULE}-{NNN}**: {测试名称}
  - 操作: {具体步骤，用 → 连接}
  - **Expected**: {预期结果}

### Round 2: 异常场景 (N scenarios)

- [ ] **TC-{MODULE}-{NNN}**: {测试名称}
  - 操作: {异常操作步骤}
  - **Expected**: {错误处理预期}

### Round 3: 边界测试 (N scenarios)  <!-- 可选 -->

- [ ] **TC-{MODULE}-{NNN}**: {测试名称}
  - 操作: {边界条件操作}
  - **Expected**: {边界处理预期}
```

### Round 分类标准

| Round | 内容 | 必需 |
|-------|------|------|
| **Round 1: 核心功能** | Happy path，正常业务流程 | ✅ 必需 |
| **Round 2: 异常场景** | 错误处理、网络异常、权限问题 | ✅ 必需 |
| **Round 3: 边界测试** | 边界值、并发、性能 | ⚠️ 可选 |

### TC ID 命名规则

| 部分 | 规则 | 示例 |
|------|------|------|
| `TC-` | 固定前缀 | TC- |
| `{MODULE}` | 功能模块缩写（2-4字母大写） | LOGIN, PAY, ORDER, VERIFY |
| `{NNN}` | 3位序号，从 001 开始 | 001, 002, 003 |

**常用 MODULE 缩写**:
- `LOGIN` - 登录相关
- `ORDER` - 订单相关
- `PAY` - 支付相关
- `VERIFY` - 核销相关
- `PROD` - 产品/商品相关
- `USER` - 用户相关

### QA E2E Checklist 示例

```markdown
## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (4 scenarios)

- [ ] **TC-PROD-001**: 浏览商品列表
  - 操作: 打开小程序 → 进入商品列表页
  - **Expected**: 显示所有可购买商品，包含价格和库存状态

- [ ] **TC-ORDER-001**: 创建订单
  - 操作: 选择商品 → 填写联系人信息 → 点击"去支付"
  - **Expected**: 订单创建成功，跳转支付页面

- [ ] **TC-PAY-001**: 完成支付
  - 操作: 确认订单信息 → 完成微信支付
  - **Expected**: 支付成功，订单状态变为 paid

- [ ] **TC-VERIFY-001**: 核销票券
  - 操作: 商家扫描用户二维码 → 点击确认核销
  - **Expected**: 核销成功，票券状态变为已使用

### Round 2: 异常场景 (2 scenarios)

- [ ] **TC-PAY-002**: 支付取消
  - 操作: 在支付界面点击取消
  - **Expected**: 返回订单页，订单状态保持 pending

- [ ] **TC-VERIFY-002**: 重复核销
  - 操作: 扫描已核销的票券二维码
  - **Expected**: 提示"该票券已核销"，不允许重复核销
```

### 生成流程

1. 读取对应的 Story 文档（`docs/stories/US-xxx.md`）
2. 从 Story 的 Given-When-Then 提取业务流程
3. 生成 QA E2E 测试用例：
   - Round 1: 核心功能（正常流程）
   - Round 2: 异常场景（错误处理）
   - Round 3: 边界测试（可选）
4. 追加到 Runbook 文件的 `## 🧪 QA E2E Checklist` 部分
5. 人工审核/完善

---

## 与 /coverage 页面的集成

### AC 映射规则

Runbook 中的测试场景应包含 `AC Reference` 字段，格式为：

```
{Card-ID}.AC-{N}
```

示例：`order-creation.AC-1`

### Newman 测试命名约定

Newman 测试请求名称应包含 AC 引用：

```
AC-1.1: 正常创建订单 - 返回 pending 状态
```

这样 /coverage 页面可以自动匹配：
1. 解析 Card 文件中的 AC
2. 解析 Newman 测试中的 AC 引用
3. 计算覆盖率

---

## 最佳实践

### 1. 测试场景命名

```markdown
✅ 好的命名：
TC-ORDER-001: 正常创建订单 - 返回 pending 状态
TC-ORDER-002: 库存不足时创建订单 - 返回 400 错误

❌ 不好的命名：
TC-001: 测试订单
TC-002: 测试错误
```

### 2. Given-When-Then 编写

```markdown
✅ 好的写法（具体、可验证）：
Given: 用户已登录（token 有效），产品 101 库存 > 0
When: POST /orders {"product_id": 101, "qty": 1}
Then: 返回 201，order.status = "pending"，inventory.reserved += 1

❌ 不好的写法（模糊、不可验证）：
Given: 正常情况
When: 创建订单
Then: 成功
```

### 3. 保持 Runbook 与代码同步

- 代码变更时更新 Runbook
- API 变更时更新 curl 命令
- 新增 AC 时添加测试场景
- 废弃功能时移除相关场景

### 4. 定期审查

- 每个 Sprint 结束时审查 Runbook 覆盖率
- 修复失败的测试场景
- 补充缺失的 AC 测试

---

## 模板下载

完整模板可复制使用：

1. 复制上述「完整模板」部分
2. 替换 `{placeholder}` 为实际值
3. 根据需要添加/删除测试场景

---

## 相关文档

- [DOCUMENT-SPEC.md](./DOCUMENT-SPEC.md) - PRD/Story/Card 规范
- [AI-TEST-GENERATION.md](./AI-TEST-GENERATION.md) - AI 生成测试指南
- [NEWMAN-REPORT-STANDARD.md](./NEWMAN-REPORT-STANDARD.md) - Newman 报告规范
