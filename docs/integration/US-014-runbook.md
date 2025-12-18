# US-014: WeChat Mini-Program Authentication Runbook

微信小程序认证完整测试：登录授权 → 手机号绑定 → Token 管理 → 错误处理

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-014 |
| **PRD** | PRD-004 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-014-*.json` |
| Newman Command | `npm run test:story 014` |
| Related Cards | `wechat-login`, `wechat-phone-binding`, `miniprogram-auth` |

---

## 🎯 Business Context

### 用户旅程

```
用户打开小程序
  → 微信授权登录
  → 获取用户基本信息
  → 可选：绑定手机号
  → 获取完整用户资料
```

### 测试目标

- [ ] 验证微信登录流程
- [ ] 验证手机号绑定
- [ ] 验证 JWT Token 管理
- [ ] 验证错误处理

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **测试 Code** | `test_wechat_code_001` | Mock 模式测试码 |
| **手机 Code** | `phone_auth_code_001` | 手机号绑定测试码 |

---

## 🧪 Test Scenarios

### Module 1: 微信登录

**Related Card**: `wechat-login`
**Coverage**: 4/4 ACs (100%)

#### TC-WX-001: 新用户微信登录

**AC Reference**: `wechat-login.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效的微信 code | POST /api/v1/auth/wechat/login | 返回 200，创建新用户 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 JWT token
- [ ] 返回 user 对象
- [ ] needs_phone = true（新用户）

---

#### TC-WX-002: 老用户微信登录

**AC Reference**: `wechat-login.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已存在用户的微信 code | POST /api/v1/auth/wechat/login | 返回现有用户信息 |

**验证点**:
- [ ] 返回相同的 user.id
- [ ] 返回新的 JWT token
- [ ] 用户信息保持不变

---

#### TC-WX-003: 缺少 code 参数

**AC Reference**: `wechat-login.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 请求体为空 | POST /api/v1/auth/wechat/login | 返回 400 验证错误 |

**验证点**:
- [ ] 返回状态码 400
- [ ] code = VALIDATION_ERROR
- [ ] errors 包含 "code is required"

---

#### TC-WX-004: 空 code 参数

**AC Reference**: `wechat-login.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | code 为空字符串 | POST /api/v1/auth/wechat/login | 返回 400 验证错误 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 验证错误提示

---

### Module 2: 手机号绑定

**Related Card**: `wechat-phone-binding`
**Coverage**: 4/4 ACs (100%)

#### TC-WX-005: 绑定手机号成功

**AC Reference**: `wechat-phone-binding.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 JWT Token 和手机 code | POST /api/v1/auth/wechat/phone | 返回 200，绑定手机号 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 phone 字段
- [ ] user.phone 已更新

---

#### TC-WX-006: 无认证绑定手机号

**AC Reference**: `wechat-phone-binding.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | POST /api/v1/auth/wechat/phone | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] code = UNAUTHORIZED

---

#### TC-WX-007: 无效 Token 绑定手机号

**AC Reference**: `wechat-phone-binding.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无效的 JWT Token | POST /api/v1/auth/wechat/phone | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] 提示 Token 无效

---

#### TC-WX-008: 缺少手机 code

**AC Reference**: `wechat-phone-binding.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 Token，无 code | POST /api/v1/auth/wechat/phone | 返回 400 |

**验证点**:
- [ ] 返回状态码 400
- [ ] 验证错误提示

---

### Module 3: Token 验证

**Related Card**: `miniprogram-auth`
**Coverage**: 3/3 ACs (100%)

#### TC-WX-009: Token 格式正确

**AC Reference**: `miniprogram-auth.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 登录成功 | 检查返回的 token | JWT 格式正确 |

**验证点**:
- [ ] Token 以 "eyJ" 开头
- [ ] 包含三段（header.payload.signature）
- [ ] 可解码为有效 JSON

---

#### TC-WX-010: Token 包含用户信息

**AC Reference**: `miniprogram-auth.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 有效 JWT Token | 解码 Token payload | 包含 user_id |

**验证点**:
- [ ] payload 包含 user_id
- [ ] payload 包含 exp（过期时间）

---

#### TC-WX-011: Token 有效期 7 天

**AC Reference**: `miniprogram-auth.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 新生成的 Token | 检查 exp 字段 | 有效期约 7 天 |

**验证点**:
- [ ] exp - iat ≈ 604800 (7天秒数)

---

### Module 4: 确定性测试

**Related Card**: `wechat-login`
**Coverage**: 2/2 ACs (100%)

#### TC-WX-012: Mock 模式确定性 - OpenID

**AC Reference**: `wechat-login.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | Mock 模式 | 相同 code 多次登录 | 返回相同 openid |

**验证点**:
- [ ] 相同 code → 相同 wechat_openid
- [ ] 确保测试可重复

---

#### TC-WX-013: Mock 模式确定性 - 手机号

**AC Reference**: `wechat-phone-binding.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | Mock 模式 | 相同 phone code | 返回相同手机号 |

**验证点**:
- [ ] 相同 phone code → 相同 phone
- [ ] 确保测试可重复

---

### Module 5: 完整流程

**Related Card**: `miniprogram-auth`
**Coverage**: 2/2 ACs (100%)

#### TC-WX-014: 端到端登录绑定流程

**AC Reference**: `miniprogram-auth.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 新用户 | 登录 → 绑定手机号 | 完整用户资料 |

**验证点**:
- [ ] 登录返回 needs_phone = true
- [ ] 绑定后 phone 不为空
- [ ] 用户 auth_type = wechat

---

#### TC-WX-015: 已绑定用户登录

**AC Reference**: `miniprogram-auth.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 已绑定手机的用户 | 再次登录 | phone 信息保留 |

**验证点**:
- [ ] needs_phone = false
- [ ] user.phone 不为空

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 微信登录 | 4 | pending |
| 手机号绑定 | 4 | pending |
| Token 验证 | 3 | pending |
| 确定性测试 | 2 | pending |
| 完整流程 | 2 | pending |
| **Total** | **15** | **0/15 通过** |

---

## 🔗 Related Documentation

- [wechat-login](../cards/wechat-login.md)
- [wechat-phone-binding](../cards/wechat-phone-binding.md)
- [miniprogram-auth](../cards/miniprogram-auth.md)
