# 前端对接文档规范

## 概述

前端对接文档（原 Runbook）为前端开发提供 API 调用指南，帮助快速集成后端功能。

### 定位

| 原定位 | 新定位 |
|--------|--------|
| Story 级 E2E 测试文档 | **前端对接指南** |
| 面向 QA | **面向前端开发** |

### 与其他文档的关系

| 文档 | 提供内容 | 面向 |
|------|----------|------|
| Story | 用户能力、业务背景 | PM/BA |
| Card | API 契约、技术规范 | 后端开发 |
| **前端对接文档** | **调用流程、集成示例** | **前端开发** |
| OpenAPI/Swagger | 全量 API 规范 | 全部 |

---

## 文件规范

### 命名规则

```
docs/integration/US-{NNN}-frontend.md
docs/integration/US-{NNN}{A-Z}-frontend.md  # 子 Story
```

**示例**:
- `US-002-frontend.md`（扫码核销）
- `US-014-frontend.md`（微信认证）

### 创建时机

| 场景 | 是否需要 |
|------|----------|
| 新 Story 涉及前端集成 | 是 |
| 纯后端功能 | 否 |
| API 变更影响前端 | 更新现有文档 |

---

## 标准格式

### 模板

```markdown
# US-{NNN}: {功能名称} - 前端对接指南

> 一句话描述此功能的前端集成目标

---

## 调用流程

```
步骤 1: {描述}
  → 步骤 2: {描述}
  → 步骤 3: {描述}
```

| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /api/xxx | {目的} |
| 2 | POST /api/yyy | {目的} |

---

## API 详情

### 1. {API 名称}

**路径**: `POST /api/xxx`

**请求**:
```json
{
  "field1": "value1",
  "field2": 123
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "token": "yyy"
  }
}
```

**错误**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 401 | UNAUTHORIZED | 未登录 |
| 422 | INVALID_PARAM | 参数错误 |

---

## 认证说明

| 场景 | Header |
|------|--------|
| 用户端 | `Authorization: Bearer {user_token}` |
| 操作员端 | `Authorization: Bearer {operator_token}` |

### 获取 Token

1. 用户端: 调用 `/auth/wechat/login` 获取
2. 操作员端: 调用 `/operators/login` 获取

---

## 常见错误

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| `TOKEN_EXPIRED` | Token 过期 | 提示用户重新登录 |
| `INVALID_TOKEN` | Token 无效 | 检查 Header 格式 |

---

## 集成示例

### 示例代码（可选）

```typescript
// 示例：完整调用流程
const token = await login(username, password);
const result = await callApi('/api/xxx', { token, data });
```

---

## 相关资源

| 资源 | 路径 |
|------|------|
| Story | `docs/stories/_index.yaml` → US-{NNN} |
| Cards | `docs/cards/{card-slug}.md` |
| OpenAPI | `/swagger` |
```

---

## 与旧 Runbook 的区别

### 移除的内容

| 旧内容 | 原因 |
|--------|------|
| Metadata (Story/PRD/Status) | 与 `_index.yaml` 重复 |
| Business Context | 与 Story 重复 |
| Test Scenarios (GWT) | 与 Newman 重复 |
| QA E2E Checklist | 被 `/tests` 页面替代 |
| Prerequisites | 移到"认证说明" |

### 新增/强化的内容

| 新内容 | 价值 |
|--------|------|
| 调用流程图 | 一眼看懂集成顺序 |
| 请求/响应示例 | 可直接复制使用 |
| 错误处理建议 | 帮助前端处理异常 |
| 集成示例代码 | 快速上手 |

---

## 工作流集成

### 创建时机

```
Step 2: Execute Development
  └── Story 涉及前端集成时，创建对接文档
```

### 更新时机

```
API 变更（特别是 Breaking Change）时：
  └── 更新相关前端对接文档
  └── 在文档顶部标注变更内容
```

---

## 示例

### 最小示例

```markdown
# US-002: 扫码核销 - 前端对接指南

> 操作员扫描顾客二维码，完成票券核销

---

## 调用流程

| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /operators/login | 操作员登录 |
| 2 | POST /qr/decrypt | 解析二维码 |
| 3 | POST /venue/scan | 执行核销 |

---

## API 详情

### 1. 操作员登录

**路径**: `POST /operators/login`

**请求**:
```json
{ "username": "alice", "password": "secret123" }
```

**响应**:
```json
{ "operator_token": "eyJ..." }
```

---

## 认证说明

核销接口需要携带 `operator_token`:
```
Authorization: Bearer {operator_token}
```

---

## 常见错误

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| ALREADY_REDEEMED | 已核销 | 提示"该权益已使用" |
| TOKEN_EXPIRED | 二维码过期 | 提示"请刷新二维码" |
```

---

## 检查清单

创建前端对接文档时确认：

- [ ] 调用流程清晰（步骤 + API 列表）
- [ ] 每个 API 有请求/响应示例
- [ ] 认证方式说明完整
- [ ] 常见错误有处理建议
- [ ] 可直接复制使用
