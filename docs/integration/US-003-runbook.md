# US-003 — Buyer views tickets & QR

User experience: View purchased tickets → Generate QR codes for scanning

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **User token**: `user123` (mock authentication)
- **Existing tickets**: Run US-001 steps 1-3 or use seeded data
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. View My Tickets
Get all tickets for authenticated user:
```bash
curl -s -H "Authorization: Bearer user123" \
  http://localhost:8080/my/tickets | jq '.'
```

**Expected**:
- List of tickets with details (product_name, status, entitlements)
- Each ticket shows available functions and remaining uses
- Ticket codes for QR generation

### 2. Generate QR Token
Create short-lived QR token for specific ticket:
```bash
# Replace <TICKET_CODE> with actual ticket_code from step 1
curl -s -X POST \
  -H "Authorization: Bearer user123" \
  http://localhost:8080/tickets/<TICKET_CODE>/qr-token | jq '.'
```

**Expected**:
- Returns JWT token valid for 5 minutes
- Token contains ticket and user information
- Can be converted to QR code for mobile display

### 3. Verify QR Token Structure
Decode the JWT to inspect contents (optional):
```bash
# Replace <QR_TOKEN> with actual token from step 2
echo "<QR_TOKEN>" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.' || echo "JWT payload inspection"
```

### 4. Multiple QR Generation
Generate QR tokens for different tickets:
```bash
# Get all ticket codes
TICKET_CODES=$(curl -s -H "Authorization: Bearer user123" http://localhost:8080/my/tickets | jq -r '.tickets[].ticket_code')

# Generate QR for each ticket
for TICKET_CODE in $TICKET_CODES; do
  echo "=== QR for ticket: $TICKET_CODE ==="
  curl -s -X POST -H "Authorization: Bearer user123" \
    http://localhost:8080/tickets/$TICKET_CODE/qr-token | jq '.'
  echo ""
done
```

## Complete User Experience Flow
```bash
export BASE=http://localhost:8080

# Step 1: View tickets
echo "=== My Tickets ==="
TICKETS_RESP=$(curl -s -H "Authorization: Bearer user123" $BASE/my/tickets)
echo $TICKETS_RESP | jq '.tickets[] | {ticket_code, product_name, status, entitlements}'

# Step 2: Get first ticket code
TICKET_CODE=$(echo $TICKETS_RESP | jq -r '.tickets[0].ticket_code')
echo "Using ticket: $TICKET_CODE"

# Step 3: Generate QR
echo "=== Generate QR Token ==="
QR_RESP=$(curl -s -X POST -H "Authorization: Bearer user123" $BASE/tickets/$TICKET_CODE/qr-token)
QR_TOKEN=$(echo $QR_RESP | jq -r '.qr_token')
echo "QR Token generated: ${QR_TOKEN:0:50}..."

# Step 4: Show QR details
echo "=== QR Token Details ==="
echo $QR_RESP | jq '.'

# Step 5: Ready for scanning
echo "=== Ready for Gate Scanning ==="
echo "Present this QR token at any gate for redemption"
echo "Token expires in 5 minutes"
```

## Mobile App Integration Example
```javascript
// Frontend integration example
async function getUserTickets() {
  const response = await fetch('/my/tickets', {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  return response.json();
}

async function generateQR(ticketCode) {
  const response = await fetch(`/tickets/${ticketCode}/qr-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  const { qr_token } = await response.json();

  // Display as QR code using library like qrcode.js
  return qr_token;
}
```

## Expected Response Formats

### My Tickets Response
```json
{
  "tickets": [
    {
      "ticket_code": "TKT-ABC123",
      "product_id": 101,
      "product_name": "3-in-1 Transport Pass",
      "status": "ACTIVE",
      "user_id": "user123",
      "order_id": 12345,
      "entitlements": [
        {
          "function_code": "ferry",
          "function_name": "Ferry Service",
          "max_uses": 10,
          "used_count": 2,
          "remaining_uses": 8
        },
        {
          "function_code": "bus",
          "function_name": "Bus Service",
          "max_uses": 20,
          "used_count": 5,
          "remaining_uses": 15
        }
      ]
    }
  ]
}
```

### QR Token Response
```json
{
  "qr_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_at": "2025-10-20T10:05:00+08:00",
  "ticket_code": "TKT-ABC123"
}
```

## Expected Results
- ✅ **Tickets list**: Shows all user tickets with entitlement details
- ✅ **QR generation**: Valid JWT tokens created
- ✅ **Expiration**: 5-minute TTL properly set
- ✅ **Authorization**: Only ticket owner can generate QR
- ✅ **Multiple tickets**: Can generate QR for any owned ticket

## Error Scenarios
| Scenario | Expected Response |
|----------|-------------------|
| No authorization | `401 Unauthorized` |
| Invalid ticket_code | `404 Not Found` |
| Ticket not owned by user | `403 Forbidden` |
| Inactive ticket | `400 Bad Request` |

## Usage Notes
- QR tokens expire after 5 minutes for security
- Each QR generation creates a fresh token
- Users can generate multiple QR tokens simultaneously
- QR tokens are bound to specific tickets and users
- Frontend should refresh QR codes before expiration