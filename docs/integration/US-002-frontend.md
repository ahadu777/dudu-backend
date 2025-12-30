# US-002: 扫码核销 - 前端对接指南

> 操作员扫描顾客二维码，完成票券核销

---

## 调用流程

```
操作员登录
  → 扫描/输入二维码
  → 解析二维码内容
  → 执行核销
```

| 步骤 | API | 说明 |
|------|-----|------|
| 1 | POST /operators/login | 操作员登录，获取 token |
| 2 | POST /qr/decrypt | 解析二维码，获取票券信息 |
| 3 | POST /venue/scan | 执行核销，扣减权益 |

---

## API 详情

### 1. 操作员登录

**路径**: `POST /operators/login`

**请求**:
```json
{
  "username": "alice",
  "password": "secret123"
}
```

**响应**:
```json
{
  "operator_token": "eyJhbGciOiJIUzI1NiIs...",
  "operator_id": 1,
  "venue_code": "central-pier"
}
```

**错误**:
| 状态码 | 说明 |
|--------|------|
| 401 | 用户名或密码错误 |

---

### 2. 解析二维码

**路径**: `POST /qr/decrypt`

**请求**:
```json
{
  "encrypted_data": "从二维码扫描获取的加密字符串"
}
```

**响应**:
```json
{
  "ticket_code": "TKT-20251230-ABCD",
  "jti": "unique-qr-id-123",
  "functions": [
    { "code": "ferry", "name": "渡轮", "remaining": 2 },
    { "code": "sky100", "name": "天际100", "remaining": 1 }
  ],
  "expires_at": "2025-12-30T15:30:00Z"
}
```

**错误**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 422 | INVALID_TOKEN | 二维码格式错误 |
| 422 | TOKEN_EXPIRED | 二维码已过期 |

---

### 3. 执行核销

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

**响应 - 拒绝**:
```json
{
  "result": "reject",
  "reason": "ALREADY_REDEEMED",
  "message": "该权益已核销"
}
```

**错误**:
| 状态码 | 错误码 | 说明 | 处理建议 |
|--------|--------|------|----------|
| 401 | - | 未登录或 token 无效 | 重新登录 |
| 422 | ALREADY_REDEEMED | 同一 JTI + 功能码已核销 | 提示"已核销" |
| 422 | NO_REMAINING | 该权益次数已用完 | 提示"次数用完" |
| 422 | WRONG_FUNCTION | 票券不包含此权益 | 提示"无此权益" |
| 422 | TOKEN_EXPIRED | 二维码已过期 | 提示"请刷新二维码" |

---

## 认证说明

| 接口 | 认证方式 |
|------|----------|
| /operators/login | 无需认证 |
| /qr/decrypt | 无需认证 |
| /venue/scan | **需要** `Authorization: Bearer {operator_token}` |

**Header 示例**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 前端实现建议

### 1. 扫码流程

```
用户点击"扫码"
  → 调用摄像头扫描
  → 获取 encrypted_data
  → POST /qr/decrypt 预览票券信息
  → 显示权益列表供操作员选择
  → 操作员选择权益
  → POST /venue/scan 执行核销
  → 显示结果
```

### 2. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 二维码过期 | 提示"二维码已过期，请让顾客刷新" |
| 已核销 | 提示"该权益已使用"，显示核销时间 |
| 次数用完 | 提示"该权益次数已用完" |
| 网络错误 | 提示"网络异常，请重试" |

### 3. 离线考虑

- 核销必须在线完成（需要实时验证）
- 建议：网络断开时禁用扫码按钮

---

## 相关资源

| 资源 | 路径 |
|------|------|
| Story | `docs/stories/_index.yaml` → US-002 |
| Cards | `docs/cards/operators-login.md`, `docs/cards/venue-enhanced-scanning.md` |
| OpenAPI | `/swagger` |
