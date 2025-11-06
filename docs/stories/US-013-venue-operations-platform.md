# US-013: Event Venue Operations Platform

**Story ID**: US-013  
**PRD**: PRD-003  
**Status**: ✅ Complete  
**Priority**: High  
**Epic**: Venue Operations

## Story Description

As a **ferry terminal operator**, I want to **scan QR codes for multi-function packages** so that I can **validate Premium Plan tickets with unlimited ferry boarding, single gift redemption, and counted playground tokens** while **preventing fraud across all terminals**.

## Acceptance Criteria

### AC1: Multi-Function Package Validation ✅
- [x] Premium Plan: Unlimited ferry boarding (always allow, no decrement)
- [x] Premium Plan: Single gift redemption (check history, reject if already redeemed)
- [x] Premium Plan: 10 playground tokens (decrement remaining_uses)
- [x] Pet Plan: Ferry + pet transport + gift validation
- [x] Deluxe Tea Set: Ferry + tea service (location-specific to cheung-chau)

### AC2: Cross-Terminal Fraud Prevention ✅
- [x] JTI duplicate detection across all terminals
- [x] Pessimistic locking prevents race conditions
- [x] <2 second fraud detection response time
- [x] Immutable audit trail for all redemptions

### AC3: Venue Session Management ✅
- [x] Create venue operator sessions
- [x] Session tied to specific venue and operator
- [x] Session expiration handling
- [x] Terminal device tracking

### AC4: Location-Specific Validation ✅
- [x] Venue function support validation
- [x] Tea set only at cheung-chau
- [x] WRONG_LOCATION error handling
- [x] WRONG_FUNCTION error handling

### AC5: Real-Time Analytics ✅
- [x] Venue-specific metrics (total scans, success rate, fraud attempts)
- [x] Function breakdown (ferry, gift, playground)
- [x] Time-based analytics (configurable hours)
- [x] Performance metrics (response time, fraud checks)

### AC6: Security & Performance ✅
- [x] Input validation (email, HTML sanitization, string length)
- [x] Rate limiting (200 req/min for scanning)
- [x] Transaction safety (atomic operations, rollback on error)
- [x] <2 second response time (95th percentile)

## Technical Implementation

### Endpoints Implemented

1. **POST /api/venue/sessions**
   - Create venue operator session
   - Returns session_code, venue info, supported functions

2. **POST /api/venue/scan**
   - Enhanced scanning with multi-function validation
   - Fraud detection (JTI duplicate check)
   - Location-specific validation
   - Returns result (success/reject), remaining_uses, venue_info

3. **GET /api/venue/{venue_code}/analytics**
   - Real-time venue analytics
   - Package-specific metrics
   - Function breakdown

### Files Created/Modified

**New Files**:
- `src/modules/venue/domain/function-types.ts` - Function type system
- `src/modules/venue/utils/function-mapper.ts` - Function code translation
- `src/middlewares/inputValidator.ts` - Input validation middleware
- `src/middlewares/rateLimiter.ts` - Rate limiting middleware
- `migrations/0004_venues.sql` - Venue seed data

**Modified Files**:
- `src/modules/venue/service.ts` - Multi-function validation logic
- `src/modules/venue/domain/venue.repository.ts` - Redemption history query
- `src/modules/venue/router.ts` - Middleware integration
- `src/app.ts` - JSON error handler

### Database Schema

**Venues Table**:
- `venue_id`, `venue_code`, `venue_name`, `venue_type`
- `supported_functions` (JSON array)
- `is_active`

**Redemption Events Table**:
- `event_id`, `ticket_code`, `function_code`
- `venue_id`, `operator_id`, `session_code`
- `jti` (unique, indexed for fast lookup)
- `result`, `reason`, `remaining_uses_after`
- `redeemed_at`, `additional_data`

## Test Coverage

### Unit Tests
- Function type mapping
- Function code translation
- Input validation
- Rate limiting

### Integration Tests
- Multi-function validation flow
- Cross-terminal fraud detection
- Location-specific validation
- Analytics queries

### E2E Tests
- Complete Premium Plan flow (order → payment → ticket → multi-function redemption)
- Cross-terminal fraud prevention
- Location-specific validation (tea set)
- OTA integration with venue scanning

### Postman Collection
- `postman/PRD-003-Venue-Operations.postman.json`
- Complete test suite with all scenarios

## User Flow

```
1. Operator creates session at venue
   POST /api/venue/sessions
   → Returns session_code

2. Passenger presents QR code
   Operator scans QR code
   POST /api/venue/scan
   → Validates multi-function entitlement
   → Checks fraud (JTI duplicate)
   → Validates location
   → Returns success/reject

3. Manager views analytics
   GET /api/venue/{venue_code}/analytics
   → Returns real-time metrics
```

## Business Value

- **Operational Efficiency**: Reduce Premium Plan validation from 5 minutes to <10 seconds
- **Fraud Prevention**: Eliminate 100% of package fraud through JTI tracking
- **Scalability**: Process 1000+ scans/hour capacity
- **Revenue**: $145K Y1 revenue from 2 pilot terminals

## Dependencies

- **US-001**: Ticket purchase (provides tickets)
- **US-004**: Payment webhook (provides paid orders)
- **US-002**: Basic scanning (enhanced with multi-function logic)

## Related Documentation

- [PRD-003](../prd/PRD-003-event-venue-operations.md)
- [US-013 Runbook](../integration/US-013-runbook.md)
- [E2E Test Suite](../../test-flows/E2E-PRD-003-Complete-Flow.md)
- [Postman Collection](../../postman/PRD-003-Venue-Operations.postman.json)

## Definition of Done Checklist

- [x] All acceptance criteria met
- [x] Code compiles without errors
- [x] Multi-function validation works correctly
- [x] Fraud prevention tested
- [x] Location-specific validation tested
- [x] Analytics working
- [x] Security hardening complete
- [x] Performance requirements met (<2 seconds)
- [x] Test suites created (unit, integration, E2E)
- [x] Postman collection created
- [x] Documentation complete
- [x] Runbook created

## Status: ✅ COMPLETE

**Completion Date**: 2025-11-06  
**Implementation**: Production-ready with transaction safety, security hardening, and comprehensive test coverage.


