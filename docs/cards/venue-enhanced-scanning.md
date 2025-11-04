---
card: "Enhanced venue scanning with cross-terminal fraud detection"
slug: venue-enhanced-scanning
team: "C - Gate"
oas_paths: ["/venue/scan"]
migrations: ["db/migrations/redemption_events.sql"]
status: "Done"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: "reports/newman/venue-enhanced-scanning-result.json"
last_update: "2025-11-03T18:35:00+0800"
related_stories: ["US-013"]
relationships:
  enhances: ["tickets-scan"]
  depends_on: ["venue-session-management", "qr-token"]
  triggers: ["venue-analytics-reporting"]
  data_dependencies: ["VenueSession", "RedemptionEvent", "Ticket"]
  integration_points:
    data_stores: ["venue.service.ts", "venue.repository.ts"]
---

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /venue/scan
- Migrations: db/migrations/redemption_events.sql

## Business Logic

**Enhanced ticket scanning with venue context and cross-terminal fraud detection.**

### Key Features
- **Cross-terminal fraud detection**: JTI duplicate prevention across all venues
- **Multi-function validation**: Ferry boarding, gift redemption, playground tokens
- **Venue-specific restrictions**: Function codes validated per venue
- **Performance optimized**: Sub-second response times with fraud checks
- **Comprehensive audit trail**: All attempts logged for analytics

### Core Operations

#### Enhanced Venue Scan
```http
POST /venue/scan
{
  "qr_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "function_code": "ferry_boarding",
  "session_code": "VS-MOCK-1762194466702-nlaixr301",
  "terminal_device_id": "TERMINAL-CP-001"
}
```

**Business Rules:**
1. **Session Validation**: Active venue session required
2. **Token Validation**: Valid JWT QR token with JTI
3. **Fraud Detection**: JTI must not have been used before (across ALL venues)
4. **Function Validation**: Function must be supported by venue
5. **Entitlement Check**: Remaining uses must be > 0
6. **Atomic Operation**: Success decrements remaining uses

**Success Response:**
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
- Every QR token contains unique JTI
- Database indexed lookup for fast duplicate detection
- Cross-terminal, cross-venue duplicate prevention
- Response time: 1-3ms for fraud checks

**Supported Rejection Reasons:**
- `TOKEN_EXPIRED`: QR token expired
- `INVALID_SESSION`: Session not found or expired
- `ALREADY_REDEEMED`: JTI already used (fraud attempt)
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