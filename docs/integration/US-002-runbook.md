# US-002 — Operator Scan & Redemption

Operator workflow: Login → Scan tickets → Validate redemptions

**Updated**: 2025-11 (API migrated from `/tickets/scan` to `/venue/scan`)

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Operator credentials**: alice/secret123 (seeded)
- **Server running**: `npm run build && PORT=8080 npm start`

## Current API Endpoint

| Old (Deprecated) | New (Current) |
|------------------|---------------|
| `POST /tickets/scan` | `POST /venue/scan` |

## Step-by-Step Flow

### 1. Operator Authentication

Login as gate operator:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "secret123"
  }'
```

**Expected Result:**
```json
{"operator_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Save token for next steps:**
```bash
export OPERATOR_TOKEN="<token_from_response>"
```

### 2. Scan Ticket (Current API)

**Endpoint**: `POST /venue/scan`

**Required Authentication**: `Authorization: Bearer <operator_token>`

```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }'
```

**Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `qr_token` | Yes | JWT token from QR code |
| `function_code` | Yes | Function to validate (ferry, bus, gift, etc.) |
| `venue_code` | No | Venue identifier for function validation |

**Success Response (200):**
```json
{
  "result": "success",
  "ticket_code": "TKT-123-001",
  "function_code": "ferry",
  "remaining_uses": 0,
  "ticket_status": "fully_redeemed",
  "performance_metrics": {
    "response_time_ms": 2,
    "fraud_checks_passed": true
  },
  "ts": "2025-11-28T10:00:00.000Z"
}
```

**Reject Response (422):**
```json
{
  "result": "reject",
  "reason": "ALREADY_REDEEMED",
  "performance_metrics": {
    "response_time_ms": 1,
    "fraud_checks_passed": false
  },
  "ts": "2025-11-28T10:00:00.000Z"
}
```

### 3. Generate QR Token for Testing

**Option A: Use existing ticket from US-001 flow**
```bash
# Get demo user token
USER_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/wechat/login \
  -H 'Content-Type: application/json' \
  -d '{"code":"test_code_001"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Generate QR for ticket
curl -s http://localhost:8080/qr/TKT-123-001 \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Option B: Generate test QR token directly**
```bash
cat > generate-qr.js << 'EOF'
const jwt = require('jsonwebtoken');
const payload = {
  tid: 'TKT-123-001',
  jti: 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300
};
console.log(jwt.sign(payload, 'qr-signing-secret-change-in-production'));
EOF

export QR_TOKEN=$(node generate-qr.js)
echo "QR Token: $QR_TOKEN"
```

### 4. Complete Scan Flow

```bash
# Step 1: Login
echo "=== Operator Login ==="
OP_RESP=$(curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}')
OPERATOR_TOKEN=$(echo $OP_RESP | grep -o '"operator_token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${OPERATOR_TOKEN:0:50}..."

# Step 2: Generate QR
echo "=== Generate QR Token ==="
QR_TOKEN=$(node generate-qr.js)
echo "QR: ${QR_TOKEN:0:50}..."

# Step 3: Scan
echo "=== Scan Ticket ==="
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"qr_token\": \"$QR_TOKEN\",
    \"function_code\": \"ferry\",
    \"venue_code\": \"central-pier\"
  }" | python3 -m json.tool
```

### 5. Test Error Scenarios

**Replay Attack (same QR twice):**
```bash
# First scan - should succeed
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"qr_token\":\"$QR_TOKEN\",\"function_code\":\"ferry\"}"

# Second scan - should fail
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"qr_token\":\"$QR_TOKEN\",\"function_code\":\"ferry\"}"

# Expected: {"result":"reject","reason":"ALREADY_REDEEMED",...}
```

**Invalid Function Code:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"qr_token\":\"$(node generate-qr.js)\",\"function_code\":\"airplane\"}"

# Expected: {"result":"reject","reason":"WRONG_FUNCTION",...}
```

**Missing Authentication:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H 'Content-Type: application/json' \
  -d '{"qr_token":"test","function_code":"ferry"}'

# Expected: {"code":"INTERNAL_ERROR","message":"No operator token provided"}
```

**Invalid Operator Token:**
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer invalid_token" \
  -H 'Content-Type: application/json' \
  -d '{"qr_token":"test","function_code":"ferry"}'

# Expected: 401 Unauthorized
```

## Error Codes Reference

| Reason | HTTP Code | Description |
|--------|-----------|-------------|
| `ALREADY_REDEEMED` | 422 | QR token already used |
| `NO_REMAINING` | 422 | No remaining uses for this function |
| `WRONG_FUNCTION` | 422 | Function not available on ticket |
| `TOKEN_EXPIRED` | 422 | QR token expired |
| `INVALID_TOKEN` | 422 | QR token malformed or invalid |
| `TICKET_NOT_FOUND` | 422 | Ticket does not exist |
| `INTERNAL_ERROR` | 500 | Server error |

## Function Codes

| Code | Description | Typical Uses |
|------|-------------|--------------|
| `ferry` | Ferry boarding | Unlimited or counted |
| `bus` | Bus ride | Counted |
| `metro` | Metro entry | Counted |
| `gift` | Gift redemption | Single use |
| `playground_token` | Playground token | Counted (e.g., 10) |

## Integration with Other Stories

| Story | Integration Point |
|-------|-------------------|
| US-001 | Generate tickets with QR tokens |
| US-013 | Advanced venue operations (analytics, multi-terminal) |
| US-015/016 | OTA ticket activation and redemption |

## Related Runbooks

- **US-013-runbook.md**: Complete venue operations with analytics
- **US-015-runbook.md**: OTA ticket activation flow
- **US-016-runbook.md**: Reservation validation flow

---

**Note**: The old `/tickets/scan` endpoint has been deprecated. All scanning should use `/venue/scan` with operator authentication.
