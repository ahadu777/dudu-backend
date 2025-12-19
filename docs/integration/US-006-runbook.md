# US-006 — Operator Authentication

Operator authentication workflow: Login → Use token for scanning operations

**Updated**: 2025-11 (Session management deprecated, simplified to token-based auth)

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Operator credentials**: alice/secret123, bob/secret456 (seeded)
- **Server running**: `npm run build && PORT=8080 npm start`

## Architecture Change Notice

> **Important**: The `/validators/sessions` endpoint has been **deprecated**.
>
> **Old Flow**: Login → Create Session → Use session_id for scanning
>
> **New Flow**: Login → Use operator_token directly for scanning

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

**Expected Response**:
```json
{
  "operator_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save token for subsequent operations**:
```bash
export OPERATOR_TOKEN="<token_from_response>"
```

### 2. Verify Token
Test token validity with a venue scan (dry run):
```bash
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "test-invalid-token",
    "function_code": "ferry"
  }' | jq '.'
```

**Expected**: Error response (invalid QR), but confirms operator token is valid (not 401)

### 3. Multiple Operators
Test with different operator credentials:
```bash
# Alice login
ALICE_RESP=$(curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}')
ALICE_TOKEN=$(echo $ALICE_RESP | jq -r '.operator_token')
echo "Alice Token: ${ALICE_TOKEN:0:50}..."

# Bob login
BOB_RESP=$(curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"secret456"}')
BOB_TOKEN=$(echo $BOB_RESP | jq -r '.operator_token')
echo "Bob Token: ${BOB_TOKEN:0:50}..."
```

### 4. Use Token for Scanning
Once authenticated, use token for venue scanning:
```bash
# Generate test QR (see US-002/US-013 for full flow)
# Then scan with operator token
curl -s -X POST http://localhost:8080/venue/scan \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "qr_token": "<QR_TOKEN>",
    "function_code": "ferry",
    "venue_code": "central-pier"
  }' | jq '.'
```

## Complete Authentication Flow
```bash
export BASE=http://localhost:8080

echo "=== Operator Authentication Test ==="

# Step 1: Alice login
echo "Step 1: Alice Login"
ALICE_RESP=$(curl -s -X POST $BASE/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}')
ALICE_TOKEN=$(echo $ALICE_RESP | jq -r '.operator_token')

if [ "$ALICE_TOKEN" != "null" ] && [ -n "$ALICE_TOKEN" ]; then
  echo "✅ Alice authenticated: ${ALICE_TOKEN:0:30}..."
else
  echo "❌ Alice login failed"
  exit 1
fi

# Step 2: Bob login
echo "Step 2: Bob Login"
BOB_RESP=$(curl -s -X POST $BASE/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"secret456"}')
BOB_TOKEN=$(echo $BOB_RESP | jq -r '.operator_token')

if [ "$BOB_TOKEN" != "null" ] && [ -n "$BOB_TOKEN" ]; then
  echo "✅ Bob authenticated: ${BOB_TOKEN:0:30}..."
else
  echo "❌ Bob login failed"
  exit 1
fi

# Step 3: Test invalid credentials
echo "Step 3: Test Invalid Credentials"
INVALID_RESP=$(curl -s -X POST $BASE/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"wrongpassword"}')
INVALID_TOKEN=$(echo $INVALID_RESP | jq -r '.operator_token')

if [ "$INVALID_TOKEN" = "null" ] || [ -z "$INVALID_TOKEN" ]; then
  echo "✅ Invalid credentials correctly rejected"
else
  echo "❌ Security issue: invalid credentials accepted"
fi

# Step 4: Verify tokens work for scanning
echo "Step 4: Verify Token Works"
SCAN_TEST=$(curl -s -X POST $BASE/venue/scan \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"qr_token":"test","function_code":"ferry"}')

# Should get validation error, not auth error
if echo "$SCAN_TEST" | grep -q "INTERNAL_ERROR\|No operator token"; then
  echo "❌ Token not working for scanning"
else
  echo "✅ Token accepted for scanning (QR validation error expected)"
fi

echo "=== Authentication Test Complete ==="
echo ""
echo "Tokens ready for use:"
echo "  ALICE_TOKEN=$ALICE_TOKEN"
echo "  BOB_TOKEN=$BOB_TOKEN"
```

## Error Scenarios

| Scenario | Request | Expected Response |
|----------|---------|-------------------|
| Invalid username | `{"username":"unknown","password":"x"}` | `401 Unauthorized` |
| Invalid password | `{"username":"alice","password":"wrong"}` | `401 Unauthorized` |
| Missing credentials | `{}` | `400 Bad Request` |
| Expired token | Use old token after expiry | `401 Unauthorized` |
| Malformed token | `Authorization: Bearer invalid` | `401 Unauthorized` |

## Testing Error Cases
```bash
# Invalid credentials
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"wrongpassword"}'
# Expected: 401 or error response

# Missing password
curl -s -X POST http://localhost:8080/operators/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice"}'
# Expected: 400 Bad Request

# No authorization header
curl -s -X POST http://localhost:8080/venue/scan \
  -H 'Content-Type: application/json' \
  -d '{"qr_token":"test","function_code":"ferry"}'
# Expected: {"code":"INTERNAL_ERROR","message":"No operator token provided"}
```

## Expected Results
- ✅ **Authentication**: Valid operator tokens issued
- ✅ **Token format**: JWT with proper claims
- ✅ **Invalid credentials**: Properly rejected with 401
- ✅ **Token usage**: Can be used directly for `/venue/scan`

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/operators/login` | POST | None | Authenticate operator |
| `/venue/scan` | POST | Operator Token | Scan and redeem tickets |

## Integration with Other Stories
- **US-001**: Operator login for final redemption step
- **US-002**: Operator authentication for scanning
- **US-013**: Venue operations with operator context

## Security Notes
- **Token duration**: 8 hours (typical shift length)
- **Token storage**: Client should store securely, clear on logout
- **Audit trail**: All authentication events are logged
- **Rate limiting**: Consider implementing for production

---

## Deprecated Features

> **The following features have been deprecated:**
>
> - `POST /validators/sessions` - No longer needed
> - `GET /validators/sessions/:id` - Removed
> - `DELETE /validators/sessions/:id` - Removed
> - `session_id` parameter in scanning - No longer used
>
> **Migration**: Simply use the `operator_token` from login directly in the `Authorization` header for all authenticated requests.
