# Proposal Reference - 提案机制

## 概述

在执行实质性变更前，生成结构化提案供用户确认，避免假设性错误和返工。

---

## 何时生成提案

| 任务类型 | 需要提案？ | 原因 |
|---------|-----------|------|
| 新功能实现 | ✅ 是 | 涉及多文件修改，需确认理解 |
| API 变更 | ✅ 是 | Breaking change 风险 |
| 重构 | ✅ 是 | 影响范围可能大 |
| 涉及 3+ 文件修改 | ✅ 是 | 复杂度高 |
| 数据库结构变更 | ✅ 是 | 不可逆操作 |
| Bug 修复（复杂） | ⚠️ 视情况 | 影响多处时需要 |
| Bug 修复（简单） | ❌ 否 | 单点修复无需 |
| 文档更新 | ❌ 否 | 低风险 |
| 解释/查询 | ❌ 否 | 不涉及变更 |

---

## 提案格式

```markdown
## Proposal: [简短标题]

### 理解
我理解您的需求是：[用自己的话复述用户需求]

### 影响范围

| 层级 | 文件 | 操作 |
|------|------|------|
| Card | docs/cards/xxx.md | 新建/修改 |
| Story | docs/stories/US-XXX.md | 修改 |
| Code | src/modules/xxx/ | 新建/修改 |
| Test | postman/auto-generated/xxx.json | 新建 |
| DB | src/migrations/xxx.ts | 新建 |

### 实施步骤

1. [步骤1 - 具体动作]
2. [步骤2 - 具体动作]
3. [步骤3 - 具体动作]
...

### 风险与假设

**假设：**
- [假设1 - 如果不成立会怎样]
- [假设2]

**风险：**
- [风险1 - 可能的问题和缓解措施]
- [风险2]

### 待确认

- [ ] 以上理解是否正确？
- [ ] 是否有遗漏的需求？
- [ ] 可以开始执行吗？
```

---

## 用户确认处理

| 用户响应 | 动作 |
|---------|------|
| "是" / "确认" / "开始" / "可以" | 进入 Step 1 Reality Check |
| "不对" / "有问题" / 指出错误 | 修正提案，重新确认 |
| "取消" / "不做了" | 终止任务 |
| 用户补充需求 | 更新提案，重新确认 |

---

## 简化提案（中等复杂度）

对于中等复杂度任务，可使用简化格式：

```markdown
## Proposal: [标题]

**理解**: [一句话复述]

**将修改**:
- [ ] docs/cards/xxx.md
- [ ] src/modules/xxx/service.ts
- [ ] postman/auto-generated/xxx.json

**步骤**:
1. [步骤]
2. [步骤]

确认开始？
```

---

## 提案示例

### 示例 1：新增 API 端点

```markdown
## Proposal: 添加订单取消功能

### 理解
我理解您需要：用户可以取消未发货的订单，取消后触发退款流程。

### 影响范围

| 层级 | 文件 | 操作 |
|------|------|------|
| Card | docs/cards/order-cancel.md | 新建 |
| Code | src/modules/orders/service.ts | 修改 |
| Code | src/modules/orders/router.ts | 修改 |
| Test | postman/auto-generated/prd-001-xxx.json | 修改 |

### 实施步骤

1. 创建 Card 定义 API 契约
2. 实现 POST /orders/:id/cancel 端点
3. 添加订单状态流转逻辑
4. 集成退款服务
5. 更新测试集合
6. 运行测试验证

### 风险与假设

**假设：**
- 仅支持"已支付未发货"订单取消
- 取消后自动全额退款

**风险：**
- 并发取消可能导致重复退款 → 使用乐观锁

### 待确认

- [ ] 以上理解是否正确？
- [ ] 取消是否需要填写原因？
- [ ] 可以开始执行吗？
```

### 示例 2：Breaking API Change

```markdown
## Proposal: channel_id 重命名为 partner_id

### 理解
我理解您需要：将订单创建 API 中的 channel_id 字段重命名为 partner_id，支持多合作伙伴模式。

### ⚠️ Breaking Change 警告

这是一个**破坏性变更**，现有客户端使用 channel_id 的请求将失败。

**建议策略**：
1. 创建 /v2/orders 端点使用新字段
2. 保留 /orders 兼容 6 个月
3. 设置废弃提醒

### 影响范围

| 层级 | 文件 | 操作 |
|------|------|------|
| Card | docs/cards/order-create.md | 修改（添加版本历史） |
| Code | src/modules/orders/router.ts | 修改（添加 v2 路由） |
| Code | src/modules/orders/service.ts | 修改 |
| OpenAPI | openapi/openapi.json | 修改 |

### 待确认

- [ ] 是否采用 /v2 版本化策略？
- [ ] 兼容期设为多久？（建议 6 个月）
- [ ] 可以开始执行吗？
```

---

## 跳过提案的场景

以下场景可直接执行，无需提案：

1. **单文件修复**：typo、简单 bug fix
2. **用户已给出详细规范**：用户提供了完整的 API 契约
3. **用户明确说"直接做"**：显式跳过确认
4. **纯查询/解释任务**：不涉及代码变更

---

## 与 TodoWrite 集成

提案确认后，将步骤转化为 todo list：

```
提案确认 → TodoWrite 创建任务列表 → 进入 Step 1
```
