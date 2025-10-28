# US-010A — DeepTravel 旅客闭环体验 Runbook

端到端验证旅客从线路查询到支付成功生成票券的最小闭环。适用于联调或回归时快速确认旅客链路健康。

## 前置条件
- **Base URL**：`http://localhost:8080`
- 已执行 `npm run build && PORT=8080 npm start`
- 若使用缓存策略，建议先调用 `POST /demo/reset` 保证数据初始状态

## 流程步骤

### 1. 热门线路与套票查询
```bash
curl -s http://localhost:8080/travel/hot-cities | jq '.'
curl -s "http://localhost:8080/travel/search?origin=HKG&destination=MAC&travelDate=2025-11-01&passengerTypes=adult,child" | jq '.results[0]'
```
**期望**：返回热门城市列表与包含余票、阶梯定价、退改摘要的线路搜索结果。

### 2. 锁座
```bash
RES_PAYLOAD='{
  "routeId": "RT-001",
  "travelDate": "2025-11-01",
  "seats": [
    {"passengerType": "adult", "count": 1},
    {"passengerType": "child", "count": 1}
  ],
  "holdMinutes": 10
}'
RES_ID=$(curl -s -X POST http://localhost:8080/reservations \
  -H 'Content-Type: application/json' \
  -d "$RES_PAYLOAD" | tee /tmp/res.json | jq -r '.reservationId')
cat /tmp/res.json
```
**期望**：201 响应，`reservationId` 与 `lockExpireAt` 存在；命令会将 `reservationId` 写入 `RES_ID` 变量。

### 3. 创建订单
```bash
ORDER_PAYLOAD=$(jq -n --arg res "$RES_ID" '{
  reservationId: $res,
  travelerId: "buyer-1001",
  outTradeNo: "DT-ORDER-001",
  passengers: [
    {name: "Alex Chan", type: "adult"},
    {name: "Bonnie Chan", type: "child"}
  ]
}')
ORDER_ID=$(curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d "$ORDER_PAYLOAD" | tee /tmp/order.json | jq -r '.orderId')
cat /tmp/order.json
```
**期望**：返回 `orderId` 且状态为 `PENDING_PAYMENT`；命令会将 `orderId` 写入 `ORDER_ID`。

### 4. 获取微信支付参数
```bash
curl -s -X POST http://localhost:8080/payments/wechat/session \
  -H 'Content-Type: application/json' \
  -d "{
        \"orderId\": \"$ORDER_ID\",
        \"amount\": 32000,
        \"currency\": \"HKD\"
      }" | tee /tmp/wechat.json
```
**期望**：返回 `prepayId`、`nonceStr`、`timeStamp` 等参数。

### 5. 模拟支付回调
```bash
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d "{
        \"order_id\": \"$ORDER_ID\",
        \"payment_status\": \"SUCCESS\",
        \"paid_at\": \"2025-10-26T11:00:00Z\",
        \"signature\": \"mock-signature\"
      }" | jq '.'
```
**期望**：`{ "processed": true, "issued": true }`，订单状态转为 `PAID` 并触发票券生成。

### 6. 校验票券与二维码
```bash
curl -s http://localhost:8080/my/tickets?travelerId=buyer-1001 | tee /tmp/tickets.json | jq '.tickets[] | {ticketId, status}'
TICKET_ID=$(jq -r '.tickets[0].ticketId' /tmp/tickets.json)
curl -s "http://localhost:8080/tickets/$TICKET_ID/qr-token" | jq '.'
```
**期望**：票券状态为 `active`，能生成短期 `qr_token`。

## 验证清单
- [ ] 热门城市与搜索结果返回
- [ ] 锁座成功且未过期
- [ ] 订单进入 `PENDING_PAYMENT`
- [ ] 已生成微信支付预下单参数
- [ ] 支付回调后票券批量生成
- [ ] 可拉取票券与二维码信息

## 相关资产
- Newman：`reports/newman/us-010a-traveler-loop.json`
- Story 文档：`docs/stories/US-010A-traveler-loop.md`
