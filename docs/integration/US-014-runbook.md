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

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (7 scenarios)

- [ ] **TC-AUTH-001**: 首次登录（新用户）  <!-- 原 TC-WX-101，已迁移 -->
  - 操作: 打开小程序 → 点击"微信登录"按钮 → 授权
  - **Expected**: 系统自动创建账号，显示登录成功，可访问购票和订单功能

- [ ] **TC-WX-102**: 再次登录（老用户）
  - 操作: 已登录用户 → 关闭小程序 → 重新打开 → 点击"微信登录"
  - **Expected**: 系统识别用户，登录成功，可看到之前的订单和船票

- [ ] **TC-WX-103**: 保持登录状态（7天内）
  - 操作: 登录后 → 关闭小程序 → 3 天后重新打开
  - **Expected**: 仍保持登录状态，无需重新登录

- [ ] **TC-WX-104**: 登录过期（超过7天）
  - 操作: 登录后 → 8 天后打开小程序
  - **Expected**: 提示重新登录，点击"微信登录"可恢复

- [ ] **TC-WX-105**: 手机号绑定（可选）
  - 操作: 登录后 → 点击"绑定手机号" → 授权
  - **Expected**: 获取并保存手机号，显示绑定成功

- [ ] **TC-WX-106**: 跳过手机绑定
  - 操作: 系统提示绑定手机号 → 点击"跳过"
  - **Expected**: 可跳过，仍能正常使用系统功能

- [ ] **TC-WX-107**: Token 格式和有效期验证
  - 操作: 登录成功后 → 检查返回的 JWT Token
  - **Expected**: Token 格式正确，包含 user_id 和 exp，有效期约 7 天

### Round 2: 异常场景 (4 scenarios)

- [ ] **TC-WX-201**: 登录失败处理
  - 操作: 模拟网络异常 → 尝试登录
  - **Expected**: 显示友好错误提示，提供"重试"按钮

- [ ] **TC-WX-202**: 缺少 code 参数
  - 操作: 发送登录请求时缺少微信 code
  - **Expected**: 返回 400，提示 "code is required"

- [ ] **TC-WX-203**: 无认证绑定手机号
  - 操作: 不提供 Authorization header → 尝试绑定手机号
  - **Expected**: 返回 401，错误码 UNAUTHORIZED

- [ ] **TC-WX-204**: 无效 Token 绑定
  - 操作: 使用无效或过期的 JWT Token → 尝试绑定手机号
  - **Expected**: 返回 401，提示 Token 无效

### Round 3: 边界测试 (2 scenarios)

- [ ] **TC-WX-301**: 同一微信账号多次登录
  - 操作: 使用相同微信账号在不同设备登录
  - **Expected**: 每个微信用户只有一个系统账号，用户数据在所有设备同步

- [ ] **TC-WX-302**: Mock 模式确定性
  - 操作: 在 Mock 模式下，使用相同 code 多次登录
  - **Expected**: 返回相同 openid 和用户信息，确保测试可重复

---

## 📝 Revision History

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.1 | 2025-12-18 | Claude | 添加 QA E2E Checklist |
| 1.0 | 2025-12-17 | System | 初始版本 |
