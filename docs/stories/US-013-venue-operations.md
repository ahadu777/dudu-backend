---
id: US-013
title: Event Venue Operations Platform
owner: Product
status: "Done"
priority: High
created_date: "2025-11-04"
last_updated: "2025-12-17"
business_requirement: "PRD-003"
depends_on:
  - US-001  # 票券必须存在才能核销
  - US-002  # 操作员认证基础
cards:
  - venue-management-crud
  - venue-enhanced-scanning
  - venue-analytics-reporting
  - operator-validation-scanner
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-17 | 格式重构 | 验收标准改为 Given/When/Then 格式 |
| 2025-11-25 | 完成 | 实现完成 |
| 2025-11-04 | 创建 | 初始版本 |

---

## 用户目标

**作为** 码头、礼品店或游乐场的场馆操作员
**我想要** 扫描客户票券并实时验证其权益
**以便于** 我可以提供无缝服务，同时防止欺诈并追踪核销记录

---

## 范围

### 包含 (In Scope)
- 场馆管理（增删改查）
- 二维码扫描核销
- 防重放攻击
- 场馆分析报表

### 不包含 (Out of Scope)
- 离线核销队列
- 手动输入票券编码
- 场馆排班管理

---

## 验收标准

### A. 场馆管理

#### A1. 查看场馆列表
- **Given** 管理员需要查看所有场馆
- **When** 管理员访问场馆列表
- **Then** 系统显示所有活跃场馆及其支持的功能

#### A2. 创建新场馆
- **Given** 管理员需要添加新场馆
- **When** 管理员提交场馆信息（编码、名称、类型、支持功能）
- **Then** 系统创建场馆，返回成功确认

#### A3. 更新场馆信息
- **Given** 管理员需要修改场馆配置
- **When** 管理员更新场馆名称或支持功能
- **Then** 系统保存更改，场馆配置立即生效

#### A4. 场馆编码唯一性
- **Given** 管理员尝试创建新场馆
- **When** 场馆编码与已存在的重复
- **Then** 系统拒绝创建，返回明确的错误信息

### B. 扫描核销

#### B1. 有效票券核销
- **Given** 操作员已登录，客户持有有效票券
- **When** 操作员扫描客户的二维码
- **Then** 系统验证票券权益，扣减使用次数，返回核销成功

#### B2. 未激活票券拒绝
- **Given** OTA 票券尚未激活
- **When** 操作员扫描该票券
- **Then** 系统拒绝核销，提示"票券未激活"

#### B3. 重放攻击防护
- **Given** 某二维码已在该场馆核销过某功能
- **When** 同一二维码再次扫描相同功能
- **Then** 系统拒绝核销，提示"该功能已核销"

#### B4. 操作员认证要求
- **Given** 未登录的用户
- **When** 尝试执行扫描操作
- **Then** 系统拒绝请求，返回认证错误

### C. 场馆分析

#### C1. 查看场馆指标
- **Given** 经理需要了解场馆运营情况
- **When** 经理查询某时间段的场馆分析
- **Then** 系统返回总扫描数、成功率、欺诈尝试次数、功能分布

#### C2. 时间窗口限制
- **Given** 经理查询分析数据
- **When** 时间窗口超过 1 周
- **Then** 系统拒绝请求，提示"时间窗口不能超过 168 小时"

---

## 业务规则

### 场馆类型
- **码头** (ferry_terminal): 主要功能 ferry_boarding
- **礼品店** (gift_shop): 主要功能 gift_redemption
- **游乐场** (playground): 主要功能 playground_token

### 多功能场馆
- 部分场馆支持多种功能（如长洲码头支持登船+礼品+游乐场）
- 场馆配置中的 `supported_functions` 数组定义支持的功能

### 扫描规则
1. 操作员 JWT 必须有效
2. 二维码签名验证
3. JTI + function_code 唯一约束防重放
4. 只有 ACTIVE 状态票券可扫描
5. 功能权益必须有剩余次数

### 分析规则
- 时间窗口限制: 1-168 小时（最长 1 周）
- 成功率 = 成功扫描数 / 总扫描数
- 欺诈率追踪因重放尝试被拒绝的扫描

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| venue-management-crud | Done | 场馆 CRUD 操作 |
| venue-enhanced-scanning | Done | 带防欺诈的二维码扫描 |
| venue-analytics-reporting | Done | 性能指标和分析 |
| operator-validation-scanner | Done | 操作员验证扫描器 |

---

## 性能指标

| 指标 | 目标 | 实际 |
|------|------|------|
| API 响应时间 | < 2s | < 100ms |
| 欺诈检测 | 实时 | 实时 JTI 追踪 |
| 审计追踪 | 7 年 | 完整记录 |
