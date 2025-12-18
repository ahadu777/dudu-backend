# US-009: User Profile and Settings Runbook

用户资料设置完整测试：查看资料 → 更新资料 → 设置管理 → 活动历史

---

## 📋 Metadata

| 字段 | 值 |
|------|-----|
| **Story** | US-009 |
| **PRD** | PRD-001 |
| **Status** | Done |
| **Last Updated** | 2025-12-17 |
| **Test Type** | API (Newman) + Manual |
| **Automation** | ✅ 全自动化 |

### 关联测试资产

| 资产类型 | 路径/命令 |
|---------|----------|
| Newman Collection | `postman/auto-generated/us-009-*.json` |
| Newman Command | `npm run test:story 009` |
| Related Cards | `user-profile`, `user-settings` |

---

## 🎯 Business Context

### 用户旅程

```
用户登录系统
  → 查看个人资料
  → 修改资料信息
  → 管理通知设置
  → 查看活动历史
```

### 测试目标

- [ ] 验证资料查看功能
- [ ] 验证资料更新功能
- [ ] 验证设置管理功能
- [ ] 验证活动历史查询

---

## 🔧 Prerequisites

| 项目 | 值 | 说明 |
|------|-----|------|
| **Base URL** | `http://localhost:8080` | 本地开发环境 |
| **用户 Token** | JWT Token | 需要认证 |
| **测试用户** | ID 123 | 种子数据 |

---

## 🧪 Test Scenarios

### Module 1: 用户资料

**Related Card**: `user-profile`
**Coverage**: 3/3 ACs (100%)

#### TC-PRF-001: 获取用户资料

**AC Reference**: `user-profile.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证 | GET /profile | 返回 200，包含资料信息 |

**验证点**:
- [ ] 返回状态码 200
- [ ] 返回 user_id, name, email
- [ ] 返回 preferences 对象
- [ ] 返回 created_at, updated_at

---

#### TC-PRF-002: 更新用户资料

**AC Reference**: `user-profile.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证 | PUT /profile | 返回 200，资料已更新 |

**验证点**:
- [ ] 返回状态码 200
- [ ] name 已更新
- [ ] preferences 已合并更新
- [ ] updated_at 已更新

---

#### TC-PRF-003: 无认证访问被拒绝

**AC Reference**: `user-profile.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无 Authorization header | GET /profile | 返回 401 |

**验证点**:
- [ ] 返回状态码 401
- [ ] code = UNAUTHORIZED

---

### Module 2: 用户设置

**Related Card**: `user-settings`
**Coverage**: 4/4 ACs (100%)

#### TC-PRF-004: 获取用户设置

**AC Reference**: `user-settings.AC-1`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证 | GET /profile/settings | 返回结构化设置 |

**验证点**:
- [ ] 返回 notification_settings
- [ ] 返回 privacy_settings
- [ ] 返回 display_preferences

---

#### TC-PRF-005: 更新通知设置

**AC Reference**: `user-settings.AC-2`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证 | PUT /profile/settings | 通知设置已更新 |

**验证点**:
- [ ] notification_settings 已更新
- [ ] 其他设置保持不变
- [ ] 部分更新正确合并

---

#### TC-PRF-006: 更新隐私设置

**AC Reference**: `user-settings.AC-3`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户已认证 | PUT /profile/settings | 隐私设置已更新 |

**验证点**:
- [ ] privacy_settings 已更新
- [ ] profile_visibility 生效

---

#### TC-PRF-007: 无效设置值被拒绝

**AC Reference**: `user-settings.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 无效的语言代码 | PUT /profile/settings | 返回 422 |

**验证点**:
- [ ] 返回状态码 422
- [ ] 验证错误提示

---

### Module 3: 活动历史

**Related Card**: `user-profile`
**Coverage**: 3/3 ACs (100%)

#### TC-PRF-008: 获取活动历史

**AC Reference**: `user-profile.AC-4`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 用户有活动记录 | GET /profile/activity | 返回活动列表 |

**验证点**:
- [ ] 返回 activities 数组
- [ ] 每条记录包含 type, action, timestamp
- [ ] 返回 pagination 信息

---

#### TC-PRF-009: 按类型筛选活动

**AC Reference**: `user-profile.AC-5`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 指定 type=profile | GET /profile/activity?type=profile | 仅返回资料相关活动 |

**验证点**:
- [ ] 所有记录 type = profile
- [ ] 其他类型被过滤

---

#### TC-PRF-010: 活动历史分页

**AC Reference**: `user-profile.AC-6`

| 状态 | Given | When | Then |
|------|-------|------|------|
| pending | 指定 limit 和 offset | GET /profile/activity?limit=10&offset=0 | 返回分页数据 |

**验证点**:
- [ ] activities.length <= limit
- [ ] pagination.has_more 正确
- [ ] offset 生效

---

## 📊 Summary

| Module | Test Cases | Status |
|--------|-----------|--------|
| 用户资料 | 3 | pending |
| 用户设置 | 4 | pending |
| 活动历史 | 3 | pending |
| **Total** | **10** | **0/10 通过** |

---

## 🔗 Related Documentation

- [user-profile](../cards/user-profile.md)
- [user-settings](../cards/user-settings.md)

## Expected Response Formats

### Profile Response
```json
{
  "user_id": "123",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "preferences": {
    "language": "en",
    "timezone": "UTC"
  },
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Settings Response
```json
{
  "notification_settings": {
    "email_notifications": true,
    "push_notifications": true
  },
  "privacy_settings": {
    "profile_visibility": "private"
  },
  "display_preferences": {
    "language": "en",
    "currency_display": "USD"
  }
}
```

---

## 🧪 QA E2E Checklist

> 本节为 QA 手动测试清单，从 Story 业务流程生成。

### Round 1: 核心功能 (5 scenarios)

- [ ] **TC-PRF-E2E-001**: 查看个人资料
  - 操作: 用户已登录 → 访问个人资料页面
  - **Expected**: 显示用户的姓名、邮箱、手机号、创建时间等基本信息

- [ ] **TC-PRF-E2E-002**: 更新个人资料
  - 操作: 用户在个人资料页 → 修改姓名或联系方式 → 保存
  - **Expected**: 系统验证输入格式，保存更改，显示"更新成功"提示，updated_at 时间戳更新

- [ ] **TC-PRF-E2E-003**: 修改通知偏好
  - 操作: 用户进入设置页面 → 更改通知偏好（如关闭促销通知）→ 保存
  - **Expected**: 系统保存偏好设置，后续通知行为符合用户设置

- [ ] **TC-PRF-E2E-004**: 查看账户活动历史
  - 操作: 用户访问账户活动记录页面
  - **Expected**: 显示最近的登录记录、订单记录等活动历史，包含时间戳和操作类型

- [ ] **TC-PRF-E2E-005**: 筛选和分页活动历史
  - 操作: 在活动历史页 → 按类型筛选（如 type=profile）→ 设置分页参数
  - **Expected**: 仅显示指定类型的活动，分页正确工作

### Round 2: 异常场景 (3 scenarios)

- [ ] **TC-PRF-E2E-006**: 邮箱格式验证
  - 操作: 用户尝试更新邮箱 → 输入无效的邮箱格式（如 "invalid-email"）
  - **Expected**: 系统显示格式错误提示，不保存更改

- [ ] **TC-PRF-E2E-007**: 无效设置值被拒绝
  - 操作: 用户尝试设置无效的语言代码（如 "xyz"）
  - **Expected**: 返回 422，提示验证错误

- [ ] **TC-PRF-E2E-008**: 无认证访问被拒绝
  - 操作: 不提供 Authorization header → 访问 GET /profile
  - **Expected**: 返回 401，code = UNAUTHORIZED

---

## 📝 Revision History

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1 | 2025-12-18 | 添加 QA E2E Checklist |
| v1.0 | 2025-12-17 | 初始版本 |
