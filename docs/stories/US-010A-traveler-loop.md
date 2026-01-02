---
id: US-010A
title: DeepTravel 旅客闭环体验
owner: Product
status: "Done"
priority: High
last_update: 2025-12-11T15:00:00+08:00
business_requirement: "PRD-008"
enhances:
  - US-001
  - US-003
  - US-004
depends_on:
  - US-001
cards:
  # Phase 1 - 已完成
  - miniprogram-product-catalog    # Done - 商品列表/详情/库存
  - miniprogram-order              # Done - 订单创建/列表/详情
  # 支付 - 已完成
  - wallyt-payment                 # Done - 微信支付（替代 wechat-payment-session）
  - payment-webhook                # Done - 票券生成（出票逻辑已合并到此 Card）
  # DEPRECATED
  # - travel-search-hub            # DEPRECATED - 线路/套票搜索 (模块已删除，功能整合到 miniprogram-product-catalog)
  # - seat-lock-service            # DEPRECATED - 锁座服务 (模块已删除，功能整合到 miniprogram-order)
  # - wechat-payment-session       # DEPRECATED - 被 wallyt-payment 替代
related_features:
  - payment-webhook
  - my-tickets
  - qr-token
---

## Business goal
为旅客提供从线路查询、下单锁座、支付到票券生成的单一闭环，确保 DeepTravel 小程序能够直接复用已有购票资产并扩展多线路、多乘客场景。

## Scope (in)
- 线路/套票查询（含热门城市、禁售日、乘客类型筛选）
- 下单时的锁座与阶梯定价权益快照
- 微信支付下单参数生成与支付成功回调衔接
- 支付成功后批量生成票券并回写订单终态

## Scope (out)
- 商家核销、后台配置管理
- 通知编排、售后退改
- 运营报表或 KPI 面板

## Acceptance (Given / When / Then)
**A. 查询与缓存**
- Given 管理后台已发布可售线路与套票
- When 旅客搜索线路与套票
- Then 系统展示余票数量、阶梯定价与退改摘要，热门搜索结果优先加载

**B. 锁座成功**
- Given 旅客选择具体班次与人数
- When 旅客提交锁座请求
- Then 系统显示锁定成功并显示 10 分钟倒计时，所选席位被保留

**C. 订单建单与支付前置**
- Given 旅客已完成锁座
- When 旅客确认订单并选择微信支付
- Then 系统生成待支付订单，并跳转至微信支付界面

**D. 支付回调与票券生成**
- Given 订单仍在锁座有效期内
- When 旅客完成微信支付
- Then 系统显示支付成功，自动生成所有乘客的电子票券，旅客可在"我的票券"中查看

## Business rules
1. 锁座默认保留 10 分钟，可按线路配置；过期必须释放库存。
2. 阶梯定价根据乘客类型/数量实时计算，需与现有 `order-create` DRY。
3. 支付状态在 `wechat-payment-session` 与 `payment-webhook` 之间保持一致，避免双写。
4. 票券生成必须是幂等操作，同一订单重复调用不得创建重复券。

## Integration impact
- **travel-search-hub**：扩展现有 catalog 数据以支持线路/套票展示。
- **seat-lock-service**：与 `order-create` 协作，补齐锁座释放任务。
- **wechat-payment-session**：复用 `payment-webhook` 链路，按 DeepTravel 需求补充参数。
- **bundle-ticket-engine**：在 `tickets-issuance` 基础上生成多乘客与共享权益。

## Telemetry & validation
- 执行 `npm run validate:integration` 需新增旅客闭环场景脚本。
- `reports/newman/travel-search-hub.json`、`.../seat-lock-service.json`、`.../wechat-payment-session.json`、`.../bundle-ticket-engine.json` 覆盖关键 API。
- Story 完成后运行 `node scripts/story-coverage.mjs` 验证对 US-001/US-004 的增强状态。

## Implementation Progress

### Phase 1: 商品浏览与订单创建 ✅
| Card | Status | Description |
|------|--------|-------------|
| miniprogram-product-catalog | Done | 商品列表、详情、库存查询 |
| miniprogram-order | Done | 订单创建、列表、详情查询 |

**Database Tables Created**:
- `orders` - 订单主表
- `order_payments` - 支付记录表
- `tickets` (extended) - 票券表扩展

### Phase 2: 搜索与锁座 ⏭️ (DEPRECATED)
| Card | Status | Description |
|------|--------|-------------|
| travel-search-hub | DEPRECATED | 功能整合到 miniprogram-product-catalog |
| seat-lock-service | DEPRECATED | 功能整合到 miniprogram-order（订单超时自动释放库存） |

> **Note**: 搜索与锁座功能已简化并整合到 Phase 1 的 API 中，无需单独模块。

### Phase 3: 支付与票券 ✅
| Card | Status | Description |
|------|--------|-------------|
| wallyt-payment | Done | 微信支付集成 (替代 wechat-payment-session) |
| payment-webhook | Done | 多乘客票券批量生成（出票逻辑已合并到 payment-webhook） |
