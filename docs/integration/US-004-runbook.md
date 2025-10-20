# US-004 — Payment notify → issue tickets (sync)

Synchronous ticket issuance: Payment webhook receives notification → Immediately issues tickets

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Existing order**: Use US-001 steps 1-2 or create manually
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. Create Order (if needed)
Create a pending order for ticket issuance:
```bash
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "payment-test-$(date +%s)"
  }' | jq '.'
```

**Expected**: Order with status "PENDING"

### 2. Payment Success Notification
Simulate payment gateway webhook:
```bash
# Replace <ORDER_ID> with actual order_id from step 1
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "gateway": "mock",
    "gateway_txn_id": "tx-payment-$(date +%s)",
    "order_id": <ORDER_ID>,
    "status": "SUCCESS",
    "hmac": "FAKE"
  }' | jq '.'
```

**Expected**:
- Order status changes to "PAID"
- Tickets issued immediately (synchronous)
- Response includes ticket information

### 3. Verify Ticket Issuance
Check that tickets were created:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/my/tickets | jq '.'
```

**Expected**: New tickets appear with proper entitlements

### 4. Payment Failure Notification
Test payment failure scenario:
```bash
# Create another order first
FAIL_ORDER=$(curl -s -X POST http://localhost:8080/orders -H 'Content-Type: application/json' -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"fail-test-'$(date +%s)'"}' | jq -r '.order_id')

# Send failure notification
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d "{
    \"gateway\": \"mock\",
    \"gateway_txn_id\": \"tx-fail-$(date +%s)\",
    \"order_id\": $FAIL_ORDER,
    \"status\": \"FAILED\",
    \"hmac\": \"FAKE\"
  }" | jq '.'
```

**Expected**: Order remains "PENDING", no tickets issued

### 5. Idempotency Test
Send duplicate payment notification:
```bash
# Replay the same successful payment
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "gateway": "mock",
    "gateway_txn_id": "DUPLICATE_TXN_ID",
    "order_id": <ORDER_ID>,
    "status": "SUCCESS",
    "hmac": "FAKE"
  }' | jq '.'
```

**Expected**: No duplicate tickets created, proper idempotency response

## Complete Payment Flow Example
```bash
export BASE=http://localhost:8080

# Step 1: Create order
echo "=== Creating Order ==="
ORDER_RESP=$(curl -s -X POST $BASE/orders -H 'Content-Type: application/json' -d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"payment-demo-'$(date +%s)'"}')
ORDER_ID=$(echo $ORDER_RESP | jq -r '.order_id')
echo "Order created: $ORDER_ID"
echo "Initial status: $(echo $ORDER_RESP | jq -r '.status')"

# Step 2: Check tickets before payment
echo "=== Tickets Before Payment ==="
BEFORE_COUNT=$(curl -s -H "Authorization: Bearer user123" $BASE/my/tickets | jq '.tickets | length')
echo "Ticket count before: $BEFORE_COUNT"

# Step 3: Payment notification
echo "=== Processing Payment ==="
PAYMENT_RESP=$(curl -s -X POST $BASE/payments/notify -H 'Content-Type: application/json' -d "{\"gateway\":\"mock\",\"gateway_txn_id\":\"tx-$(date +%s)\",\"order_id\":$ORDER_ID,\"status\":\"SUCCESS\",\"hmac\":\"FAKE\"}")
echo "Payment response:"
echo $PAYMENT_RESP | jq '.'

# Step 4: Verify ticket issuance
echo "=== Tickets After Payment ==="
AFTER_RESP=$(curl -s -H "Authorization: Bearer user123" $BASE/my/tickets)
AFTER_COUNT=$(echo $AFTER_RESP | jq '.tickets | length')
echo "Ticket count after: $AFTER_COUNT"
echo "New tickets:"
echo $AFTER_RESP | jq '.tickets[] | select(.order_id == '$ORDER_ID') | {ticket_code, product_name, status}'

# Step 5: Verify order status
echo "=== Final Order Status ==="
# Note: Would need order lookup endpoint to verify, or check through admin interface
echo "Order $ORDER_ID should now be PAID status"
```

## Webhook Integration for Gateways

### Stripe Webhook Example
```bash
# Simulating Stripe webhook format
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -H 'Stripe-Signature: t=...' \
  -d '{
    "gateway": "stripe",
    "gateway_txn_id": "pi_1ABC123stripe",
    "order_id": <ORDER_ID>,
    "status": "SUCCESS",
    "amount": 2500,
    "currency": "SGD",
    "hmac": "stripe_signature_hash"
  }' | jq '.'
```

### PayPal Webhook Example
```bash
# Simulating PayPal IPN format
curl -s -X POST http://localhost:8080/payments/notify \
  -H 'Content-Type: application/json' \
  -d '{
    "gateway": "paypal",
    "gateway_txn_id": "1234567890ABCDEF",
    "order_id": <ORDER_ID>,
    "status": "SUCCESS",
    "payer_email": "buyer@example.com",
    "hmac": "paypal_verification_hash"
  }' | jq '.'
```

## Expected Response Formats

### Successful Payment Response
```json
{
  "status": "processed",
  "order_id": 12345,
  "order_status": "PAID",
  "tickets_issued": [
    {
      "ticket_code": "TKT-ABC123",
      "product_id": 101,
      "product_name": "3-in-1 Transport Pass"
    }
  ],
  "message": "Payment processed and tickets issued"
}
```

### Failed Payment Response
```json
{
  "status": "failed",
  "order_id": 12345,
  "order_status": "PENDING",
  "error": "Payment failed",
  "message": "Order remains pending"
}
```

## Expected Results
- ✅ **Synchronous processing**: Tickets issued immediately on SUCCESS
- ✅ **Status updates**: Order status correctly updated
- ✅ **Failure handling**: Failed payments don't create tickets
- ✅ **Idempotency**: Duplicate notifications handled properly
- ✅ **Atomic operation**: Either complete success or complete rollback

## Error Scenarios
| Scenario | Expected Response |
|----------|-------------------|
| Invalid order_id | `404 Not Found` |
| Already processed | `200 OK` (idempotent) |
| Invalid gateway | `400 Bad Request` |
| Missing HMAC | `401 Unauthorized` |
| System error | `500` with rollback |

## Integration Notes
- **Synchronous**: Tickets issued in same request cycle
- **Atomic**: Database transactions ensure consistency
- **Webhook security**: HMAC validation for production
- **Gateway agnostic**: Supports multiple payment providers
- **Error recovery**: Failed webhooks can be replayed
- **Monitoring**: All payment events logged for audit