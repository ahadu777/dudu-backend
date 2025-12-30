# US-019: OTA 操作员管理 - 前端对接指南

> OTA 平台创建和管理核销操作员，操作员通过小程序扫码核销 OTA 渠道票券

---

## 用户角色

| 角色 | 说明 | 对接方式 |
|------|------|----------|
| OTA 平台 | 创建/管理操作员 | 服务端 API (API Key) |
| OTA 操作员 | 扫码核销票券 | 小程序 (JWT Token) |

---

## Part A: OTA 平台 - 操作员管理

### 调用流程

```
OTA 平台后台
  → 创建操作员账号
  → 分发账号给操作员
  → 管理操作员状态
```

| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /api/ota/operators | 创建操作员 |
| 2 | GET /api/ota/operators | 查询操作员列表 |
| 3 | GET /api/ota/operators/:id | 查询单个操作员 |
| 4 | PATCH /api/ota/operators/:id | 更新操作员信息 |
| 5 | DELETE /api/ota/operators/:id | 禁用操作员 |

### API 详情

#### 1. 创建操作员

**路径**: `POST /api/ota/operators`

**请求**:
```json
{
  "account": "operator001",
  "password": "securepass123",
  "real_name": "张三"
}
```

**响应**:
```json
{
  "id": 1,
  "account": "operator001",
  "real_name": "张三",
  "status": "ACTIVE",
  "operator_type": "OTA",
  "created_at": "2025-12-30T10:00:00Z"
}
```

**错误**:
| 状态码 | 说明 |
|--------|------|
| 400 | 参数验证失败 (account 4-50字符, password 至少6字符) |
| 409 | 账号已存在 |

#### 2. 查询操作员列表

**路径**: `GET /api/ota/operators`

**参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 可选，筛选状态 (ACTIVE/DISABLED) |
| page | number | 页码，默认 1 |
| limit | number | 每页数量，默认 20 |

**响应**:
```json
{
  "data": [
    {
      "id": 1,
      "account": "operator001",
      "real_name": "张三",
      "status": "ACTIVE",
      "operator_type": "OTA",
      "created_at": "2025-12-30T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### 3. 禁用操作员

**路径**: `DELETE /api/ota/operators/:id`

**响应**:
```json
{
  "message": "Operator disabled"
}
```

**错误**:
| 状态码 | 说明 |
|--------|------|
| 404 | 操作员不存在或不属于此 OTA |

### 认证说明

OTA 平台 API 使用 API Key 认证：

```
X-API-Key: {ota_api_key}
```

---

## Part B: OTA 操作员 - 扫码核销

### 调用流程

```
操作员打开小程序
  → 登录获取 token
  → 查看可用场地
  → 扫描二维码
  → 解析票券信息
  → 执行核销
```

| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /operators/login | 操作员登录 |
| 2 | GET /venue | 获取可用场地列表 |
| 3 | POST /qr/decrypt | 解析二维码 |
| 4 | POST /venue/scan | 执行核销 |

### API 详情

#### 1. 操作员登录

**路径**: `POST /operators/login`

**请求**:
```json
{
  "username": "operator001",
  "password": "securepass123"
}
```

**响应**:
```json
{
  "operator_token": "eyJhbGciOiJIUzI1NiIs...",
  "operator_id": 1,
  "venue_code": null,
  "partner_id": "ota-partner-001"
}
```

> 注意：OTA 操作员返回的 token 中包含 `partner_id`，用于后续接口的权限校验

**错误**:
| 状态码 | 说明 |
|--------|------|
| 401 | 用户名或密码错误 |
| 403 | 操作员已被禁用 |

#### 2. 获取可用场地

**路径**: `GET /venue`

**响应**:
```json
{
  "venues": [
    {
      "code": "ferry-pier",
      "name": "渡轮码头",
      "functions": ["ferry"]
    }
  ]
}
```

> OTA 操作员只能看到其 OTA 关联的场地

#### 3. 解析二维码

**路径**: `POST /qr/decrypt`

**请求**:
```json
{
  "encrypted_data": "从二维码扫描获取的加密字符串"
}
```

**响应 - 成功**:
```json
{
  "ticket_code": "TKT-20251230-ABCD",
  "jti": "unique-qr-id-123",
  "functions": [
    { "code": "ferry", "name": "渡轮", "remaining": 2 }
  ],
  "expires_at": "2025-12-30T15:30:00Z"
}
```

**响应 - OTA 渠道不匹配**:
```json
{
  "error": "PARTNER_MISMATCH",
  "message": "此票券不属于您的渠道"
}
```

**错误**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 422 | INVALID_TOKEN | 二维码格式错误 |
| 422 | TOKEN_EXPIRED | 二维码已过期 |
| 403 | PARTNER_MISMATCH | 票券不属于此 OTA 渠道 |

#### 4. 执行核销

**路径**: `POST /venue/scan`

**请求**:
```json
{
  "qr_token": "从二维码扫描获取的加密字符串",
  "function_code": "ferry"
}
```

**响应 - 成功**:
```json
{
  "result": "success",
  "ticket_code": "TKT-20251230-ABCD",
  "function_code": "ferry",
  "remaining_uses": 1,
  "message": "核销成功，剩余 1 次"
}
```

**响应 - OTA 渠道不匹配**:
```json
{
  "result": "reject",
  "reason": "PARTNER_MISMATCH",
  "message": "无权核销此票券"
}
```

**错误**:
| 状态码 | 错误码 | 说明 | 处理建议 |
|--------|--------|------|----------|
| 401 | - | 未登录或 token 无效 | 重新登录 |
| 403 | PARTNER_MISMATCH | 票券不属于此 OTA | 提示"非本渠道票券" |
| 422 | ALREADY_REDEEMED | 已核销 | 提示"已核销" |
| 422 | NO_REMAINING | 次数用完 | 提示"次数用完" |

### 认证说明

OTA 操作员使用 JWT 认证：

```
Authorization: Bearer {operator_token}
```

---

## 权限隔离说明

| 场景 | 行为 |
|------|------|
| OTA-A 操作员扫 OTA-A 票券 | 正常核销 |
| OTA-A 操作员扫 OTA-B 票券 | 拒绝，返回 PARTNER_MISMATCH |
| OTA-A 操作员扫直销票券 | 拒绝，返回 PARTNER_MISMATCH |
| OTA 操作员查场地列表 | 只返回 OTA 关联场地 |

---

## 常见错误汇总

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| PARTNER_MISMATCH | 票券渠道不匹配 | 提示"非本渠道票券，无法核销" |
| ALREADY_REDEEMED | 已核销 | 提示"该权益已使用" |
| TOKEN_EXPIRED | 二维码过期 | 提示"请让顾客刷新二维码" |
| OPERATOR_DISABLED | 操作员已禁用 | 提示"账号已被禁用，请联系管理员" |

---

## 相关资源

| 资源 | 路径 |
|------|------|
| Story | `docs/stories/_index.yaml` → US-019 |
| Card | `docs/cards/ota-operator-management.md` |
| 依赖 Story | US-012 (OTA 平台), US-014 (小程序认证) |
| OpenAPI | `/swagger` |
