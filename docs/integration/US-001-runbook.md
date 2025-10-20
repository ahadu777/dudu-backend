# US-001 — Buy package and redeem via QR

Complete end-to-end flow: Browse catalog → Create order → Payment notify → View tickets → Generate QR → Operator scan → Redeem

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **User token**: `user123` (mock authentication)
- **Seeded data**: Product 101 (3-in-1 pass), test tickets available
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. Browse Catalog
Get available products:
```bash
curl -s http://localhost:8080/catalog | jq '.'
```

**Expected**: 4 products including id 101 (3-in-1 pass)

### 2. Create Order
Create an order for the 3-in-1 pass:
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "demo-001-$(date +%s)"
  }' | jq '.'
```

**Note**: Order items use `product_id` (this is correct), but catalog returns products with `id` field.

**Expected**: Returns order with status "PENDING", save the `order_id`

### 3. Payment Notification (Mock)
Simulate payment gateway notification:
```bash
# Replace <ORDER_ID> with actual order_id from step 2
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": <ORDER_ID>,
    "payment_status": "SUCCESS",
    "paid_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "signature": "valid-mock-signature"
  }' | jq '.'
```

**Expected**: Order status becomes "PAID", tickets issued synchronously

### 4. View My Tickets
Check issued tickets:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/my/tickets | jq '.'
```

**Expected**: Shows tickets with entitlements (ferry, bus, mrt functions)

### 5. Generate QR Token
Generate short-lived QR token for a ticket:
```bash
# Replace <TICKET_CODE> with actual ticket_code from step 4
curl -s -X POST \
  -H "Authorization: Bearer user123" \
  http://localhost:8080/tickets/<TICKET_CODE>/qr-token | jq '.'
```

**Expected**: Returns `{token, expires_in}` format - the token is valid for scanning

### 6. Operator Login
Authenticate as gate operator:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "secret123"
  }' | jq '.'
```

**Expected**: Returns `{operator_token}` only (operator details are in JWT claims)

### 7. Create Validator Session
Bind operator to gate device:
```bash
# Replace <OPERATOR_TOKEN> with token from step 6
curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-01",
    "location_id": 52
  }' | jq '.'
```

**Expected**: Returns session_id for scanning operations

### 8. Scan and Redeem
Perform actual ticket redemption:
```bash
# Replace <QR_TOKEN> and <SESSION_ID> with values from steps 5 and 7
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'
```

**Expected**:
- First scan: `{"result": "success", "entitlements": [...]}` (check remaining_uses in entitlements array)
- Replay attempt: `409 Conflict` (idempotency protection)

## Complete Flow Example
```bash
# Set base URL
export BASE=http://localhost:8080

# 1. Catalog (note: products have 'id' and 'name' fields)
curl -s $BASE/catalog | jq '.products[0] | {id, name, status}'

# 2. Create order (save order_id)
ORDER_RESP=$(curl -s -X POST $BASE/orders -H 'Content-Type: application/json' -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"demo-'$(date +%s)'"}')
ORDER_ID=$(echo $ORDER_RESP | jq -r '.order_id')
echo "Order ID: $ORDER_ID"

# 3. Payment notify
curl -s -X POST $BASE/payments/notify -H 'Content-Type: application/json' -d "{\"order_id\":$ORDER_ID,\"payment_status\":\"SUCCESS\",\"paid_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"signature\":\"valid-mock-signature\"}" | jq '.'

# 4. Get tickets
TICKET_RESP=$(curl -s -H "Authorization: Bearer user123" $BASE/my/tickets)
TICKET_CODE=$(echo $TICKET_RESP | jq -r '.tickets[0].ticket_code')
echo "Ticket Code: $TICKET_CODE"

# 5. Generate QR (response format: {token, expires_in})
QR_RESP=$(curl -s -X POST -H "Authorization: Bearer user123" $BASE/tickets/$TICKET_CODE/qr-token)
QR_TOKEN=$(echo $QR_RESP | jq -r '.token')
echo "QR Token: ${QR_TOKEN:0:50}..."

# 6. Operator login (response format: {operator_token})
OP_RESP=$(curl -s -X POST $BASE/operators/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"secret123"}')
OP_TOKEN=$(echo $OP_RESP | jq -r '.operator_token')
echo "Operator Token: ${OP_TOKEN:0:50}..."

# 7. Create session
SESS_RESP=$(curl -s -X POST $BASE/validators/sessions -H "Authorization: Bearer $OP_TOKEN" -H 'Content-Type: application/json' -d '{"device_id":"gate-01","location_id":52}')
SESSION_ID=$(echo $SESS_RESP | jq -r '.session_id')
echo "Session ID: $SESSION_ID"

# 8. Scan redeem (response includes entitlements[] array)
SCAN_RESP=$(curl -s -X POST $BASE/tickets/scan -H 'Content-Type: application/json' -d "{\"qr_token\":\"$QR_TOKEN\",\"function_code\":\"ferry\",\"session_id\":\"$SESSION_ID\",\"location_id\":52}")
echo $SCAN_RESP | jq '.'
echo "Ferry remaining uses: $(echo $SCAN_RESP | jq '.entitlements[] | select(.function_code=="ferry") | .remaining_uses')"
```

## Expected Results Summary
- ✅ **Catalog**: 4 products returned
- ✅ **Order**: Status transitions PENDING → PAID
- ✅ **Tickets**: N tickets issued with entitlements
- ✅ **QR**: Valid JWT token generated
- ✅ **Operator**: Authentication successful
- ✅ **Session**: Device binding successful
- ✅ **Scan**: `result: "success"` with decremented usage
- ✅ **Replay**: `409 Conflict` on duplicate scan

## Troubleshooting
- **Server not responding**: Check `curl $BASE/healthz`
- **401 errors**: Verify token format in Authorization header
- **Order not found**: Ensure order_id is numeric, not string
- **No tickets**: Check payment notification was successful
- **QR expired**: Regenerate QR token (5min TTL)
- **Scan fails**: Verify session_id and location_id match