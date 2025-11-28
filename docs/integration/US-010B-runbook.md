# US-010B — DeepTravel 运营支撑体系 Runbook

该 Runbook 协助验证后台配置、票券生命周期守护、通知编排与商家核销端的协同，确保运营支撑链路与既有退款/扫码流程兼容。

**Updated**: 2025-11 (API migrated to `/venue/scan` with operator token)

## 前置条件
- **Base URL**：`http://localhost:8080` (或生产环境)
- 服务已启动：`npm run build && PORT=8080 npm start`
- 如需清理数据，执行 `POST /demo/reset`
- 建议先完成 US-010A 闭环验证，以便存在可用票券

## 流程步骤

### 0. 验证资产
- Newman：`reports/collections/us-010b-operations-backbone.json`
- 命令：`npx newman run reports/collections/us-010b-operations-backbone.json`


### 1. 配置套票模板与线路票价
```bash
BASE_URL="http://localhost:8080"

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
curl -s -X POST $BASE_URL/admin/packages/templates \
  -H 'Content-Type: application/json' \
  -d "$TEMPLATE_PAYLOAD" | jq '.'

curl -s -X PUT $BASE_URL/admin/routes/fares/DT-PEAK \
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
curl -s -X POST $BASE_URL/internal/tasks/tickets/lifecycle/run \
  -H 'X-Debug-Mode: true' | jq '.'
```
**期望**：返回处理统计，如 `expiredProcessed`、`refundTriggered`；任务运行后票券状态符合策略。

### 3. 通知编排验证
```bash
curl -s -X POST $BASE_URL/internal/notifications/dispatch \
  -H 'Content-Type: application/json' \
  -d '{
        "event": "ticket.expired",
        "orderId": "DT-ORDER-001",
        "ticketId": "TK-001"
      }' | jq '.'
```
**期望**：返回 `queued: true`，并在日志或响应中可见通知上下文。

### 4. 商家核销控制台

**Step 4.1: 操作员登录**
```bash
# 登录获取 operator_token
OPERATOR_TOKEN=$(curl -s -X POST $BASE_URL/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}' | jq -r '.operator_token')

echo "Operator Token: ${OPERATOR_TOKEN:0:50}..."
```

**Step 4.2: 执行核销**
```bash
# 使用 operator_token 直接调用 /venue/scan
# 替换 <QR_TOKEN> 为实际的票券 QR token
curl -s -X POST $BASE_URL/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```
**期望**：核销成功返回 `result: "success"` 并记录日志；若票券或权益无效则返回对应错误码。

### 5. 报表联动
```bash
curl -s "$BASE_URL/reports/redemptions?from=2025-10-01T00:00:00Z&to=2025-12-31T23:59:59Z" | jq '.events | length'
```
**期望**：事件数量递增，包含刚完成的核销记录。

## 完整测试脚本
```bash
#!/bin/bash
BASE_URL="http://localhost:8080"

echo "=== US-010B Operations Backbone Test ==="

# Step 1: Operator Login
echo "Step 1: Operator Login"
OP_RESP=$(curl -s -X POST $BASE_URL/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}')
OPERATOR_TOKEN=$(echo $OP_RESP | jq -r '.operator_token')

if [ "$OPERATOR_TOKEN" != "null" ] && [ -n "$OPERATOR_TOKEN" ]; then
  echo "✅ Operator authenticated"
else
  echo "❌ Operator login failed"
  exit 1
fi

# Step 2: Test Venue Scan (requires valid QR)
echo "Step 2: Test Venue Scan API"
SCAN_RESP=$(curl -s -X POST $BASE_URL/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"qr_token":"test","function_code":"ferry","venue_code":"central-pier"}')

if echo "$SCAN_RESP" | grep -q "result"; then
  echo "✅ Venue scan API responding"
else
  echo "⚠️ Venue scan API response unexpected: $SCAN_RESP"
fi

# Step 3: Check Reports
echo "Step 3: Check Reports Endpoint"
REPORTS_RESP=$(curl -s "$BASE_URL/reports/redemptions?from=2025-01-01&to=2025-12-31")
if echo "$REPORTS_RESP" | grep -q "events\|error"; then
  echo "✅ Reports endpoint responding"
else
  echo "⚠️ Reports endpoint response: $REPORTS_RESP"
fi

echo "=== Test Complete ==="
```

## 验证清单
- [ ] 套票模板与线路票价可版本化管理
- [ ] 生命周期守护任务可触发退改/过期逻辑
- [ ] 通知编排可加入队列并记录上下文
- [ ] 商家端核销流程可用（使用 `/venue/scan` + operator token）
- [ ] 报表可看到最新核销事件

## API 变更说明

| 旧 API | 新 API | 说明 |
|--------|--------|------|
| `POST /validators/sessions` | **已废弃** | 不再需要创建 session |
| `POST /merchant/redemptions` | `POST /venue/scan` | 统一使用 venue/scan |
| `session_id` 参数 | `Authorization: Bearer <token>` | 使用 operator token |

## 相关资产
- Newman：`reports/collections/us-010b-operations-backbone.json`
- Story 文档：`docs/stories/US-010B-operations-backbone.md`
- 扫码核销：参考 `US-002-runbook.md`, `US-013-runbook.md`
