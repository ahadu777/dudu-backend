# Venue Operations Testing Plan (PRD-003)

## Multi-Terminal Testing Environment

This document provides a complete testing environment for PRD-003 venue operations, including multi-terminal fraud detection and real-time analytics.

### Test Environment Setup

**Prerequisites**:
- Server running in mock mode (default): `USE_DATABASE=false npm start`
- Premium Plan orders available (products 106-108)
- Multiple terminal operators for concurrent testing

**Venue Configuration**:
- `central-pier`: Ferry boarding only
- `cheung-chau`: Ferry boarding + gift redemption + playground tokens
- `gift-shop-central`: Gift redemption only
- `playground-cc`: Playground tokens only

## Test Scenario 1: Premium Plan Multi-Function Validation

### Step 1: Create Premium Plan Order (US-001 Flow)
```bash
# Create order for Premium Plan ($288)
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1001,
    "items": [{"product_id": 106, "quantity": 1}]
  }'

# Expected: Order created with Premium Plan entitlements
# - Ferry boarding: unlimited uses
# - Gift redemption: 1 use
# - Playground tokens: 10 uses
```

### Step 2: Process Payment (US-004 Flow)
```bash
# Simulate payment notification
curl -X POST http://localhost:8080/payments/notify \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-1001-001",
    "payment_status": "completed",
    "transaction_id": "TXN-12345"
  }'

# Expected: Tickets issued with QR tokens
```

### Step 3: Get QR Token (Enhanced US-001)
```bash
# Get QR token for Premium Plan ticket
curl -X POST http://localhost:8080/tickets/TIK-USR1001-106/qr-token \
  -H "Authorization: Bearer <user_jwt_token>"

# Expected: JWT QR token for multi-function validation
```

### Step 4: Operator Authentication (Enhanced US-002)

**Terminal 1: Alice at Central Pier**
```bash
# Login as Alice
ALICE_RESP=$(curl -s -X POST http://localhost:8080/operators/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}')
export ALICE_TOKEN=$(echo $ALICE_RESP | jq -r '.operator_token')
echo "Alice Token: ${ALICE_TOKEN:0:50}..."

# Expected: JWT operator token for Central Pier operations
```

**Terminal 2: Bob at Cheung Chau**
```bash
# Login as Bob
BOB_RESP=$(curl -s -X POST http://localhost:8080/operators/login \
  -H "Content-Type: application/json" \
  -d '{"username": "bob", "password": "secret456"}')
export BOB_TOKEN=$(echo $BOB_RESP | jq -r '.operator_token')
echo "Bob Token: ${BOB_TOKEN:0:50}..."

# Expected: JWT operator token for Cheung Chau operations
```

### Step 5: Multi-Function Scanning Tests

**Test 5.1: Ferry Boarding (Unlimited)**
```bash
# Scan at Central Pier for ferry boarding (Alice)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }'

# Expected: SUCCESS
# - Unlimited ferry boarding allowed
# - No usage decrement
# - Response time < 2 seconds
# - Fraud checks passed
```

**Test 5.2: Gift Redemption (Single Use)**
```bash
# First gift redemption attempt (Bob at Cheung Chau)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "gift",
    "venue_code": "cheung-chau"
  }'

# Expected: SUCCESS
# - First redemption succeeds
# - Remaining uses decremented to 0

# Second gift redemption attempt (should fail)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<new_jwt_qr_token>",
    "function_code": "gift",
    "venue_code": "cheung-chau"
  }'

# Expected: REJECT
# - Reason: "NO_REMAINING" or "NO_REMAINING_USES"
# - Fraud detection flags attempt
```

**Test 5.3: Playground Tokens (Counted)**
```bash
# Use playground token (first of 10) - Bob at Cheung Chau
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "playground_token",
    "venue_code": "cheung-chau"
  }'

# Expected: SUCCESS
# - Tokens decremented from 10 to 9
# - Remaining uses tracked accurately
```

## Test Scenario 2: Cross-Terminal Fraud Detection

### Test 2.1: JTI Duplication Detection
```bash
# Terminal 1 (Alice): First scan (should succeed)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }'

# Expected: SUCCESS

# Terminal 2 (Bob): Same QR token, different venue (should fail)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "gift",
    "venue_code": "cheung-chau"
  }'

# Expected: REJECT if same JTI already used
# - Reason: "ALREADY_REDEEMED" or "DUPLICATE_JTI"
# - Cross-terminal fraud detection working
# - Response time < 2 seconds
```

### Test 2.2: Concurrent Scanning
```bash
# Run these simultaneously from different terminals
# Terminal 1 (Alice):
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qr_token": "<jwt_qr_token>", "function_code": "ferry", "venue_code": "central-pier"}' &

# Terminal 2 (Bob - immediately):
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qr_token": "<jwt_qr_token>", "function_code": "ferry", "venue_code": "cheung-chau"}' &

# Expected: Only one should succeed
# - First response: SUCCESS
# - Second response: REJECT (ALREADY_REDEEMED)
```

## Test Scenario 3: Performance Benchmarking

### Test 3.1: Response Time Validation
```bash
# Measure response times for 100 scans
for i in {1..100}; do
  time curl -s -X POST http://localhost:8080/venue/scan \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "qr_token": "<jwt_qr_token>",
      "function_code": "ferry",
      "venue_code": "central-pier"
    }' >/dev/null 2>&1
done

# Expected: All responses < 2 seconds
# - Average response time < 1 second in mock mode
# - No degradation with concurrent requests
```

### Test 3.2: Load Testing (1000+ scans/hour)
```bash
# Run concurrent scans to simulate peak load
seq 1 1000 | xargs -n1 -P50 -I {} curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "<jwt_qr_token>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' >/dev/null 2>&1

# Expected: System handles 1000+ scans/hour
# - No timeouts or errors
# - Consistent response times
```

## Test Scenario 4: Real-Time Analytics

### Test 4.1: Venue Analytics Collection
```bash
# Get analytics for Central Pier (last 24 hours)
curl -X GET "http://localhost:8080/venue/central-pier/analytics?hours=24"

# Expected: Analytics data showing:
# - Total scans count
# - Successful vs failed scans
# - Fraud attempt detection
# - Function breakdown (ferry/gift/tokens)
# - Success rates and performance metrics
```

### Test 4.2: Cross-Venue Comparison
```bash
# Get analytics for all venues
curl -X GET "http://localhost:8080/venue/central-pier/analytics?hours=1"
curl -X GET "http://localhost:8080/venue/cheung-chau/analytics?hours=1"
curl -X GET "http://localhost:8080/venue/gift-shop-central/analytics?hours=1"

# Expected: Different venues show different usage patterns
# - Ferry terminals: High ferry_boarding counts
# - Gift shops: High gift_redemption counts
# - Playgrounds: High playground_token counts
```

## Success Criteria Validation

### ✅ Multi-Function Package Validation
- [ ] Premium Plan supports unlimited ferry boarding
- [ ] Gift redemption limited to single use per ticket
- [ ] Playground tokens accurately decremented (10 → 9 → 8...)
- [ ] Wrong function codes properly rejected

### ✅ Cross-Terminal Fraud Prevention
- [ ] JTI duplication detected across all venues
- [ ] Fraud detection response time < 2 seconds
- [ ] Concurrent scanning properly handled
- [ ] Audit trail maintained for all attempts

### ✅ Performance Requirements
- [ ] Individual scan response time < 2 seconds
- [ ] System handles 1000+ scans/hour load
- [ ] No degradation with multiple concurrent operators
- [ ] 99.9% uptime during testing period

### ✅ Real-Time Analytics
- [ ] Live metrics collection working
- [ ] Venue-specific breakdowns accurate
- [ ] Fraud attempt tracking functional
- [ ] Performance monitoring active

## Troubleshooting Guide

**Issue: "VENUE_NOT_FOUND" error**
- Check venue_code spelling in scan request
- Verify venue exists in mock configuration

**Issue: "No operator token provided" error**
- Ensure Authorization header is included: `Authorization: Bearer <token>`
- Verify operator login was successful and token is saved

**Issue: 401 Unauthorized**
- Operator token may have expired (8 hour default)
- Re-login to get a fresh operator_token

**Issue: Response time > 2 seconds**
- Check server load and available memory
- Verify no background processes interfering
- Consider database mode vs mock mode performance

**Issue: Fraud detection not working**
- Ensure using same JTI in duplicate attempts
- Check that operators are scanning at different venues
- Verify mock store JTI tracking is enabled

## Database Mode Testing

To test with full database persistence:

```bash
# Start in database mode
USE_DATABASE=true DB_HOST=your_host DB_USERNAME=user DB_PASSWORD=pass npm start

# Run same test scenarios
# Expected: All functionality works with persistent storage
# Additional verification: Database records created for all redemptions
```

---

This testing plan validates all PRD-003 requirements and ensures the venue operations platform meets performance and functionality criteria for production deployment.