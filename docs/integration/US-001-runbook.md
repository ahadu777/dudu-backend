# US-001 — Buy package and redeem via QR

Complete end-to-end flow: Browse catalog → Create order → Payment notify → View tickets → Generate QR → Operator scan → Redeem

**Updated**: 2025-11 (API migrated to `/venue/scan`)

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
    "out_trade_no": "demo-001-'$(date +%s)'"
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

**Expected**: Returns `{operator_token}` - save this for scanning

### 7. Scan and Redeem
Perform actual ticket redemption using `/venue/scan`:
```bash
# Replace <QR_TOKEN> with token from step 5
# Replace <OPERATOR_TOKEN> with token from step 6
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

**Expected**:
- First scan: `{"result": "success", "remaining_uses": N, ...}`
- Replay attempt: `{"result": "reject", "reason": "ALREADY_REDEEMED"}`

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

# 7. Scan redeem using /venue/scan
SCAN_RESP=$(curl -s -X POST $BASE/venue/scan \
  -H "Authorization: Bearer $OP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"qr_token\":\"$QR_TOKEN\",\"function_code\":\"ferry\",\"venue_code\":\"central-pier\"}")
echo $SCAN_RESP | jq '.'

# Check result
RESULT=$(echo $SCAN_RESP | jq -r '.result')
if [ "$RESULT" = "success" ]; then
  echo "✅ Scan successful! Remaining uses: $(echo $SCAN_RESP | jq -r '.remaining_uses')"
else
  echo "❌ Scan failed: $(echo $SCAN_RESP | jq -r '.reason')"
fi
```

## Expected Results Summary
- ✅ **Catalog**: 4 products returned
- ✅ **Order**: Status transitions PENDING → PAID
- ✅ **Tickets**: N tickets issued with entitlements
- ✅ **QR**: Valid JWT token generated
- ✅ **Operator**: Authentication successful
- ✅ **Scan**: `result: "success"` with decremented usage
- ✅ **Replay**: `result: "reject"` with `reason: "ALREADY_REDEEMED"`

## API Reference

| Step | Endpoint | Method | Auth |
|------|----------|--------|------|
| 1 | `/catalog` | GET | None |
| 2 | `/orders` | POST | None |
| 3 | `/payments/notify` | POST | None |
| 4 | `/my/tickets` | GET | User |
| 5 | `/tickets/:code/qr-token` | POST | User |
| 6 | `/operators/login` | POST | None |
| 7 | `/venue/scan` | POST | Operator |

## Troubleshooting
- **Server not responding**: Check `curl $BASE/healthz`
- **401 errors**: Verify token format in Authorization header
- **Order not found**: Ensure order_id is numeric, not string
- **No tickets**: Check payment notification was successful
- **QR expired**: Regenerate QR token (5min TTL)
- **Scan fails**: Check operator token is valid and function_code exists on ticket

---

**Note**: The old `/tickets/scan` and `/validators/sessions` endpoints have been deprecated. Use `/venue/scan` with operator token authentication.
