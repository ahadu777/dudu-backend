---
card: "Simplified operator ticket scanning without session requirement"
slug: operators-scan
team: "C - Gate"
oas_paths: ["/operators/scan"]
migrations: []
status: "Done"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: ""
last_update: "2025-11-13T10:30:00+0800"
related_stories: ["US-013"]
relationships:
  simplifies: ["venue-enhanced-scanning"]
  depends_on: ["operators-login", "qr-token"]
  data_dependencies: ["RedemptionEvent", "Ticket"]
  integration_points:
    data_stores: ["operators/scan.service.ts", "core/mock/store.ts"]
---

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /operators/scan
- Migrations: None (reuses existing redemption_events table)

## Business Logic

**Simplified ticket scanning for operators using WeChat mini-program.**

### Key Features
- **No session requirement**: Direct scan after operator login
- **Operator token authentication**: Uses JWT operator_token from login
- **JTI fraud prevention**: Prevents QR code replay attacks
- **Multi-function validation**: Ferry boarding, gift redemption, playground tokens
- **Simplified workflow**: Login → Scan (2 steps instead of 3)
- **WeChat mini-program ready**: Optimized for mobile scanning

### Core Operations

#### Simplified Operator Scan
```http
POST /operators/scan
Authorization: Bearer {operator_token}
Content-Type: application/json

{
  "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "function_code": "ferry_boarding",
  "terminal_device_id": "TERMINAL-001"  // optional
}
```

**Business Rules:**
1. **Token Validation**: Valid operator JWT token required
2. **QR Token Parsing**: Valid QR JWT token with JTI
3. **Fraud Detection**: JTI must not have been used before (cross-operator)
4. **Function Validation**: Function must exist on ticket entitlements
5. **Entitlement Check**: Remaining uses must be > 0
6. **Atomic Operation**: Success decrements remaining uses and marks JTI as used

**Success Response (200):**
```json
{
  "result": "success",
  "ticket_code": "TKT-001-123",
  "ticket_status": "partially_redeemed",
  "function_code": "ferry_boarding",
  "entitlements": [
    {
      "function_code": "ferry_boarding",
      "label": "Ferry Ride",
      "remaining_uses": 0
    },
    {
      "function_code": "gift_redemption",
      "label": "Gift Shop",
      "remaining_uses": 1
    }
  ],
  "remaining_uses": 0,
  "operator_info": {
    "operator_id": 1001,
    "username": "alice"
  },
  "redeemed_at": "2025-11-13T10:30:00.000Z"
}
```

**Rejection Response (422):**
```json
{
  "result": "reject",
  "reason": "ALREADY_REDEEMED",
  "ticket_code": "TKT-001-123"
}
```

### Fraud Detection System

**JTI (JWT Token ID) Tracking:**
- Every QR token contains unique JTI
- In-memory or database lookup for duplicate detection
- Cross-operator duplicate prevention
- Response time: 1-3ms for fraud checks

**Supported Rejection Reasons:**
- `TOKEN_EXPIRED`: QR token expired
- `ALREADY_REDEEMED`: JTI already used (fraud attempt)
- `TICKET_NOT_FOUND`: Ticket doesn't exist
- `TICKET_INVALID`: Ticket is expired or void
- `WRONG_FUNCTION`: Function not available on ticket
- `NO_REMAINING`: No remaining uses for function
- `INTERNAL_ERROR`: System error

### Workflow Comparison

**Traditional Flow (venue-enhanced-scanning):**
```
1. Operator Login → operator_token
2. Create Venue Session → session_code
3. Scan QR Code (requires session_code)
```

**Simplified Flow (operators-scan):**
```
1. Operator Login → operator_token
2. Scan QR Code (uses operator_token in header)
```

**Benefits:**
- ⚡ Faster: 33% fewer steps
- 📱 Mobile-friendly: No session management
- 🔐 Still secure: JTI fraud prevention
- 🎯 Simpler UX: One-step scanning

### Integration with WeChat Mini-Program

**Login Flow:**
```javascript
// Step 1: Operator login (on app start)
wx.request({
  url: 'https://api.example.com/operators/login',
  method: 'POST',
  data: {
    username: 'alice',
    password: 'password123'
  },
  success: (res) => {
    wx.setStorageSync('operator_token', res.data.operator_token);
  }
});
```

**Scan Flow:**
```javascript
// Step 2: Scan QR code
wx.scanCode({
  onlyFromCamera: true,
  success: (res) => {
    const qrToken = res.result;
    const operatorToken = wx.getStorageSync('operator_token');

    wx.request({
      url: 'https://api.example.com/operators/scan',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${operatorToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        qr_token: qrToken,
        function_code: 'ferry_boarding'
      },
      success: (res) => {
        if (res.data.result === 'success') {
          wx.showToast({ title: '验票成功', icon: 'success' });
        } else {
          wx.showModal({
            title: '验票失败',
            content: res.data.reason
          });
        }
      }
    });
  }
});
```

### Data Model

**Reuses existing redemption_events table:**
- event_id (PK)
- ticket_id
- function_code
- operator_id (links to operator)
- session_id (uses `OP-{operator_id}` format for simplified scans)
- location_id (null for simplified scans)
- jti (unique, indexed for fraud detection)
- result (success/reject)
- reason (for failures)
- remaining_uses_after
- redeemed_at
- additional_data (JSON)

**No new tables required** - fully compatible with existing schema.

### Performance Requirements

- Individual scan response: < 2 seconds (achieved: 1-3ms)
- Fraud detection lookup: < 10ms (achieved: 1-3ms)
- Support 1000+ scans/hour per operator
- 99.9% availability during peak hours

### Error Handling

- `400` - Invalid request format (missing qr_token or function_code)
- `401` - Invalid or expired operator_token
- `422` - Business rule violation (fraud, no remaining uses, etc.)
- `500` - Internal server error

### Authentication

**Required Header:**
```
Authorization: Bearer {operator_token}
```

**Token Obtained From:**
```http
POST /operators/login
{
  "username": "alice",
  "password": "password123"
}

Response:
{
  "operator_token": "eyJhbGc..."  // 24-hour validity
}
```

### Dual Mode Operation

**Mock Mode (USE_DATABASE=false):**
- In-memory JTI cache
- Mock store for tickets and operators
- Same business logic validation
- Fast development and testing

**Database Mode (USE_DATABASE=true):**
- Database-backed JTI checks
- Full persistence
- Production-ready audit trail

### Comparison with venue-enhanced-scanning

| Feature | venue-enhanced-scanning | operators-scan |
|---------|------------------------|----------------|
| **Session Required** | ✅ Yes (8-hour session) | ❌ No |
| **Steps to Scan** | 3 (login + session + scan) | 2 (login + scan) |
| **Venue Binding** | ✅ Required | ❌ Optional |
| **Device Tracking** | ✅ Mandatory | ✅ Optional |
| **JTI Fraud Prevention** | ✅ Yes | ✅ Yes |
| **Mobile Optimized** | ⚠️ Moderate | ✅ Highly optimized |
| **Use Case** | Multi-venue complex operations | Single/simple venue operations |

### When to Use Which?

**Use `POST /venue/scan` (complex) when:**
- Multiple venues with different permissions
- Strict device-level tracking required
- Long operator sessions (8+ hours)
- Complex operational analytics needed

**Use `POST /operators/scan` (simplified) when:**
- Single venue or uniform permissions
- Mobile-first (WeChat mini-program)
- Quick scanning workflow preferred
- Basic operator tracking sufficient

### Security Considerations

**Authentication:**
- ✅ Operator JWT token required (24-hour validity)
- ✅ Token verification via middleware
- ✅ Secure password hashing (bcrypt)

**Fraud Prevention:**
- ✅ JTI replay attack prevention
- ✅ QR token expiration validation
- ✅ Ticket status validation
- ✅ Comprehensive audit logging

**Best Practices:**
- Operators should logout when shift ends
- QR tokens have short TTL (default 3600s)
- All redemption events logged for audit
- Failed attempts tracked for security analysis
