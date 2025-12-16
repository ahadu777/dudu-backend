---
id: US-013
title: Event Venue Operations Platform
owner: Product
status: "Done"
priority: High
created_date: "2025-11-04"
completed_date: "2025-11-25"
business_requirement: "PRD-003"
cards:
  - venue-management-crud
  - venue-enhanced-scanning
  - venue-analytics-reporting
  - operator-validation-scanner
---

# US-013: Event Venue Operations Platform

## Story Analysis

### 1. Story Understanding

#### Core Story
**As a** venue operator at ferry terminals, gift shops, or playgrounds
**I want** to scan customer tickets and validate their entitlements in real-time
**So that** I can provide seamless service while preventing fraud and tracking redemptions

#### Venue Management Story
**As a** system administrator
**I want** to manage venues (create, update, delete) with supported functions configuration
**So that** operators can be assigned to appropriate venues with correct entitlement validation

#### Analytics Story
**As a** business manager
**I want** to view venue performance analytics (success rates, fraud detection, operator performance)
**So that** I can optimize operations and identify issues proactively

#### Business Context
- **Business Driver**: PRD-003 Multi-terminal redemption with fraud prevention
- **Security Requirement**: JTI-based replay attack prevention
- **Performance Target**: <2 second response time for all scan operations
- **Audit Requirement**: Complete redemption event logging with operator attribution

#### Acceptance Criteria

##### Venue CRUD Management
- [x] Administrators can list all active venues with supported functions
- [x] Administrators can view inactive venues when needed
- [x] Administrators can create new venues with code, name, and type
- [x] Administrators can update venue information
- [x] Administrators can soft-delete venues (deactivate)
- [x] Administrators can permanently remove venues when required
- [x] System prevents duplicate venue codes with clear error messages

##### Venue Scanning Operations
- [x] Operators can scan QR tokens to validate and redeem entitlements
- [x] Scanning requires operator authentication
- [x] System prevents replay attacks (same QR + function cannot be used twice)
- [x] Supports all function codes: ferry_boarding, gift_redemption, playground_token
- [x] OTA tickets must be activated before scanning
- [x] Scan results show entitlements and remaining uses
- [x] All redemption events are recorded with operator attribution

##### Venue Analytics
- [x] Managers can view venue performance metrics
- [x] Analytics support configurable time windows (up to 1 week)
- [x] Metrics include: total scans, success rate, fraud attempts, function breakdown
- [x] Invalid time parameters are rejected with clear error messages

##### Performance & Security
- [x] All endpoints respond within 2 seconds
- [x] Fraud detection logs all suspicious activities
- [x] Complete audit trail for 7-year compliance requirement
- [x] Operator information included in all redemption records

### 2. Business Rules Extraction

#### Venue Types
1. **Ferry Terminal** (ferry_terminal)
   - Primary function: ferry_boarding
   - High-volume scanning operations
   - Example: Central Pier, Cheung Chau Terminal

2. **Gift Shop** (gift_shop)
   - Primary function: gift_redemption
   - Medium-volume operations

3. **Playground** (playground)
   - Primary function: playground_token
   - Variable volume based on peak hours

#### Multi-Function Venues
- Some venues support multiple functions (e.g., Cheung Chau supports ferry_boarding + gift_redemption + playground_token)
- Function validation ensures tickets are scanned at appropriate venues
- `supported_functions` array in venue configuration

#### Scanning Rules
1. **Authentication**: Operator JWT required for all scan operations
2. **QR Validation**: Decrypt and verify signature (tamper-proof)
3. **Replay Prevention**: JTI + function_code unique constraint
4. **Status Check**: Only ACTIVE tickets can be scanned
5. **Entitlement Check**: Function must exist with remaining_uses > 0
6. **Decrement**: Reduce remaining_uses by 1 on successful scan
7. **Audit**: Record complete redemption event

#### Analytics Rules
- Time window limited to 1-168 hours (1 week maximum)
- Metrics aggregated by function_code
- Success rate = successful_scans / total_scans
- Fraud rate tracks rejected scans due to replay attempts

### 3. Technical Implementation

#### Module Structure
```
src/modules/venue/
├── router.ts          # API routes with Swagger documentation
├── service.ts         # Business logic (VenueOperationsService)
└── domain/
    ├── venue.entity.ts      # TypeORM entity
    └── venue.repository.ts  # Database operations
```

#### Technical Reference
> API contracts and response formats: see related Cards below

### 4. Related Cards

| Card | Status | Description |
|------|--------|-------------|
| venue-management-crud | Done | CRUD operations for venues |
| venue-enhanced-scanning | Done | QR scanning with fraud prevention |
| venue-analytics-reporting | Done | Performance metrics and analytics |
| venue-session-management | Deprecated | Session-based scanning (replaced by JWT auth) |

### 5. Integration Points

#### Dependencies
- **US-001**: Ticket purchase creates entitlements scanned at venues
- **US-002**: Operator authentication for scan operations
- **US-012**: OTA tickets must be activated before venue scanning

#### Database Tables
- `venues` - Venue master data with supported_functions
- `venue_sessions` - Operator sessions (deprecated, JWT used instead)
- `redemption_events` - Complete audit trail of all scans

### 6. Testing

#### Test Assets
- **Newman Collection**: `reports/collections/us-013-venue-operations.json`
- **Runbook**: `docs/integration/US-013-runbook.md`

#### Test Scenarios
1. Venue CRUD operations (create, read, update, soft delete, hard delete)
2. Scanning with valid operator JWT
3. Scan rejection without authentication (401)
4. Analytics retrieval with various time windows
5. Invalid hours parameter validation
6. Performance validation (<2 second response)

#### Run Tests
```bash
# Start server
npm start

# Run Newman tests
npx newman run reports/collections/us-013-venue-operations.json
```

### 7. Completion Notes

**Implemented Features:**
- Full CRUD for venue management
- JWT-authenticated scanning with fraud prevention
- JTI-based replay attack detection
- Multi-function venue support
- Real-time analytics with configurable time windows
- Complete audit logging

**Known Limitations:**
- 7-year audit retention requires long-term verification (outside automation scope)
- Session management deprecated in favor of stateless JWT authentication

**Performance Achieved:**
- Average response time: <100ms (well under 2s requirement)
- Fraud detection: Real-time JTI tracking
- Success rate tracking: Per-venue, per-function breakdowns
