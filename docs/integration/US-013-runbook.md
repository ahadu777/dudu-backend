# US-013 Venue Operations Platform - Integration Runbook

**Story**: Event Venue Operations Platform (PRD-003)
**Status**: Production Ready
**Updated**: 2025-11 (Simplified to operator token auth)

## Overview

Complete integration guide for venue operations including multi-terminal fraud detection, operator authentication, and real-time analytics.

## Prerequisites

```bash
# 1. Start server in mock mode
USE_DATABASE=false PORT=8080 npm start

# 2. Verify server health
curl http://localhost:8080/healthz
# Expected: {"status":"ok"}

# 3. Check Swagger documentation
open http://localhost:8080/docs
```

## Venue Configuration

| Venue Code | Name | Supported Functions |
|------------|------|-------------------|
| `central-pier` | Central Pier Terminal | Ferry boarding |
| `cheung-chau` | Cheung Chau Terminal | Ferry + gifts + playground |

## Core Integration Flow

### Step 1: Operator Authentication

**Login as operator:**
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secret123"
  }'

# Expected Response:
# {"operator_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Save the token:
export OPERATOR_TOKEN="<token_from_response>"
```

### Step 2: Generate QR Token for Testing

```bash
cat > generate-qr-token.js << 'EOF'
const jwt = require('jsonwebtoken');

const payload = {
  tid: 'TKT-123-001',
  jti: 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300  // 5 minutes
};

const secret = 'qr-signing-secret-change-in-production';
const token = jwt.sign(payload, secret);

console.log(token);
EOF

# Generate QR token:
export QR_TOKEN=$(node generate-qr-token.js)
echo "QR Token: $QR_TOKEN"
```

### Step 3: Venue Scanning

**API Endpoint**: `POST /venue/scan`

**Required**: Operator token in Authorization header

**Test 3.1: Ferry Boarding (Success):**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"qr_token\": \"$QR_TOKEN\",
    \"function_code\": \"ferry\",
    \"venue_code\": \"central-pier\"
  }" | python3 -m json.tool

# Expected: Success response with performance metrics
# {
#   "result": "success",
#   "ticket_code": "TKT-123-001",
#   "function_code": "ferry",
#   "remaining_uses": 0,
#   "ticket_status": "partially_redeemed",
#   "performance_metrics": {
#     "response_time_ms": 2,
#     "fraud_checks_passed": true
#   }
# }
```

**Test 3.2: Cross-Terminal Fraud Detection:**
```bash
# Generate new QR token
export QR_TOKEN_2=$(node generate-qr-token.js)

# First scan - should succeed
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$QR_TOKEN_2\",\"function_code\":\"ferry\",\"venue_code\":\"central-pier\"}"

# Same QR at different venue - should fail (JTI already used)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$QR_TOKEN_2\",\"function_code\":\"ferry\",\"venue_code\":\"cheung-chau\"}"

# Expected: {"result":"reject","reason":"ALREADY_REDEEMED",...}
```

**Test 3.3: Wrong Function Code:**
```bash
export QR_TOKEN_3=$(node generate-qr-token.js)

# Try gift redemption at ferry-only terminal
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$QR_TOKEN_3\",\"function_code\":\"gift_redemption\",\"venue_code\":\"central-pier\"}"

# Expected: {"result":"reject","reason":"WRONG_FUNCTION",...}
```

**Test 3.4: Multi-Function Validation:**
```bash
export QR_TOKEN_4=$(node generate-qr-token.js)

# Test bus function (TKT-123-001 has bus: 2 uses)
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$QR_TOKEN_4\",\"function_code\":\"bus\",\"venue_code\":\"cheung-chau\"}"

# Expected: Success with remaining_uses decremented
```

### Step 4: Real-Time Analytics

**Get Venue Analytics:**
```bash
curl -s "http://localhost:8080/venue/central-pier/analytics?hours=24" | python3 -m json.tool

# Expected Response:
# {
#   "venue_code": "central-pier",
#   "period": {"hours": 24},
#   "metrics": {
#     "total_scans": 92,
#     "successful_scans": 78,
#     "fraud_attempts": 2,
#     "success_rate": 84.78,
#     "function_breakdown": {
#       "ferry_boarding": 28,
#       "gift_redemption": 19,
#       "playground_token": 21
#     }
#   }
# }
```

## Performance Validation

**Single Scan Performance:**
```bash
time curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$(node generate-qr-token.js)\",\"function_code\":\"ferry\"}"

# Expected: Response time < 2 seconds (typically 1-3ms in mock mode)
```

**Load Testing (10 concurrent scans):**
```bash
for i in {1..10}; do
  QR=$(node generate-qr-token.js)
  curl -s -X POST http://localhost:8080/venue/scan \
    -H "Authorization: Bearer $OPERATOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"qr_token\":\"$QR\",\"function_code\":\"ferry\"}" &
done
wait
echo "Load test complete"

# Expected: All requests complete within seconds
```

## Error Scenarios Testing

**Missing Authentication:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"test","function_code":"ferry"}'

# Expected: {"code":"INTERNAL_ERROR","message":"No operator token provided"}
```

**Invalid Operator Token:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"test","function_code":"ferry"}'

# Expected: 401 Unauthorized
```

**Expired QR Token:**
```bash
cat > expired-token.js << 'EOF'
const jwt = require('jsonwebtoken');
const payload = {
  tid: 'TKT-123-001',
  jti: 'expired-' + Date.now(),
  iat: Math.floor(Date.now() / 1000) - 3600,
  exp: Math.floor(Date.now() / 1000) - 1800
};
console.log(jwt.sign(payload, 'qr-signing-secret-change-in-production'));
EOF

EXPIRED_TOKEN=$(node expired-token.js)

curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$EXPIRED_TOKEN\",\"function_code\":\"ferry\"}"

# Expected: {"result":"reject","reason":"TOKEN_EXPIRED",...}
```

## Complete Test Script

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:8080"

echo "=== US-013 Venue Operations E2E Test ==="

# Step 1: Operator Login
echo "Step 1: Operator Login"
OP_RESP=$(curl -s -X POST $BASE_URL/operators/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}')
OPERATOR_TOKEN=$(echo $OP_RESP | grep -o '"operator_token":"[^"]*"' | cut -d'"' -f4)
echo "✅ Logged in: ${OPERATOR_TOKEN:0:30}..."

# Step 2: Generate QR
echo "Step 2: Generate QR Token"
QR_TOKEN=$(node generate-qr-token.js)
echo "✅ QR generated: ${QR_TOKEN:0:30}..."

# Step 3: Scan
echo "Step 3: Venue Scan"
SCAN_RESP=$(curl -s -X POST $BASE_URL/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_token\":\"$QR_TOKEN\",\"function_code\":\"ferry\",\"venue_code\":\"central-pier\"}")
echo "$SCAN_RESP" | python3 -m json.tool
echo "✅ Scan completed"

# Step 4: Analytics
echo "Step 4: Venue Analytics"
curl -s "$BASE_URL/venue/central-pier/analytics?hours=1" | python3 -m json.tool
echo "✅ Analytics retrieved"

echo "=== Test Complete ==="
```

## Success Criteria Validation

### Multi-Function Package Validation
- [x] Ferry boarding: Unlimited uses working
- [x] Gift redemption: Single use validation
- [x] Playground tokens: Counted use tracking
- [x] Wrong function codes properly rejected

### Cross-Terminal Fraud Prevention
- [x] JTI duplicate detection across venues
- [x] Response time < 2 seconds for fraud checks
- [x] Audit trail for all scan attempts

### Performance Requirements
- [x] Individual scan response < 2 seconds
- [x] System handles concurrent scans
- [x] Analytics respond quickly

## Cleanup

```bash
rm -f generate-qr-token.js expired-token.js
```

---

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/operators/login` | POST | None | Get operator token |
| `/venue/scan` | POST | Operator | Scan and redeem ticket |
| `/venue/:code/analytics` | GET | None | Get venue analytics |
| `/venue` | GET | None | List all venues |

---

**Note**: This runbook validates PRD-003 venue operations requirements including multi-function validation, fraud detection, and performance metrics.
