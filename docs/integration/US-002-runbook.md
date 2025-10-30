# US-002 — Operator scan & redemption

Operator workflow: Login → Create session → Scan tickets → Validate redemptions

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Operator credentials**: alice/secret123 (seeded)
- **Existing QR tokens**: Use US-001 flow to generate test QR codes
- **Server running**: `npm run build && PORT=8080 npm start`

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

### 2. Create Validator Session
Bind operator to specific gate device and location:
```bash
# Replace OPERATOR_TOKEN with token from step 1
OPERATOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-01",
    "location_id": 52
  }'
```

**Expected Result:**
```json
{"session_id":"sess-abc123...","expires_in":28800}
```

### 3. Generate User QR Token (for testing)
Generate a QR token for an existing ticket:
```bash
# Get user token
USER_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/demo-token \
  -H 'Content-Type: application/json' \
  -d '{"user_id": 123, "email": "test@example.com"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Generate QR token for test ticket TKT-123-001
curl -s -X POST http://localhost:8080/tickets/TKT-123-001/qr-token \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Expected Result:**
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","expires_in":60}
```

### 4. Scan Valid Ticket
Scan a QR code and redeem function:
```bash
# Replace QR_TOKEN and SESSION_ID with actual values from steps above
QR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SESSION_ID="sess-abc123..."

curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "'$QR_TOKEN'",
    "function_code": "bus",
    "session_id": "'$SESSION_ID'",
    "location_id": 52
  }' | jq '.'
```

**Expected Result:**
```json
{
  "result": "success",
  "ticket_status": "partially_redeemed",
  "entitlements": [
    {"function_code": "bus", "label": "Bus Ride", "remaining_uses": 1},
    {"function_code": "ferry", "label": "Ferry Ride", "remaining_uses": 1},
    {"function_code": "metro", "label": "Metro Entry", "remaining_uses": 1}
  ],
  "ts": "2025-10-30T05:53:42.292Z"
}
```

### 5. Test Error Scenarios

**Replay Attack (using same QR token twice):**
```bash
# Use same QR_TOKEN and SESSION_ID again
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "'$QR_TOKEN'",
    "function_code": "bus",
    "session_id": "'$SESSION_ID'"
  }'
```

**Expected:** `{"error":"REPLAY","message":"QR code already used"}`

**Wrong Function Code:**
```bash
# Generate fresh QR token and test invalid function
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "'$NEW_QR_TOKEN'",
    "function_code": "airplane",
    "session_id": "'$SESSION_ID'"
  }'
```

**Expected:** `{"error":"WRONG_FUNCTION","message":"Function airplane not available on this ticket"}`

### 4. Handle Different Function Codes
Test scanning for different transport modes:
```bash
# Ferry
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'

# Bus
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "bus",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'

# MRT
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "mrt",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'
```

### 5. Test Edge Cases
```bash
# Expired QR (should fail)
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "expired.jwt.token",
    "function_code": "ferry",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'

# Replay protection (scan same QR twice)
curl -s -X POST http://localhost:8080/tickets/scan \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<USED_QR_TOKEN>",
    "function_code": "ferry",
    "session_id": "<SESSION_ID>",
    "location_id": 52
  }' | jq '.'
```

## Complete Operator Workflow
```bash
export BASE=http://localhost:8080

# Step 1: Operator login
echo "=== Operator Login ==="
OP_RESP=$(curl -s -X POST $BASE/operators/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"secret123"}')
OP_TOKEN=$(echo $OP_RESP | jq -r '.operator_token')
echo "Operator authenticated: ${OP_TOKEN:0:50}..."

# Step 2: Create session
echo "=== Create Validator Session ==="
SESS_RESP=$(curl -s -X POST $BASE/validators/sessions -H "Authorization: Bearer $OP_TOKEN" -H 'Content-Type: application/json' -d '{"device_id":"gate-01","location_id":52}')
SESSION_ID=$(echo $SESS_RESP | jq -r '.session_id')
echo "Session created: $SESSION_ID"

# Step 3: Ready for scanning
echo "=== Ready for Ticket Scanning ==="
echo "Session ID: $SESSION_ID"
echo "Use this session_id to scan QR codes"

# Example scan (requires actual QR token from US-001 flow)
echo "=== Example Scan Command ==="
echo "curl -s -X POST $BASE/tickets/scan -H 'Content-Type: application/json' -d '{\"qr_token\":\"<QR_TOKEN>\",\"function_code\":\"ferry\",\"session_id\":\"$SESSION_ID\",\"location_id\":52}'"
```

## Expected Results
- ✅ **Login**: Valid operator_token received
- ✅ **Session**: session_id created for gate-01 at location 52
- ✅ **Valid scan**: `result: "success"` with usage decremented
- ✅ **Invalid scan**: Proper error codes and messages
- ✅ **Replay protection**: 409 Conflict on duplicate scans
- ✅ **Function validation**: Only valid function_codes accepted

## Error Scenarios
| Scenario | Expected Response |
|----------|-------------------|
| Invalid credentials | `401 Unauthorized` |
| Expired QR token | `400 Bad Request` with error_code |
| Invalid function_code | `400 Bad Request` |
| QR already used | `409 Conflict` |
| Invalid session | `401 Unauthorized` |
| Location mismatch | `400 Bad Request` |

## Integration with US-001
To test complete flow:
1. Run US-001 steps 1-5 to generate valid QR token
2. Run US-002 steps 1-2 to get operator session
3. Use QR from US-001 in US-002 step 3 for scanning
4. Verify redemption success and proper state updates