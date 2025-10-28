---
id: US-010
title: DeepTravel 小程序全链路购票与核销体验
owner: Product
status: Draft
priority: High
last_update: 2025-10-24T18:28:44+08:00
---

## Business goal
为赴港旅客提供从“查询 → 下单锁座 → 支付 → 票券管理 → 核销/退改 → 结案”的端到端闭环能力，统一串联旅客端、商家端与管理员后台，确保车票、船票与套票权益在同一平台内可查询、购买、核销与结算。

## Actors
- 旅客小程序用户（购票、支付、票券管理、退改）
- 商家核销员（扫码核销、核销记录对账）
- 平台管理员（配置线路票价、套票权益、退改规则、商家入驻、促销活动）
- 第三方服务：线路/班次数据源、微信支付、通知渠道

## Scope (in)
- 热门城市/班次/套票搜索与缓存策略（24h、年度缓存）
- 订单锁座 10 分钟（可配置）、多人购票、阶梯定价、权益快照生成
- 微信支付下单与支付状态回调，支付成功后票券批量生成
- 票券生命周期（可核销 → 已核销/退改/改签/过期）及共享权益支持
- 商家扫码核销、核销记录、终端权限
- 管理后台的套票模板、线路票价、退改规则、商家与促销配置
- 通知策略（支付成功、取消、退改、核销、到期提醒、可选订单完成）

## Scope (out)
- 非微信支付渠道、积分体系、打卡地图、即时通讯、本地体验预约等增值能力
- 未涉及的跨境实名制扩展、纸质票据邮寄流程

## Acceptance (Given / When / Then)
**A. 查询可售资源**
- Given 管理员已配置线路、班次、套票模板与库存
- When 旅客在小程序选择出发地/目的地/日期/乘客类型查询
- Then 返回支持多人阶梯定价的车票、船票与套票列表，展示余票、退改摘要及权益概览，热门城市与禁售日命中缓存策略。

**B. 下单锁座成功**
- Given 旅客选定商品并填写乘客信息
- When 提交订单
- Then 系统校验库存并锁座（默认 10 分钟），生成 `pending` 订单附带乘客、权益快照与 `lockExpireAt`。

**C. 支付与票券生成**
- Given 订单处于锁座有效期内
- When 微信支付回调成功
- Then 更新订单为 `paid`，基于快照为每位乘客及共享权益生成票券（含有效期、加密二维码）；支付失败或超时则取消订单并释放锁座。

**D. 票券状态维护**
- Given 订单已支付且票券可用
- When 旅客发起退改/改签或系统检测到过期
- Then 根据退改策略更新票券状态为 `refunded`、`changing`、`changed` 或 `expired`，并在全部票券进入终态后将订单标记为 `completed` 或 `cancelled`。

**E. 核销闭环**
- Given 商家端核销员已登录并具备扫码权限
- When 扫描订单码或单券码
- Then 展示对应票券列表，支持逐项核销、记录核销日志并向旅客推送成功通知。

**F. 管理配置与监控**
- Given 管理员访问后台
- When 管理套票模板、线路票价、退改规则、促销、商家
- Then 变更即时生效并可从后台监控订单与票券状态指标。

**G. 通知能力**
- Given 任一状态变更达到通知条件
- When 触发支付成功、订单取消、退改结果、核销成功或权益到期提醒
- Then 旅客收到约定的微信通知；如开启订单完成提醒亦需发送。

## Non-functional constraints
- 核心接口（查询、建单、支付回调、核销）95% 响应 < 500ms
- 支持 ≥10,000 并发订单创建与 ≥1,000 QPS 核销请求
- 二维码载荷需加密或包含一次性 token 防止伪造
- 定时任务保障票券过期处理，通知推送具备重试机制

## Links
- 子故事：
  - [US-010A — DeepTravel 旅客闭环体验](US-010A-traveler-loop.md)
  - [US-010B — DeepTravel 运营支撑体系](US-010B-operations-backbone.md)
- 复用能力：catalog-endpoint、order-create-idempotent、payment-webhook、tickets-issuance、tickets-scan、ticket-cancellation、refund-processing
- 运行验证（见子故事 Runbook 与 Newman 场景）

## Decomposition & Cards
- **US-010A** 聚焦旅客闭环，囊括：
  - travel-search-hub
  - seat-lock-service
  - wechat-payment-session
  - bundle-ticket-engine
- **US-010B** 聚焦运营支撑，囊括：
  - admin-package-config
  - ticket-lifecycle-daemon
  - notification-orchestrator
  - merchant-redemption-console
