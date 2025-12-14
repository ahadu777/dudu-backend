---
card: "Venue session management with device tracking"
slug: venue-session-management
team: "C - Gate"
oas_paths: ["/venue/sessions"]
migrations: ["db/migrations/venue_sessions.sql", "db/migrations/venues.sql"]
status: "deprecated"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: "reports/newman/venue-session-management-result.json"
last_update: "2025-11-14T20:30:00+08:00"
related_stories: []
deprecated: true
deprecated_date: "2025-11-14"
replacement: "Removed - Venue sessions are no longer needed. Operator JWT token is sufficient."
relationships:
  enhances: ["operators-login", "validators-sessions"]
  depends_on: []
  triggers: ["venue-enhanced-scanning"]
  data_dependencies: ["Venue", "VenueSession"]
  integration_points:
    data_stores: ["venue.repository.ts"]
---

## ⚠️ DEPRECATED

**This API endpoint has been removed as of 2025-11-14.**

**Reason**: Venue sessions add unnecessary complexity. Operator JWT token and terminal_device_id are sufficient.

**Migration Path**:
- **Old**: POST `/venue/sessions` → use session_code in `/venue/scan`
- **New**: Use operator JWT token + terminal_device_id directly in `/venue/scan`

**Benefits**:
- Simpler architecture (no session state management)
- Fewer database tables (no venue_sessions table needed)
- Terminal ID provides venue context without session lookup

---

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /venue/sessions
- Migrations: db/migrations/venue_sessions.sql, db/migrations/venues.sql

## Business Logic

**Enhanced operator session management for multi-venue operations.**

### Key Features
- **Multi-venue support**: Sessions tied to specific venue contexts
- **Device tracking**: Terminal device ID association
- **8-hour session duration**: Configurable session lifecycle
- **Venue function validation**: Only allow functions supported by venue

### Core Operations

#### Create Venue Session
```http
POST /venue/sessions
{
  "venue_code": "central-pier",
  "operator_id": 2001,
  "operator_name": "Alice Chan",
  "terminal_device_id": "TERMINAL-CP-001",
  "duration_hours": 8
}
```

**Business Rules:**
- Venue must exist and be active
- Operator must be valid
- Session duration max 12 hours
- Device ID optional but recommended

**Response:**
```json
{
  "session_code": "VS-MOCK-1762194466702-nlaixr301",
  "venue_code": "central-pier",
  "venue_name": "Central Pier Terminal",
  "operator_name": "Alice Chan",
  "expires_at": "2025-11-03T19:27:46.702Z",
  "supported_functions": ["ferry_boarding"]
}
```

### Venue Configuration

**Supported Venues:**
- `central-pier`: Ferry boarding only
- `cheung-chau`: Ferry boarding + gift redemption + playground tokens
- `gift-shop-central`: Gift redemption only
- `playground-cc`: Playground tokens only

### Database Schema

**venues table:**
- venue_id (PK)
- venue_code (unique)
- venue_name
- venue_type
- supported_functions (JSON array)
- is_active

**venue_sessions table:**
- session_id (PK)
- session_code (unique)
- venue_id (FK)
- operator_id
- operator_name
- terminal_device_id
- started_at
- session_duration_seconds
- status (active/expired/ended)

### Error Handling

- `400` - Invalid venue code or operator
- `404` - Venue not found
- `422` - Invalid session duration

### Performance Requirements

- Session creation: < 100ms
- Session validation: < 10ms
- Support 1000+ concurrent sessions