# US-010B — DeepTravel 运营支撑体系 Runbook

该 Runbook 协助验证后台配置、票券生命周期守护、通知编排与商家核销端的协同，确保运营支撑链路与既有退款/扫码流程兼容。

## 前置条件
- **Base URL**：`https://express-jdpny.ondigitalocean.app` (可转本地)
- 服务已启动：`npm run build && PORT=8080 npm start`
- 如需清理数据，执行 `POST /demo/reset`
- 建议先完成 US-010A 闭环验证，以便存在可用票券

## 流程步骤

### 0. 验证资产
- Newman：`reports/collections/us-010b-operations-backbone.json`
- 命令：`npx newman run reports/collections/us-010b-operations-backbone.json`


### 1. 配置套票模板与线路票价
```bash
TEMPLATE_PAYLOAD='{
  "name": "DeepTravel Peak Explorer",
  "status": "active",
  "entitlements": [
    {"function_code": "ferry", "label": "TurboJet", "quantity": 2, "validity_type": "relative", "validity_duration_days": 14},
    {"function_code": "tram", "label": "Peak Tram", "quantity": 1, "validity_type": "relative", "validity_duration_days": 14}
  ],
  "pricing": {
    "currency": "HKD",
    "tiers": [
      {"tier_id": "adult", "name": "Adult", "customer_types": ["adult"], "price": 4500},
      {"tier_id": "family", "name": "Family", "customer_types": ["adult", "child"], "price": 7800}
    ]
  }
}'
curl -s -X POST https://express-jdpny.ondigitalocean.app/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -d "$TEMPLATE_PAYLOAD" | jq '.'

curl -s -X PUT https://express-jdpny.ondigitalocean.app/admin/routes/fares/DT-PEAK \
  -H 'Content-Type: application/json' \
  -d '{
        "fares": [
          {"passenger_type": "adult", "price": 220, "currency": "HKD"},
          {"passenger_type": "child", "price": 140, "currency": "HKD"}
        ],
        "lockMinutes": 15,
        "blackoutDates": ["2025-12-24"]
      }' | jq '.'
```
**期望**：模板创建成功且线路票价 `revision` 为 1。

### 2. 启动票券生命周期守护
```bash
curl -s -X POST https://express-jdpny.ondigitalocean.app/internal/tasks/tickets/lifecycle/run \
  -H 'X-Debug-Mode: true' | jq '.'
```
**期望**：返回处理统计，如 `expiredProcessed`、`refundTriggered`；任务运行后票券状态符合策略。

### 3. 通知编排验证
```bash
curl -s -X POST https://express-jdpny.ondigitalocean.app/internal/notifications/dispatch \
  -H 'Content-Type: application/json' \
  -d '{
        "event": "ticket.expired",
        "orderId": "DT-ORDER-001",
        "ticketId": "TK-001"
      }' | jq '.'
```
**期望**：返回 `queued: true`，并在日志或响应中可见通知上下文。

### 4. 商家核销控制台
```bash
SESSION=$(curl -s -X POST https://express-jdpny.ondigitalocean.app/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"merchant-demo","password":"demo123"}' | jq -r '.operator_token')

VALIDATOR=$(curl -s -X POST https://express-jdpny.ondigitalocean.app/validators/sessions \
  -H 'Content-Type: application/json' \
  -d "{\"operator_token\":\"$SESSION\",\"device_id\":\"terminal-01\",\"location_id\":\"HKG-PIER\"}" | jq -r '.session_id')

curl -s -X POST https://express-jdpny.ondigitalocean.app/merchant/redemptions \
  -H 'Content-Type: application/json' \
  -d "{
        \"ticketId\": \"$TICKET_ID\",
        \"sessionId\": \"$VALIDATOR\",
        \"entitlementCode\": \"ferry\"
      }" | jq '.'
```
**期望**：核销成功返回 `result: "success"` 并记录日志；若票券或权益无效则返回对应错误码。

### 5. 报表联动
```bash
curl -s "https://express-jdpny.ondigitalocean.app/reports/redemptions?from=2025-10-01T00:00:00Z&to=2025-12-31T23:59:59Z" | jq '.events | length'
```
**期望**：事件数量递增，包含刚完成的核销记录。

## 验证清单
- [ ] 套票模板与线路票价可版本化管理
- [ ] 生命周期守护任务可触发退改/过期逻辑
- [ ] 通知编排可加入队列并记录上下文
- [ ] 商家端核销流程可用，日志 & 权限检查通过
- [ ] 报表可看到最新核销事件

## 相关资产
- Newman：`reports/collections/us-010b-operations-backbone.json`
- Story 文档：`docs/stories/US-010B-operations-backbone.md`
