---
id: US-009
title: User Profile and Settings
owner: Product
status: "Done"
priority: Medium
created_date: "2025-10-21"
last_updated: "2025-12-17"
business_requirement: "PRD-001"
depends_on: []
cards:
  - user-profile-endpoint
  - user-activity-endpoint
  - user-settings-endpoint
  - miniprogram-profile
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-17 | 格式重构 | 验收标准改为 Given/When/Then 格式 |
| 2025-10-21 | 创建 | 初始版本 |

---

## 用户目标

**作为** 已注册用户
**我想要** 访问和管理我的个人资料和设置
**以便于** 我可以查看和更新我的账户信息

---

## 范围

### 包含 (In Scope)
- 查看个人资料信息
- 更新个人资料
- 账户设置管理（通知偏好等）
- 查看账户活动历史

### 不包含 (Out of Scope)
- 账户删除
- 多账户切换
- 社交媒体绑定

---

## 验收标准

### A. 查看个人资料
- **Given** 用户已登录系统
- **When** 用户访问个人资料页面
- **Then** 系统显示用户的姓名、邮箱、手机号等基本信息

### B. 更新个人资料
- **Given** 用户正在查看个人资料
- **When** 用户修改姓名或联系方式并保存
- **Then** 系统验证输入格式，保存更改，并显示更新成功提示

### C. 修改通知偏好
- **Given** 用户在设置页面
- **When** 用户更改通知偏好（如关闭促销通知）
- **Then** 系统保存偏好设置，后续通知行为符合用户设置

### D. 查看账户活动
- **Given** 用户想了解账户历史操作
- **When** 用户查看账户活动记录
- **Then** 系统显示最近的登录记录、订单记录等活动历史

### E. 邮箱格式验证
- **Given** 用户尝试更新邮箱地址
- **When** 用户输入无效的邮箱格式
- **Then** 系统显示格式错误提示，不保存更改

---

## 业务规则

1. **访问权限**：只有已认证用户可以访问自己的资料
2. **数据验证**：邮箱格式验证、必填字段检查
3. **安全规则**：修改敏感信息（如密码）需要验证当前密码
4. **审计追踪**：所有资料修改都记录日志
5. **隐私保护**：用户只能查看和修改自己的资料

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| user-profile-endpoint | Done | 个人资料管理 API |
| user-settings-endpoint | Done | 设置和偏好 API |
| user-activity-endpoint | Done | 活动历史 API |
| miniprogram-profile | Done | 小程序用户资料管理 |
