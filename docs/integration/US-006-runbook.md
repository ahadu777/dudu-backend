# US-006: Operator Authentication Runbook

操作员认证完整测试：登录认证 → Token 验证 → 多操作员 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-006 |
| **PRD** | PRD-003 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-006-*.json` |
| Newman Command | `npm run test:story 006` |
| Related Cards | `operators-login` |

---

## 🎯 Business Context

### 用户旅程

```
操作员到达工位
  → 输入用户名密码
  → 获取认证 Token
  → Token 用于扫描操作
  → 班次结束登出
```

### 测试目标

- [ ] 验证操作员登录
- [ ] 验证 Token 格式
- [ ] 验证错误凭证拒绝
- [ ] 验证 Token 可用于扫描

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **操作员 1** | `alice / secret123` | 测试操作员 |
| **操作员 2** | `bob / secret456` | 测试操作员 |

---

## 🧪 Test Scenarios

### Module 1: 操作员登录

**Related Card**: `operators-login`
**Coverage**: 4/4 ACs (100%)

#### TC-AUTH-001: Alice 登录成功

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效凭证 alice/secret123 | POST /operators/login | 返回 200，包含 operator_token |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 JWT 格式的 operator_token
- [ ] Token 以 "eyJ" 开头

---

#### TC-AUTH-002: Bob 登录成功

**AC Reference**: `operators-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效凭证 bob/secret456 | POST /operators/login | 返回 200，包含 operator_token |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回不同于 Alice 的 Token
- [ ] 两个 Token 可同时有效

---

#### TC-AUTH-003: 错误密码被拒绝

**AC Reference**: `operators-login.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 错误密码 alice/wrongpassword | POST /operators/login | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 不返回 token
- [ ] 提示凭证无效

---

#### TC-AUTH-004: 不存在用户被拒绝

**AC Reference**: `operators-login.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 不存在的用户名 | POST /operators/login | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 不泄露用户是否存在

---

### Module 2: 凭证验证

**Related Card**: `operators-login`
**Coverage**: 3/3 ACs (100%)

#### TC-AUTH-005: 缺少用户名

**AC Reference**: `operators-login.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 请求体只有 password | POST /operators/login | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示缺少 username

---

#### TC-AUTH-006: 缺少密码

**AC Reference**: `operators-login.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 请求体只有 username | POST /operators/login | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 提示缺少 password

---

#### TC-AUTH-007: 空请求体

**AC Reference**: `operators-login.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 空 JSON {} | POST /operators/login | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 验证错误提示

---

### Module 3: Token 使用验证

**Related Card**: `operators-login`
**Coverage**: 3/3 ACs (100%)

#### TC-AUTH-008: Token 可用于扫描

**AC Reference**: `operators-login.AC-7`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 operator_token | POST /venue/scan | 不返回认证错误 |

**验证点**:
- [ ] 不返回 401
- [ ] 可能返回 QR 验证错误（非认证错误）
- [ ] Token 被系统接受

---

#### TC-AUTH-009: 无效 Token 被拒绝

**AC Reference**: `operators-login.AC-8`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无效的 Token 字符串 | POST /venue/scan | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示 Token 无效

---

#### TC-AUTH-010: 无 Token 被拒绝

**AC Reference**: `operators-login.AC-9`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | POST /venue/scan | 返回错误 |

**验证点**:
- [ ] 提示需要 operator token
- [ ] 无法执行扫描

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 操作员登录 | 4 | pending |
| 凭证验证 | 3 | pending |
| Token 使用验证 | 3 | pending |
| **Total** | **10** | **0/10 通过** |

---

## 🔗 Related Documentation

- [operators-login](../cards/operators-login.md)

## Security Notes

- **Token 有效期**: 8 小时（典型班次时长）
- **Token 存储**: 客户端应安全存储，登出时清除
- **审计日志**: 所有认证事件都会记录
- **速率限制**: 生产环境需考虑实现

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/operators/login` | POST | None | 操作员认证 |
| `/venue/scan` | POST | Operator Token | 扫描核销票券 |
