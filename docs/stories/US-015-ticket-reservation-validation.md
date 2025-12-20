---
id: US-015
title: Ticket Reservation & Validation System
owner: Product
status: "Draft"
priority: High
created_date: "2025-11-14"
last_updated: "2025-12-17"
business_requirement: "PRD-006"  # 原 PRD-007 已合并到 PRD-006
depends_on:
  - US-001  # 票券必须存在
  - US-004  # 支付完成后才能预约
cards:
  - reservation-slot-management
  - customer-reservation-portal
  - operator-validation-scanner
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-17 | 格式重构 | 验收标准改为 Given/When/Then 格式 |
| 2025-11-14 | 创建 | 初始版本 |

---

## 用户目标

**作为** 已购票的客户
**我想要** 选择特定的日期和时段进行预约
**以便于** 我可以规划行程，避免场馆过度拥挤

---

## 范围

### 包含 (In Scope)
- 时段容量管理
- 客户预约流程
- 操作员验证扫描
- 预约确认通知

### 不包含 (Out of Scope)
- 预约修改和取消（MVP 不支持）
- 候补名单
- 动态定价

---

## 验收标准

### A. 客户预约流程

#### A1. 票券验证
- **Given** 客户持有已支付的票券
- **When** 客户输入票券编码进入预约页面
- **Then** 系统验证票券状态为 ACTIVATED，显示预约日历

#### A2. 查看可用时段
- **Given** 客户正在选择预约日期
- **When** 客户点击某一天
- **Then** 系统显示该日所有时段及剩余容量（如"150/200 可用"）

#### A3. 创建预约
- **Given** 客户选择了日期和时段
- **When** 客户确认预约
- **Then** 系统创建预约，票券状态变为 RESERVED，发送确认邮件含二维码

#### A4. 时段已满处理
- **Given** 某时段已达容量上限
- **When** 客户尝试预约该时段
- **Then** 系统拒绝预约，提示"该时段已满"，推荐其他可用时段

### B. 操作员验证

#### B1. 有效预约验证
- **Given** 客户预约了今天的时段
- **When** 操作员扫描客户二维码
- **Then** 屏幕显示绿色"有效票券"，显示客户信息，可点击"标记已验证"

#### B2. 日期不匹配
- **Given** 客户预约的是其他日期
- **When** 操作员扫描客户二维码
- **Then** 屏幕显示红色"日期不符"，显示预约日期

#### B3. 未预约票券
- **Given** 客户票券已激活但未预约
- **When** 操作员扫描客户二维码
- **Then** 屏幕显示红色"未预约"，提示客户需先预约时段

#### B4. 重复扫描
- **Given** 票券已在 09:30 被操作员 Jane 验证
- **When** 另一操作员再次扫描同一票券
- **Then** 屏幕显示黄色"已验证"，显示验证时间和操作员

### C. 容量管理

#### C1. 容量强制执行
- **Given** 某时段剩余 1 个名额
- **When** 2 位客户同时尝试预约
- **Then** 第一位成功，第二位收到"时段已满"错误

---

## 业务规则

### 预约规则
- **一票一约**：每张票券只能有一个有效预约
- **容量硬限制**：时段容量为硬上限，不允许超额预订
- **不可修改（MVP）**：MVP 阶段预约创建后不可更改或取消

### 验证规则
- **严格日期匹配**：预约日期必须等于当前日期，无宽限期
- **状态检查**：只有 RESERVED 状态且日期匹配的票券可通过验证
- **幂等验证**：重复扫描显示警告但不阻止

### 票券状态流转
```
ACTIVATED → RESERVED → VERIFIED
                    ↘ EXPIRED (时段过期)
```

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| reservation-slot-management | Draft | 时段配置和容量管理 |
| customer-reservation-portal | Draft | 客户预约界面和流程 |
| operator-validation-scanner | Done | 操作员扫描验证 |
