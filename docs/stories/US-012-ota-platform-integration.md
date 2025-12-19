---
id: US-012
title: OTA Platform Integration for Bulk Ticket Reservation
owner: Product
status: "Done"
priority: High
created_date: "2025-11-03"
last_updated: "2025-12-17"
business_requirement: "PRD-002"
enhances:
  - US-001  # Extends ticket system to OTA channel
depends_on:
  - US-001  # Core ticketing foundation required
cards:
  - ota-order-retrieval
  - ota-premade-tickets
  - ota-reservation-management
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-17 | 格式重构 | 验收标准改为 Given/When/Then 格式 |
| 2025-11-06 | 完成 | 实现完成 |
| 2025-11-03 | 创建 | 初始版本 |

---

## 用户目标

**作为** 外部 OTA（在线旅行社）平台
**我想要** 从票务系统预订批量票券
**以便于** 我可以向我的客户销售套餐，并分发给下游分销商扩大市场覆盖

---

## 范围

### 包含 (In Scope)
- OTA 库存预订和管理
- 批量票券生成
- 分销商批次追踪
- 票券激活和核销
- 渠道隔离库存

### 不包含 (Out of Scope)
- 实时动态定价调整
- OTA 平台自助注册
- 分销商自动结算

---

## 验收标准

### A. 库存预订
- **Given** OTA 平台需要为销售准备库存
- **When** OTA 请求预订指定数量的套餐（产品 106-108）
- **Then** 系统分配指定数量的库存给该 OTA，库存与直销渠道隔离

### B. 批量票券生成
- **Given** OTA 平台需要分发票券给下游分销商
- **When** OTA 请求批量生成 100+ 张票券
- **Then** 系统生成票券批次，包含分销商元数据和价格快照

### C. 库存查询
- **Given** OTA 平台需要了解当前库存情况
- **When** OTA 查询可用库存
- **Then** 系统返回实时的各产品可用数量

### D. 票券激活
- **Given** OTA 已将票券销售给最终客户
- **When** OTA 提交激活请求，包含客户信息和支付凭证
- **Then** 票券状态从 PRE_GENERATED 变为 ACTIVE，关联订单创建

### E. 票券核销
- **Given** 客户持有 OTA 渠道的已激活票券
- **When** 客户在场馆扫描二维码
- **Then** 系统验证票券权益并核销，流程与直销票券一致

### F. 渠道隔离
- **Given** 系统运行多个销售渠道
- **When** OTA 渠道和直销渠道同时销售
- **Then** 各渠道库存独立，互不影响

### G. 票券列表查询
- **Given** OTA 需要管理已生成的票券
- **When** OTA 按条件查询票券（状态、批次、日期范围）
- **Then** 系统返回分页的票券列表，仅显示该 OTA 的票券

### H. 票券使用完毕状态更新
- **Given** 票券所有权益已被核销
- **When** 最后一个权益核销完成
- **Then** 系统自动将票券状态更新为 USED

---

## 业务规则

### 库存分配规则
- Product 106 (Premium): 2000 units 分配给 OTA
- Product 107 (Pet Plan): 1500 units 分配给 OTA
- Product 108 (Deluxe): 1500 units 分配给 OTA
- 总计: 5000 套餐库存预留给 OTA 销售

### 预订规则
- OTA 可预订库存，无需立即支付
- 未激活的库存在 24 小时后过期（当前未强制）
- 激活发生在 OTA 支付 webhook 收到时

### 定价规则
- OTA 使用相同的复杂定价引擎（周末/工作日、客户类型）
- 批次生成时锁定价格快照，后续价格变动不影响已生成批次

### 安全规则
- OTA 端点需要 API Key 认证
- 限流: 每 OTA 合作伙伴最多 100 请求/分钟

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| ota-order-retrieval | Done | 票券查询 |
| ota-premade-tickets | Done | 批量生成票券 |
| ota-reservation-management | Done | 预订管理 |

---

## 成功指标

| 指标 | 目标 | 状态 |
|------|------|------|
| OTA 库存分配 | 5000 套餐 | ✅ 已完成 |
| 渠道库存隔离 | 零冲突 | ✅ 已验证 |
| API 响应时间 | < 2秒 | ✅ 已达标 |
