---
card: "Enhanced venue scanning with cross-terminal fraud detection"
slug: venue-enhanced-scanning
team: "C - Gate"
oas_paths: ["/venue/scan", "/qr/decrypt"]
migrations: ["db/migrations/redemption_events.sql"]
status: "Pending"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: "reports/newman/venue-enhanced-scanning-result.json"
last_update: "2025-11-14T20:30:00+08:00"
related_stories: ["US-013", "US-012"]
relationships:
  replaces: ["tickets-scan"]
  depends_on: ["qr-generation-api", "ota-premade-tickets"]
  triggers: ["venue-analytics-reporting"]
  data_dependencies: ["RedemptionEvent", "Ticket", "PreGeneratedTicket"]
  integration_points:
    data_stores: ["venue.service.ts", "venue.repository.ts"]
notes: "Venue architecture under review. Session management removed. Venue entity preserved but may be refactored."
---

## ⚠️ STATUS: PENDING REDESIGN

**This card is under review as of 2025-11-14.**

**Changes Made:**
- ✅ Removed dependency on `venue-session-management` (deprecated)
- ✅ Removed `VenueSession` from data dependencies
- ⏳ Venue concept preserved but architecture needs clarification

**Open Questions:**
- Do we need Venue entity or is terminal_device_id sufficient?
- How should venue context be provided (static config vs database)?
- Should redemption_events reference venue_id or just terminal_device_id?

---

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /venue/scan, /qr/decrypt
- Migrations: db/migrations/redemption_events.sql

## Business Logic

**Enhanced ticket scanning with venue context and cross-terminal fraud detection.**

**Recent Updates (2025-11-14):**
- ✅ **session_code now OPTIONAL** - Simplified scanning workflow (no longer required)
- ✅ **Auto-USED status** - OTA tickets automatically marked as USED when all entitlements consumed
- ✅ **OTA Tickets Support** - Full support for pre-generated OTA tickets with entitlements tracking
- ✅ Added POST /qr/decrypt endpoint for decryption-only workflow (2025-11-13)
- ✅ Dual format support: Encrypted QR (AES-256-GCM) + Legacy JWT (2025-11-13)
- ✅ Optimized QR data structure (56.8% smaller) (2025-11-13)

### Key Features
- **Cross-terminal fraud detection**: JTI duplicate prevention across all venues
- **Multi-function validation**: Ferry boarding, gift redemption, playground tokens
- **Venue-specific restrictions**: Function codes validated per venue
- **Performance optimized**: Sub-second response times with fraud checks
- **Comprehensive audit trail**: All attempts logged for analytics

### ⚠️ 重要：查询端点 vs 核销端点 / IMPORTANT: Viewing vs Redemption

**查询端点（不消耗权益）/ Viewing/Query Endpoints (NO entitlement consumption):**
- **POST /qr/decrypt** - 解密并显示票券信息供操作员查看（不核销）
- **GET /qr/:code/info** - 查询票券详情包括 customer_info（不核销）
- **GET /qr/verify** - 微信HTML查看页面（**不用于OTA核销流程**）

**核销端点（消耗权益）/ Redemption Endpoint (CONSUMES entitlements):**
- **POST /venue/scan** - 实际核销，减少 remaining_uses

**❌ 常见错误 / Common mistake**: 将 GET /qr/verify（微信查看）误认为核销流程的一部分
**✅ 正确的OTA流程 / Correct OTA flow**: POST /qr/:code → [可选: POST /qr/decrypt] → POST /venue/scan

---

### Core Operations

#### Recommended Workflow: Decrypt → Display → Redeem

**Step 1: Decrypt QR Code (Optional but Recommended)**
```http
POST /qr/decrypt
{
  "encrypted_data": "a1b2c3d4e5f6...89:01ab23cd45ef"
}
```

**Response (Enhanced 2025-11-17):**
```json
{
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "ticket_code": "OTA-CP-20251103-000001",
  "expires_at": "2025-11-17T20:00:00.000Z",
  "version": 1,
  "is_expired": false,
  "remaining_seconds": 1800,
  "ticket_info": {
    "ticket_type": "OTA",
    "status": "ACTIVE",
    "customer_info": {
      "type": "adult",
      "name": "张三",
      "email": "zhang@example.com",
      "phone": "+86-13800138000"
    },
    "entitlements": [
      {
        "function_code": "ferry_boarding",
        "function_name": "Ferry Ride",
        "remaining_uses": 1,
        "total_uses": 1
      },
      {
        "function_code": "gift_redemption",
        "function_name": "Gift Redemption",
        "remaining_uses": 1,
        "total_uses": 1
      }
    ],
    "product_info": {
      "id": 106,
      "name": "Premium Plan"
    },
    "product_id": 106,
    "order_id": "OTA-ORDER-20251103-001",
    "batch_id": "BATCH-20251103-001",
    "partner_id": "ota_test_partner"
  }
}
```

**Use Case**: Frontend displays complete ticket info to operator in single API call (no need for separate GET /qr/:code/info).

---

**Step 2: Scan and Redeem**
```http
POST /venue/scan
{
  "qr_token": "a1b2c3d4e5f6...89:01ab23cd45ef",
  "function_code": "ferry_boarding",
  "session_code": "VS-MOCK-1762194466702-nlaixr301",  // OPTIONAL (no longer required)
  "terminal_device_id": "TERMINAL-CP-001"
}
```

**Supported QR Formats:**
- **Encrypted (Recommended)**: `iv:encrypted:authTag:signature` (4 colon-separated parts)
- **Legacy JWT**: `header.payload.signature` (3 dot-separated parts)

**Business Rules:**
1. **Format Detection**: Auto-detects encrypted (4+ colons) vs JWT (3 dots)
2. **Session Validation (OPTIONAL)**: Venue session provides context but not required
3. **Token Validation**: Valid encrypted QR or JWT token with JTI
4. **Fraud Detection**: JTI must not have been used before (across ALL venues)
5. **Function Validation**: Function must be available on ticket entitlements
6. **Entitlement Check**: Remaining uses must be > 0
7. **Atomic Operation**: Success decrements remaining uses
8. **Auto-USED Status**: When ALL entitlements reach remaining_uses = 0, ticket status automatically changes to USED (OTA tickets)

**Success Response (Partially Redeemed):**
```json
{
  "result": "success",
  "ticket_status": "partially_redeemed",
  "entitlements": [
    {"function_code": "ferry", "label": "Ferry Ride", "remaining_uses": 0},
    {"function_code": "bus", "label": "Bus Ride", "remaining_uses": 2}
  ],
  "remaining_uses": 0,
  "venue_info": {
    "venue_code": "central-pier",
    "venue_name": "Central Pier Terminal",
    "terminal_device": "TERMINAL-CP-001"
  },
  "performance_metrics": {
    "response_time_ms": 21,
    "fraud_checks_passed": true
  },
  "ts": "2025-11-03T18:31:06.609Z"
}
```

**Success Response (Fully Consumed - Auto USED):**
```json
{
  "result": "success",
  "ticket_status": "USED",
  "entitlements": [
    {"function_code": "ferry", "remaining_uses": 0},
    {"function_code": "gift", "remaining_uses": 0},
    {"function_code": "tokens", "remaining_uses": 0}
  ],
  "remaining_uses": 0,
  "venue_info": {
    "venue_code": "cheung-chau",
    "venue_name": "Cheung Chau Terminal",
    "terminal_device": "TERMINAL-CC-001"
  },
  "performance_metrics": {
    "response_time_ms": 701,
    "fraud_checks_passed": true
  },
  "ts": "2025-11-14T12:00:00.000Z"
}
```
**Note**: When the last entitlement is consumed (all remaining_uses = 0), OTA tickets automatically transition to `USED` status.

**Fraud Detection Response:**
```json
{
  "result": "reject",
  "reason": "ALREADY_REDEEMED",
  "performance_metrics": {
    "response_time_ms": 3,
    "fraud_checks_passed": false
  },
  "ts": "2025-11-03T18:31:06.609Z"
}
```

### Fraud Detection System

**JTI (JWT Token ID) Tracking:**
- Every QR token (encrypted or JWT) contains unique JTI
- **Per-function duplicate detection**: Same JTI can be used for different functions, but not the same function twice
- Database indexed lookup for fast duplicate detection: `(jti, function_code, result='success')`
- Cross-terminal, cross-venue duplicate prevention
- Response time: 1-3ms for fraud checks

**Multi-Entitlement Support:**
- A single QR code can be used to redeem multiple different entitlements
- Example: Same QR can redeem `ferry_boarding`, then `gift_redemption`, then `playground_token`
- Each function can only be redeemed once per QR code (prevents replay attacks)
- Use case: OTA tickets with multiple bundled services

**Dual Format Support:**
- **Encrypted QR (New)**: AES-256-GCM with HMAC-SHA256 signature
  - Format: `iv:encrypted:authTag:signature`
  - Detection: 4+ colon-separated parts
  - Optimized data: Only jti, ticket_code, expires_at, version

- **Legacy JWT**: HS256 signed tokens (backward compatibility)
  - Format: `header.payload.signature`
  - Detection: 3 dot-separated parts
  - Gradual migration path

**Multi-Entitlement Redemption Example:**
```bash
# Ticket has 3 entitlements:
# - ferry_boarding (remaining_uses: 1)
# - gift_redemption (remaining_uses: 1)
# - playground_token (remaining_uses: 1)

# Generate QR code once
POST /qr/OTA-CP-20251103-000001
# Returns: { jti: "550e8400-e29b-41d4-a716-446655440000", encrypted_data: "..." }

# 1st scan: Redeem ferry_boarding
POST /venue/scan
{ "qr_token": "...", "function_code": "ferry_boarding" }
# ✅ SUCCESS (JTI-A + ferry_boarding recorded)

# 2nd scan: Redeem gift_redemption (SAME QR CODE)
POST /venue/scan
{ "qr_token": "...", "function_code": "gift_redemption" }
# ✅ SUCCESS (JTI-A + gift_redemption recorded)

# 3rd scan: Try to redeem ferry_boarding again (SAME QR CODE)
POST /venue/scan
{ "qr_token": "...", "function_code": "ferry_boarding" }
# ❌ REJECT: ALREADY_REDEEMED (JTI-A + ferry_boarding already exists)
```

**Supported Rejection Reasons:**
- `QR_EXPIRED`: Encrypted QR token expired
- `TOKEN_EXPIRED`: JWT token expired (legacy)
- `QR_SIGNATURE_INVALID`: QR tampered with (encrypted only)
- `QR_DECRYPTION_FAILED`: Invalid encrypted QR format
- `INVALID_SESSION`: Session not found or expired
- `ALREADY_REDEEMED`: JTI already used for this specific function (fraud attempt)
- `DUPLICATE_JTI`: Same as ALREADY_REDEEMED
- `TICKET_NOT_FOUND`: Ticket doesn't exist
- `WRONG_FUNCTION`: Function not supported by venue
- `NO_REMAINING`: No remaining uses for function

### Venue Function Matrix

| Venue Code | Ferry Boarding | Gift Redemption | Playground Tokens |
|------------|---------------|-----------------|-------------------|
| central-pier | ✅ | ❌ | ❌ |
| cheung-chau | ✅ | ✅ | ✅ |
| gift-shop-central | ❌ | ✅ | ❌ |
| playground-cc | ❌ | ❌ | ✅ |

### Database Schema

**redemption_events table:**
- event_id (PK)
- ticket_code
- function_code
- venue_id (FK)
- operator_id
- session_code
- terminal_device_id
- jti (unique, indexed)
- result (success/reject)
- reason (for failures)
- remaining_uses_after
- redeemed_at
- additional_data (JSON)

**Indexes for Performance:**
- `idx_redemption_jti` on `jti` (CRITICAL for fraud detection)
- `idx_redemption_venue_time` on `venue_id, redeemed_at`
- `idx_redemption_ticket` on `ticket_code, function_code`

### Performance Requirements

- Individual scan response: < 2 seconds (achieved: 1-3ms)
- Fraud detection lookup: < 10ms (achieved: 1-3ms)
- Support 1000+ scans/hour
- 99.9% availability during peak hours

### Error Handling

- `400` - Invalid request format
- `401` - Invalid QR token
- `404` - Session/ticket not found
- `422` - Business rule violation (no remaining uses, wrong function, etc.)

### Dual Mode Operation

**Database Mode:**
- Full persistence with PostgreSQL/MySQL
- Optimized queries for fraud detection
- Complete audit trail

**Mock Mode:**
- In-memory operations for development
- Same business logic validation
- Performance testing capabilities