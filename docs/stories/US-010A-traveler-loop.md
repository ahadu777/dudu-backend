---
id: US-010A
title: DeepTravel 旅客闭环体验
owner: Product
status: "In Progress"
priority: High
last_update: 2025-12-04T15:00:00+08:00
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
  # Phase 2 - 待实现
  # - travel-search-hub            # DEPRECATED - 线路/套票搜索 (模块已删除)
  # - seat-lock-service            # DEPRECATED - 锁座服务 (模块已删除)
  - wechat-payment-session         # Pending - 微信支付
  - bundle-ticket-engine           # Done - 票券生成（已在 miniprogram/order.service.ts 实现）
related_features:
  - tickets-issuance
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
- When 旅客调用 `/travel/search`
- Then 返回包含余票、阶梯定价与退改摘要的组合结果，并命中 24h 热门缓存或年度黑名单缓存策略

**B. 锁座成功**
- Given 旅客选择具体班次与人数
- When 调用 `POST /reservations`
- Then 生成锁座记录并获得 `lockExpireAt`（默认 10 分钟），同时返回库存快照供订单用

**C. 订单建单与支付前置**
- Given 已存在锁座记录
- When 调用 `POST /orders`
- Then 订单进入 `PENDING_PAYMENT`，并触发微信支付参数生成接口返回预支付信息

**D. 支付回调与票券生成**
- Given 订单仍在锁座有效期内
- When 收到微信支付成功通知
- Then 更新订单为 `PAID`，调用票券引擎创建多乘客票券，并将快照同步至 `my-tickets`/`qr-token`

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
| Card | Status | API Endpoints |
|------|--------|---------------|
| miniprogram-product-catalog | Done | GET /miniprogram/products, GET /miniprogram/products/:id, GET /miniprogram/products/:id/availability |
| miniprogram-order | Done | POST /miniprogram/orders, GET /miniprogram/orders, GET /miniprogram/orders/:id |

**Database Tables Created**:
- `orders` - 订单主表
- `order_payments` - 支付记录表
- `tickets` (extended) - 票券表扩展

### Phase 2: 搜索与锁座 🔲
| Card | Status | Description |
|------|--------|-------------|
| travel-search-hub | Pending | 线路/套票搜索、热门缓存 |
| seat-lock-service | Pending | 锁座服务、库存预留 |

### Phase 3: 支付与票券 🔲
| Card | Status | Description |
|------|--------|-------------|
| wechat-payment-session | Pending | 微信支付集成 |
| bundle-ticket-engine | Done | 多乘客票券批量生成（已在 miniprogram/order.service.ts 实现） |
