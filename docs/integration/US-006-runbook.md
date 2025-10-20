# US-006 — Operator auth & session lifecycle

Operator authentication and session management: Login → Create sessions → Manage lifecycle

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Operator credentials**: alice/secret123, bob/secret456 (seeded)
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. Operator Login
Authenticate as gate operator:
```bash
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "alice",
    "password": "secret123"
  }' | jq '.'
```

**Expected**: Returns operator_token with proper claims and expiration

### 2. Create Validator Session
Bind operator to gate device and location:
```bash
# Replace <OPERATOR_TOKEN> with token from step 1
curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-01",
    "location_id": 52
  }' | jq '.'
```

**Expected**: Returns session_id for scanning operations

### 3. Multiple Sessions
Create additional sessions for different devices:
```bash
# Same operator, different device
curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-02",
    "location_id": 52
  }' | jq '.'

# Same operator, different location
curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-03",
    "location_id": 53
  }' | jq '.'
```

### 4. Session Information
Get details about active session:
```bash
# If session info endpoint exists
curl -s -X GET http://localhost:8080/validators/sessions/<SESSION_ID> \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" | jq '.'
```

### 5. Session Termination
End session when operator finishes shift:
```bash
# If session termination endpoint exists
curl -s -X DELETE http://localhost:8080/validators/sessions/<SESSION_ID> \
  -H "Authorization: Bearer <OPERATOR_TOKEN>" | jq '.'
```

### 6. Multiple Operators
Test with different operator credentials:
```bash
# Second operator login
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "bob",
    "password": "secret456"
  }' | jq '.'

# Bob creates his own session
# Replace <BOB_TOKEN> with token from bob's login
curl -s -X POST http://localhost:8080/validators/sessions \
  -H "Authorization: Bearer <BOB_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "gate-04",
    "location_id": 54
  }' | jq '.'
```

## Complete Session Lifecycle Example
```bash
export BASE=http://localhost:8080

# Step 1: Operator login
echo "=== Alice Login ==="
ALICE_RESP=$(curl -s -X POST $BASE/operators/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"secret123"}')
ALICE_TOKEN=$(echo $ALICE_RESP | jq -r '.operator_token')
echo "Alice authenticated: ${ALICE_TOKEN:0:50}..."

# Step 2: Create multiple sessions
echo "=== Create Sessions for Alice ==="

# Gate 1 session
SESS1_RESP=$(curl -s -X POST $BASE/validators/sessions -H "Authorization: Bearer $ALICE_TOKEN" -H 'Content-Type: application/json' -d '{"device_id":"gate-01","location_id":52}')
SESS1_ID=$(echo $SESS1_RESP | jq -r '.session_id')
echo "Session 1 (gate-01): $SESS1_ID"

# Gate 2 session
SESS2_RESP=$(curl -s -X POST $BASE/validators/sessions -H "Authorization: Bearer $ALICE_TOKEN" -H 'Content-Type: application/json' -d '{"device_id":"gate-02","location_id":52}')
SESS2_ID=$(echo $SESS2_RESP | jq -r '.session_id')
echo "Session 2 (gate-02): $SESS2_ID"

# Step 3: Bob login and session
echo "=== Bob Login and Session ==="
BOB_RESP=$(curl -s -X POST $BASE/operators/login -H 'Content-Type: application/json' -d '{"username":"bob","password":"secret456"}')
BOB_TOKEN=$(echo $BOB_RESP | jq -r '.operator_token')
echo "Bob authenticated: ${BOB_TOKEN:0:50}..."

BOB_SESS_RESP=$(curl -s -X POST $BASE/validators/sessions -H "Authorization: Bearer $BOB_TOKEN" -H 'Content-Type: application/json' -d '{"device_id":"gate-03","location_id":53}')
BOB_SESS_ID=$(echo $BOB_SESS_RESP | jq -r '.session_id')
echo "Bob session (gate-03): $BOB_SESS_ID"

# Step 4: Show active sessions summary
echo "=== Active Sessions Summary ==="
echo "Alice sessions: $SESS1_ID (gate-01), $SESS2_ID (gate-02)"
echo "Bob sessions: $BOB_SESS_ID (gate-03)"
echo "All sessions ready for ticket scanning"

# Step 5: Simulate scanning activity
echo "=== Ready for Operations ==="
echo "Each session can now be used for ticket scanning"
echo "Use session IDs in US-002 ticket scanning flow"
```

## Session Management Scenarios

### Concurrent Sessions
```bash
# Operator managing multiple gates simultaneously
export OPERATOR_TOKEN="<ALICE_TOKEN>"

# Create sessions for all gates at location
for GATE in gate-01 gate-02 gate-03; do
  echo "Creating session for $GATE"
  curl -s -X POST $BASE/validators/sessions \
    -H "Authorization: Bearer $OPERATOR_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"device_id\":\"$GATE\",\"location_id\":52}" | \
    jq '{session_id, device_id, location_id}'
done
```

### Shift Handover
```bash
# Morning operator ends shift
echo "=== Morning Shift End ==="
curl -s -X DELETE $BASE/validators/sessions/$MORNING_SESSION_ID \
  -H "Authorization: Bearer $MORNING_OPERATOR_TOKEN"

# Afternoon operator starts shift
echo "=== Afternoon Shift Start ==="
AFTERNOON_RESP=$(curl -s -X POST $BASE/operators/login -H 'Content-Type: application/json' -d '{"username":"afternoon_operator","password":"secret789"}')
AFTERNOON_TOKEN=$(echo $AFTERNOON_RESP | jq -r '.operator_token')

# Create new session for same device
curl -s -X POST $BASE/validators/sessions \
  -H "Authorization: Bearer $AFTERNOON_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"device_id":"gate-01","location_id":52}' | jq '.'
```

## Expected Response Formats

### Operator Login Response
```json
{
  "operator_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "operator_id": "alice",
  "expires_at": "2025-10-20T18:00:00+08:00",
  "permissions": ["scan_tickets", "create_sessions"],
  "locations": [52, 53, 54]
}
```

### Session Creation Response
```json
{
  "session_id": "sess_abc123",
  "device_id": "gate-01",
  "location_id": 52,
  "operator_id": "alice",
  "created_at": "2025-10-20T10:00:00+08:00",
  "expires_at": "2025-10-20T18:00:00+08:00",
  "status": "active"
}
```

## Expected Results
- ✅ **Authentication**: Valid operator tokens issued
- ✅ **Authorization**: Tokens contain proper permissions
- ✅ **Session binding**: Device/location associations created
- ✅ **Concurrent sessions**: Multiple sessions per operator
- ✅ **Session isolation**: Each session independent
- ✅ **Proper expiration**: Tokens and sessions expire correctly

## Security Considerations

### Token Security
```bash
# Verify token expiration
echo "=== Token Validation ==="
# After token expires, requests should fail
sleep 3600  # Wait for expiration
curl -s -X POST $BASE/validators/sessions \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"device_id":"gate-01","location_id":52}'
# Expected: 401 Unauthorized
```

### Session Security
```bash
# Verify session isolation
echo "=== Session Isolation Test ==="
# Alice's token should not access Bob's session
curl -s -X GET $BASE/validators/sessions/$BOB_SESSION_ID \
  -H "Authorization: Bearer $ALICE_TOKEN"
# Expected: 403 Forbidden or 404 Not Found
```

## Error Scenarios
| Scenario | Expected Response |
|----------|-------------------|
| Invalid credentials | `401 Unauthorized` |
| Expired token | `401 Unauthorized` |
| Invalid device_id | `400 Bad Request` |
| Invalid location_id | `400 Bad Request` |
| Duplicate session | `409 Conflict` |
| Session not found | `404 Not Found` |
| Unauthorized access | `403 Forbidden` |

## Integration with Other Stories
- **US-002**: Sessions created here used for ticket scanning
- **US-005**: Operator IDs appear in redemption reports
- **US-001**: Complete flow uses sessions for final redemption

## Operational Notes
- **Token duration**: 8 hours (typical shift length)
- **Session duration**: Tied to token expiration
- **Concurrent limits**: No limit on sessions per operator
- **Device binding**: One active session per device
- **Location permissions**: Operators restricted to authorized locations
- **Audit trail**: All login and session events logged