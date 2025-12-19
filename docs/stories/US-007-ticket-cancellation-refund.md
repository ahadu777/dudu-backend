---
id: US-007
title: Ticket Cancellation and Refund
owner: Product
status: "Done"
priority: Medium
created_date: "2025-10-20"
last_updated: "2025-12-17"
business_requirement: "PRD-001"
depends_on:
  - US-001  # 票券必须存在才能取消
  - US-004  # 支付必须完成才能退款
cards:
  - ticket-cancellation
  - cancellation-policies
  - refund-processing
---

## 变更日志
| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-12-17 | 格式重构 | 验收标准改为 Given/When/Then 格式 |
| 2025-10-20 | 创建 | 初始版本 |

---

## 用户目标

**作为** 已购票的用户
**我想要** 取消未使用的票券并获得退款
**以便于** 当我无法使用票券时不会损失金钱

---

## 范围

### 包含 (In Scope)
- 票券取消申请
- 基于使用情况的退款计算
- 票券状态变更（VOID）
- 取消和退款历史查看

### 不包含 (Out of Scope)
- 部分退款争议处理
- 第三方渠道退款（OTA 渠道）
- 自动退款审批流程

---

## 验收标准

### A. 取消未使用票券
- **Given** 用户有一张未使用的票券（状态为 ACTIVE）
- **When** 用户申请取消该票券
- **Then** 系统计算 100% 退款金额，票券状态变为 VOID

### B. 取消部分使用的票券
- **Given** 用户有一张部分使用的票券（已核销 1-50%）
- **When** 用户申请取消该票券
- **Then** 系统计算 50% 退款金额，票券状态变为 VOID

### C. 退款金额计算
- **Given** 用户取消了票券并确认退款金额
- **When** 系统处理退款请求
- **Then** 退款通过原支付方式返还给用户

### D. 查看取消历史
- **Given** 用户曾取消过票券
- **When** 用户查看取消和退款历史
- **Then** 系统显示所有取消记录，包括取消时间、退款金额、处理状态

### E. 拒绝已完全使用的票券取消
- **Given** 用户有一张已完全使用的票券（100% 核销）
- **When** 用户尝试取消该票券
- **Then** 系统拒绝取消请求，提示"票券已完全使用，无法退款"

---

## 业务规则

1. **取消资格**：只有 ACTIVE 或 PARTIALLY_REDEEMED 状态的票券可以取消
2. **退款计算**：
   - 0% 已使用：100% 退款
   - 1-50% 已使用：50% 退款
   - 51-99% 已使用：25% 退款
   - 100% 已使用：0% 退款（不可取消）
3. **状态变更**：取消后票券状态变为 VOID，不可恢复
4. **审计追踪**：所有取消操作记录取消原因和退款金额

---

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| ticket-cancellation | Done | 票券取消逻辑和 API |
| refund-processing | Done | 退款处理 |
| cancellation-policies | Done | 业务规则和政策端点 |
