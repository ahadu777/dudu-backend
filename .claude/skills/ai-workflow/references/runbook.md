# Runbook 规范

## 概述

Runbook 是 Story 级别的端到端测试文档，用于验证完整的业务流程。

### 定位

```
PRD Tests (业务规则)     → Newman + PRD Acceptance Criteria
    ↓
Story Tests (E2E流程)    → Runbook + Newman Collection  ← 本文档规范
    ↓
Card Tests (端点级)      → curl + Newman
```

### 与其他文档的关系

| 文档 | 视角 | 验收标准来源 |
|------|------|-------------|
| PRD | 产品/商业 | 业务目标、成功指标 |
| Story | 用户（黑盒） | 用户能力、业务验收 |
| Card | 技术（白盒） | API 契约、技术验收 |
| **Runbook** | **测试（执行）** | **Story AC + Card AC 的可执行验证** |

---

## 文件规范

### 命名规则

```
docs/integration/US-{NNN}-runbook.md
docs/integration/US-{NNN}{A-Z}-runbook.md  # 子 Story
```

**示例**:
- `US-001-runbook.md`
- `US-010A-runbook.md`
- `US-010B-runbook.md`

### 创建时机

| 场景 | 是否需要 Runbook |
|------|-----------------|
| 新 Story 创建 | ✅ 必须创建 |
| Story 状态变为 Done | ✅ 必须有对应 Runbook |
| 纯 Card 级改动 | ❌ 不需要（用 curl 验证） |
| Bug 修复 | ❌ 通常不需要 |

---

## 标准格式

### 完整模板

```markdown
# US-{NNN}: {Story Title} Runbook

{一句话描述端到端流程}

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-{NNN} |
| **PRD** | PRD-{NNN} |
| **Status** | Draft / In Progress / Done |
| **Last Updated** | YYYY-MM-DD |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 / ⚠️ 部分自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-{NNN}-*.json` |
| Newman Command | `npm run test:story {NNN}` |
| Related Cards | `card-1`, `card-2`, ... |

---

## 🎯 Business Context

### 用户旅程

```
步骤 1
  → 步骤 2
  → 步骤 3
  → ...
```

### 业务验收标准 (来自 Story)

| Sub-Story | Given | When | Then |
|-----------|-------|------|------|
| **A - xxx** | ... | ... | ... |
| **B - xxx** | ... | ... | ... |

### 测试目标

- [ ] 目标 1
- [ ] 目标 2

---

## 🔧 Prerequisites

### 环境准备

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **启动命令** | `npm run build && npm start` | 编译并启动服务 |
| **健康检查** | `curl http://localhost:8080/healthz` | 验证服务运行中 |

### 测试账号

| 角色 | 凭证 | 用途 |
|------|------|------|
| **User** | `Authorization: Bearer xxx` | 用户端操作 |
| **Operator** | `username / password` | 操作员登录 |

### 前置数据

| 数据 | 要求 | 验证方式 |
|------|------|----------|
| ... | ... | ... |

---

## 🧪 Test Scenarios

### Module 1: {模块名称}

**Related Card**: `{card-slug}`
**Coverage**: X/Y ACs (100%)

#### TC-{XXX}-001: {测试用例名称}

**AC Reference**: `{card-slug}.AC-{N}`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | {前置条件} | {执行动作} | {预期结果} |

**执行命令**:
```bash
curl -s http://localhost:8080/endpoint | jq '.'
```

**验证点**:
- [ ] 验证点 1
- [ ] 验证点 2

---

## 📊 Test Summary

### 验证清单

| 模块 | 测试用例数 | 状态 |
|------|-----------|------|
| Module 1: xxx | N | pending |
| Module 2: xxx | N | pending |
| **Total** | **N** | - |

---

## 📎 相关资产

| 资产 | 路径 |
|------|------|
| Story 文档 | `docs/stories/US-{NNN}.md` |
| Newman Collection | `postman/auto-generated/us-{NNN}-*.json` |
```

---

## 命名规范

### Module 命名

```markdown
### Module {N}: {中文模块名}
```

**示例**:
- `### Module 1: 商品目录查询`
- `### Module 2: 订单创建与管理`
- `### Module 3: 支付流程`

### TC (Test Case) 命名

```markdown
#### TC-{XXX}-{NNN}: {中文测试名称}
```

**命名规则**:
- `{XXX}`: 3 字母缩写，代表模块或功能
- `{NNN}`: 3 位数字序号，从 001 开始

**常用缩写**:

| 缩写 | 含义 | 示例 |
|------|------|------|
| CAT | Catalog 商品目录 | TC-CAT-001 |
| ORD | Order 订单 | TC-ORD-001 |
| PAY | Payment 支付 | TC-PAY-001 |
| TKT | Ticket 票券 | TC-TKT-001 |
| OTA | OTA 渠道 | TC-OTA-001 |
| OPS | Operations 运营 | TC-OPS-001 |
| TRV | Travel 旅行 | TC-TRV-001 |
| VEN | Venue 场馆 | TC-VEN-001 |
| AUTH | Authentication 认证 | TC-AUTH-001 |
| USR | User 用户 | TC-USR-001 |

---

## 状态规范

### 状态值

| 状态 | 含义 | 使用场景 |
|------|------|----------|
| `pending` | 待测试 | 新建用例，尚未执行 |
| `passed` | 已通过 | 测试执行成功 |
| `failed` | 已失败 | 测试执行失败 |
| `skipped` | 已跳过 | 依赖不满足或暂不测试 |

### Given-When-Then 表格格式

```markdown
| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | {前置条件} | {执行动作} | {预期结果} |
```

**注意**:
- 状态列使用文本（`pending`/`passed`/`failed`/`skipped`）
- 不要使用图标（~~⏸️~~ ~~✅~~ ~~❌~~）
- 表格必须有分隔行 `|------|-------|------|------|`

---

## AC Reference 规范

### 格式

```markdown
**AC Reference**: `{card-slug}.AC-{N}`
```

### 映射关系

```
Card: catalog-endpoint.md
  ├── AC-1: 获取商品列表
  ├── AC-2: 获取商品详情
  └── AC-3: 检查库存

Runbook: US-001-runbook.md
  ├── TC-CAT-001 → catalog-endpoint.AC-1
  ├── TC-CAT-002 → catalog-endpoint.AC-2
  └── TC-CAT-003 → catalog-endpoint.AC-3
```

### Coverage 计算

```markdown
**Coverage**: 3/3 ACs (100%)
```

计算方式：`已覆盖的 AC 数 / Card 总 AC 数`

---

## 验证点编写指南

### 格式

```markdown
**验证点**:
- [ ] 验证点 1
- [ ] 验证点 2
- [ ] 验证点 3
```

### 好的验证点

| 类型 | 示例 |
|------|------|
| 状态码 | `返回状态码 200` |
| 字段存在 | `响应包含 order_id` |
| 字段值 | `status 为 "PENDING"` |
| 数组长度 | `products.length >= 1` |
| 业务规则 | `不产生重复支付记录` |

### 避免的验证点

| 避免 | 原因 |
|------|------|
| `接口正常` | 太模糊 |
| `数据正确` | 没有具体标准 |
| `没有报错` | 不是正面验证 |

---

## 执行命令规范

### 格式

```markdown
**执行命令**:
```bash
curl -s http://localhost:8080/endpoint | jq '.'
```
```

### 最佳实践

1. **使用变量保存中间结果**:
```bash
ORDER_ID=$(curl -s -X POST http://localhost:8080/orders ... | jq -r '.order_id')
echo "Order ID: $ORDER_ID"
```

2. **显示 HTTP 状态码**:
```bash
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8080/endpoint
```

3. **使用 jq 格式化输出**:
```bash
curl -s http://localhost:8080/endpoint | jq '.'
```

4. **添加必要的 Header**:
```bash
curl -s http://localhost:8080/endpoint \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token'
```

---

## 工作流集成

### 何时创建 Runbook

```
Step 2: Execute Development
  └── Story 实现完成后，创建对应 Runbook
```

### 何时更新 Runbook

```
Step 3: Verify Completion
  └── 执行 Runbook 中的测试用例
  └── 更新测试状态 (pending → passed/failed)
```

### 验证命令

```bash
# 检查 Runbook 格式
grep -c "^### Module" docs/integration/US-{NNN}-runbook.md
grep -c "^#### TC-" docs/integration/US-{NNN}-runbook.md

# 运行自动化测试
npm run test:story {NNN}
```

---

## 示例

### 最小示例

```markdown
### Module 1: 商品目录

**Related Card**: `catalog-endpoint`
**Coverage**: 1/1 ACs (100%)

#### TC-CAT-001: 获取商品列表

**AC Reference**: `catalog-endpoint.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 服务运行中 | GET /catalog | 返回 200 |

**执行命令**:
```bash
curl -s http://localhost:8080/catalog | jq '.'
```

**验证点**:
- [ ] 返回状态码 200
- [ ] products 数组非空
```

### 完整示例

参考：`docs/integration/US-001-runbook.md`

---

## 检查清单

创建 Runbook 时确认：

- [ ] 文件名符合规范 `US-{NNN}-runbook.md`
- [ ] Metadata 完整（Story、PRD、Status、Last Updated）
- [ ] 每个 Module 有 `**Related Card**` 和 `**Coverage**`
- [ ] 每个 TC 有 `**AC Reference**`
- [ ] GWT 表格格式正确（有分隔行）
- [ ] 状态使用文本（pending/passed/failed/skipped）
- [ ] 执行命令可直接复制运行
- [ ] 验证点具体可测量
