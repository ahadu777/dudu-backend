---
id: US-010B
title: DeepTravel 运营支撑体系
owner: Product
status: "Draft"
priority: High
last_update: 2025-10-26T19:45:00+08:00
business_requirement: "PRD-008"
enhances:
  - US-002
  - US-005
  - US-006
  - US-007
depends_on:
  - US-001
  - US-004
cards:
  - admin-package-config
  - venue-enhanced-scanning      # 替代 merchant-redemption-console
  - route-schedule-management    # 线路班次管理（PRD-008 Phase 2）
# deprecated:
#   - notification-orchestrator  # 未实现
#   - merchant-redemption-console # 合并到 venue-enhanced-scanning
#   - ticket-lifecycle-daemon    # 已移除
related_features:
  - ticket-cancellation
  - refund-processing
  - venue-enhanced-scanning      # 替代 tickets-scan
---

## Business goal
为 DeepTravel 提供运营所需的后台配置、票券生命周期治理、通知编排与商家核销体验，保证业务扩展不破坏既有购票/退款链路，支撑多端同步。

## Scope (in)
- 管理后台配置线路票价、套票模板、退改策略、商家与促销
- 定时与事件驱动的票券生命周期守护（过期、退改、共享权益终态）
- 核心通知策略（支付成功、取消、退改、核销、到期提醒）与重试
- 商家核销 API 扩展：扫码订单/单券、逐项核销、日志与权限控制

## Scope (out)
- 旅客下单与支付流程
- 支付网关接驳细节（由 US-010A 覆盖）
- 复杂财务结算或跨系统对账

## Acceptance (Given / When / Then)
**A. 配置驱动生效**
- Given 管理员通过后台发布线路、票价、退改规则或促销
- When 变更成功保存
- Then 对应配置在三端（旅客查询、核销、通知）即时生效，且复制缓存或锁座逻辑可读取最新数据

**B. 票券生命周期守护**
- Given 票券进入待过期或退改流程
- When `ticket-lifecycle-daemon` 定时任务或事件触发
- Then 更新票券状态并视情况调用 `ticket-cancellation` → `refund-processing`，同时写入审计日志

**C. 通知编排** ⏸️ (DEFERRED)
> 注：`notification-orchestrator` 未实现，通知功能暂缓

**D. 核销与报表联动**
- Given 商家核销员登录控制台
- When 扫描订单码或单券码核销
- Then 按权限逐项核销、写入核销日志（使用 `venue-enhanced-scanning`）

## Business rules
1. 后台配置改动需写入审计，并触发缓存刷新或配置下发。
2. 通知队列必须幂等，防止重复推送；失败重试遵循指数退避。
3. 核销接口尊重操作员权限与设备绑定，沿用 `validators-sessions` 模型。
4. Lifecycle 守护与退款处理确保票券终态和订单终态一致，避免孤儿记录。

## Integration impact
- **admin-package-config**：扩展现有配置 API，与 `promotion-detail-endpoint`、`catalog-endpoint` 保持一致命名。
- **venue-enhanced-scanning**：提供核销 API (`/venue/scan`) 和核销记录 (`/venue/redemptions`)。
> 注：以下模块已废弃或未实现
> - ~~ticket-lifecycle-daemon~~ - 已废弃
> - ~~notification-orchestrator~~ - 未实现
> - ~~merchant-redemption-console~~ - 合并到 venue-enhanced-scanning

## Telemetry & validation
- 更新 `docs/integration/` Runbook 覆盖后台配置、核销链路。
- Story 完成后执行 `npm run validate:integration`、`npm run test:e2e` 并关注通知重试指标。
