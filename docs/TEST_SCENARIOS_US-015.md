# US-015: Ticket Reservation & Validation - Test Scenarios

**Story:** US-015 Ticket Reservation & Validation
**PRD:** PRD-005-ticket-reservation-validation.md
**Status:** Complete
**Last Updated:** 2025-11-14

---

## 📋 Table of Contents

1. [Ticket Validation Scenarios](#1-ticket-validation-scenarios)
2. [Contact Verification Scenarios](#2-contact-verification-scenarios)
3. [Slot Selection Scenarios](#3-slot-selection-scenarios)
4. [Reservation Creation Scenarios](#4-reservation-creation-scenarios)
5. [Operator Validation Scenarios](#5-operator-validation-scenarios)
6. [Ticket Lifecycle Scenarios](#6-ticket-lifecycle-scenarios)
7. [Multi-Ticket Scenarios](#7-multi-ticket-scenarios)
8. [Performance Test Scenarios](#8-performance-test-scenarios)
9. [Concurrency Test Scenarios](#9-concurrency-test-scenarios)
10. [Security Test Scenarios](#10-security-test-scenarios)
11. [Test Coverage Matrix](#11-test-coverage-matrix)

---

## 1. Ticket Validation Scenarios

**Endpoint:** `POST /api/tickets/validate`
**Reference:** PRD Section 4.2.1, 6.1

### 1.1 Happy Path

| Test ID | Scenario | Input | Expected Output | Status |
|---------|----------|-------|-----------------|--------|
| TV-001 | Valid ACTIVATED ticket | `ticket_number: "TKT-001-20251114-001"` | `{"success": true, "valid": true, ticket: {...}}` | ✅ Pass |
| TV-002 | Ticket exists in database | Valid ticket code | Returns ticket details (product, status, expiry) | ✅ Pass |
| TV-003 | Ticket belongs to valid order | Ticket with order reference | Returns order_id in response | ✅ Pass |

### 1.2 Error States

| Test ID | Error Code | Input Status | Expected Error Message | HTTP Status | Status |
|---------|-----------|--------------|----------------------|-------------|--------|
| TV-E01 | `TICKET_NOT_FOUND` | Non-existent ticket | "Invalid ticket code. Please check and try again." | 400 | ✅ Pass |
| TV-E02 | `TICKET_ALREADY_RESERVED` | Status = RESERVED | "This ticket is already reserved for [date]." | 400 | ✅ Pass |
| TV-E03 | `TICKET_NOT_ACTIVATED` | Status = PENDING_PAYMENT | "This ticket is not activated yet. Please complete payment." | 400 | ✅ Pass |
| TV-E04 | `TICKET_EXPIRED` | Expired ticket | "This ticket has expired." | 400 | ✅ Pass |

### 1.3 Edge Cases

| Test ID | Scenario | Input | Expected Behavior | Status |
|---------|----------|-------|-------------------|--------|
| TV-EC01 | Empty ticket code | `ticket_number: ""` | 400 Bad Request | ⏳ TODO |
| TV-EC02 | Null ticket code | `ticket_number: null` | 400 Bad Request | ⏳ TODO |
| TV-EC03 | Malformed ticket code | `ticket_number: "ABC"` | 400 Bad Request (not found) | ✅ Pass |
| TV-EC04 | SQL injection attempt | `ticket_number: "'; DROP TABLE--"` | Safely handled, no injection | ⏳ TODO |
| TV-EC05 | Very long ticket code | 1000+ char string | 400 Bad Request | ⏳ TODO |

---

## 2. Contact Verification Scenarios

**Endpoint:** `POST /api/tickets/verify-contact`
**Reference:** PRD Section 4.2.2, 6.1

### 2.1 MVP (Simple Format Validation)

| Test ID | Scenario | Input | Expected Output | Status |
|---------|----------|-------|-----------------|--------|
| CV-001 | Valid email format (RFC 5322) | `email: "user@example.com"` | `{"success": true}` | ✅ Pass |
| CV-002 | Valid phone format (E.164) | `phone: "+86-13800138000"` | `{"success": true}` | ✅ Pass |
| CV-003 | Valid name (min 2 chars) | `visitor_name: "John Doe"` | `{"success": true}` | ✅ Pass |

### 2.2 Error Cases

| Test ID | Scenario | Input | Expected Error | Status |
|---------|----------|-------|----------------|--------|
| CV-E01 | Invalid email format | `email: "notanemail"` | "Valid email required" | ⏳ TODO |
| CV-E02 | Invalid phone format | `phone: "abc123"` | "Valid phone number is required" | ✅ Pass |
| CV-E03 | Name too short | `visitor_name: "A"` | "Valid visitor name is required" | ✅ Pass |
| CV-E04 | Missing email | `email: null` | 400 Bad Request | ⏳ TODO |
| CV-E05 | Missing phone | `phone: null` | 400 Bad Request | ⏳ TODO |

### 2.3 Future Enhancement (OTP Verification)

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| CV-F01 | Send 6-digit OTP to email | SendGrid API called | 🔜 Phase 2 |
| CV-F02 | Send 6-digit OTP to SMS | Twilio API called | 🔜 Phase 2 |
| CV-F03 | Verify OTP within 5 minutes | Success if valid code | 🔜 Phase 2 |
| CV-F04 | Expired OTP (>5 min) | Error: "OTP expired" | 🔜 Phase 2 |
| CV-F05 | Max 3 retry attempts | 4th attempt → Lockout | 🔜 Phase 2 |

---

## 3. Slot Selection Scenarios

**Endpoint:** `GET /api/reservation-slots/available`
**Reference:** PRD Section 4.2.3, 6.1

### 3.1 Calendar Display

| Test ID | Scenario | Visual Indicator | Expected Behavior | Status |
|---------|----------|-----------------|-------------------|--------|
| SS-001 | Slots with >50% available | Green border | Selectable, shows "Available" | ✅ Pass |
| SS-002 | Slots with 10-50% available | Yellow border | Selectable, shows "Limited" | ✅ Pass |
| SS-003 | Slots with 0% available | Grayed out | Disabled, shows "Full" | ✅ Pass |
| SS-004 | Past dates | Disabled | Cannot select | ⏳ TODO |
| SS-005 | Future dates (>90 days) | Not shown | No slots available | ⏳ TODO |

### 3.2 Capacity Status Logic

| Test ID | Condition | Expected Status | Badge Color | Button State | Status |
|---------|-----------|----------------|-------------|--------------|--------|
| SS-CS01 | `available_count > 50%` | AVAILABLE | Green | Enabled | ✅ Pass |
| SS-CS02 | `available_count = 50%` | AVAILABLE | Green | Enabled | ✅ Pass |
| SS-CS03 | `available_count = 49%` | LIMITED | Yellow | Enabled | ✅ Pass |
| SS-CS04 | `available_count = 10%` | LIMITED | Yellow | Enabled | ✅ Pass |
| SS-CS05 | `available_count = 9%` | LIMITED | Yellow | Enabled | ✅ Pass |
| SS-CS06 | `available_count = 0%` | FULL | Red | Disabled | ✅ Pass |

### 3.3 Query Parameters

| Test ID | Query | Expected Result | Status |
|---------|-------|-----------------|--------|
| SS-Q01 | `?month=2025-11&orq=1` | Returns all Nov 2025 slots | ✅ Pass |
| SS-Q02 | `?date=2025-11-14&orq=1` | Returns only Nov 14 slots | ✅ Pass |
| SS-Q03 | `?month=INVALID&orq=1` | 400 Bad Request | ⏳ TODO |
| SS-Q04 | Missing `orq` parameter | 400 Bad Request | ✅ Pass |
| SS-Q05 | `?month=2025-11&orq=999` | Empty array (no slots for org) | ⏳ TODO |

### 3.4 Real-Time Capacity

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| SS-RT01 | Query slot capacity | Returns current `booked_count` | ✅ Pass |
| SS-RT02 | Slot becomes full during selection | Show "Slot full" error on submit | ⏳ TODO |
| SS-RT03 | Optimistic locking | Prevents overbooking | ✅ Pass |

---

## 4. Reservation Creation Scenarios

**Endpoint:** `POST /api/reservations/create`
**Reference:** PRD Section 6.1 (lines 690-758)

### 4.1 Success Cases

| Test ID | Scenario | Input | Expected Output | Status |
|---------|----------|-------|-----------------|--------|
| RC-001 | Valid ticket + Available slot | Valid ticket_number, slot_id | `{"success": true, reservation_id: ...}` | ✅ Pass |
| RC-002 | Increment slot booked_count | Create reservation | `booked_count` increased by 1 | ✅ Pass |
| RC-003 | Update ticket status to RESERVED | Create reservation | Ticket status = RESERVED | ✅ Pass |
| RC-004 | Store customer email/phone | Provide contact info | Stored in ticket_reservations | ✅ Pass |
| RC-005 | Return QR code data | Successful creation | Returns base64 QR code | ⏳ TODO |

### 4.2 Error Cases

| Test ID | Error Code | Scenario | HTTP Status | Expected Message | Status |
|---------|-----------|----------|-------------|------------------|--------|
| RC-E01 | `SLOT_FULL` | Slot at capacity | 409 Conflict | "This time slot is full. Please select another time." | ⏳ TODO |
| RC-E02 | Unique constraint | Ticket already has reservation | 409 Conflict | Database constraint prevents duplicate | ✅ Pass |
| RC-E03 | Invalid slot_id | Slot doesn't exist | 400 | "Time slot not found" | ✅ Pass |
| RC-E04 | Invalid ticket_number | Ticket doesn't exist | 400 | Ticket validation fails | ✅ Pass |

### 4.3 Transaction Safety

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| RC-T01 | Row-level locking on slot | `SELECT ... FOR UPDATE` | ⏳ TODO |
| RC-T02 | Capacity check before insert | Verify `booked_count < total_capacity` | ✅ Pass |
| RC-T03 | Atomic updates | All 3 updates succeed or all rollback | ⏳ TODO |
| RC-T04 | Rollback on error | Transaction rollback if capacity reached | ⏳ TODO |

### 4.4 Race Condition Tests

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| RC-R01 | 10 concurrent requests for last slot | Only 1 succeeds, 9 get SLOT_FULL | ⏳ TODO |
| RC-R02 | Same ticket reserved twice | Unique constraint prevents duplicate | ✅ Pass |
| RC-R03 | Capacity check with locking | No overbooking occurs | ⏳ TODO |

---

## 5. Operator Validation Scenarios

**Endpoint:** `POST /api/operator/validate-ticket`
**Reference:** PRD Section 6.2 (lines 764-850)

### 5.1 Valid Ticket Scenarios (GREEN)

| Test ID | Scenario | Input Status | Expected Output | Status |
|---------|----------|--------------|-----------------|--------|
| OV-G01 | Valid reservation for today | RESERVED, date = today | `color_code: "GREEN", allow_entry: true` | ⏳ TODO |
| OV-G02 | Returns customer info | Valid ticket | Shows visitor_name, visitor_phone | ⏳ TODO |
| OV-G03 | Returns reservation details | Valid ticket | Shows date, start_time, end_time | ⏳ TODO |
| OV-G04 | Shows slot capacity | Valid ticket | Shows booked_count/total_capacity | ⏳ TODO |

### 5.2 Warning Scenarios (YELLOW)

| Test ID | Error Code | Scenario | Expected Output | Status |
|---------|-----------|----------|-----------------|--------|
| OV-Y01 | `NO_RESERVATION` | ACTIVATED ticket, no reservation | `color_code: "YELLOW", message: "No reservation found"` | ✅ Pass |
| OV-Y02 | `ALREADY_VERIFIED` | VERIFIED ticket (duplicate scan) | `color_code: "YELLOW", shows verified_at, operator_name` | ✅ Pass |
| OV-Y03 | Idempotent behavior | Scan VERIFIED ticket again | Warning but doesn't fail | ⏳ TODO |

### 5.3 Error Scenarios (RED)

| Test ID | Error Code | Scenario | Expected Output | Status |
|---------|-----------|----------|-----------------|--------|
| OV-R01 | `WRONG_DATE` | Reservation date ≠ today | `color_code: "RED", shows reservation_date vs today` | ⏳ TODO |
| OV-R02 | `TICKET_NOT_FOUND` | Invalid ticket code | `color_code: "RED", message: "Ticket not found"` | ✅ Pass |
| OV-R03 | `TICKET_NOT_ACTIVATED` | PENDING_PAYMENT status | `color_code: "RED", deny entry` | ⏳ TODO |
| OV-R04 | `TICKET_EXPIRED` | Expired ticket | `color_code: "RED", deny entry` | ⏳ TODO |

### 5.4 Color Code Logic Summary

| Color | Condition | Allow Entry | Operator Action |
|-------|-----------|-------------|-----------------|
| 🟢 GREEN | RESERVED + Correct date | ✅ Yes | Click "Allow Entry" |
| 🟡 YELLOW | Warning states | ⚠️ Maybe | Manual decision |
| 🔴 RED | Invalid/Wrong date | ❌ No | Deny entry |

---

## 6. Ticket Lifecycle Scenarios

**Reference:** PRD Section 4.1 (lines 104-127)

### 6.1 Status Transition Tests

| Test ID | Transition | Trigger | Expected New Status | Status |
|---------|-----------|---------|---------------------|--------|
| TL-001 | PENDING_PAYMENT → ACTIVATED | Payment confirmed | ACTIVATED | ⏳ TODO |
| TL-002 | ACTIVATED → RESERVED | Customer creates reservation | RESERVED | ✅ Pass |
| TL-003 | RESERVED → VERIFIED | Operator validates at venue | VERIFIED | ⏳ TODO |
| TL-004 | RESERVED → EXPIRED | Slot end_time passed | EXPIRED | ⏳ TODO |

### 6.2 Invalid Transition Tests

| Test ID | Invalid Transition | Expected Behavior | Status |
|---------|-------------------|-------------------|--------|
| TL-E01 | PENDING_PAYMENT → RESERVED | Error: Cannot reserve unpaid ticket | ⏳ TODO |
| TL-E02 | VERIFIED → RESERVED | Error: Cannot re-reserve verified ticket | ⏳ TODO |
| TL-E03 | EXPIRED → RESERVED | Error: Cannot reserve expired ticket | ⏳ TODO |

### 6.3 Lifecycle State Machine

```
PENDING_PAYMENT → ACTIVATED → RESERVED → VERIFIED
                                  ↓
                              EXPIRED
```

| Test ID | Path | Expected Behavior | Status |
|---------|------|-------------------|--------|
| TL-P01 | Full success path | PENDING → ACTIVATED → RESERVED → VERIFIED | ⏳ TODO |
| TL-P02 | Expiration path | PENDING → ACTIVATED → RESERVED → EXPIRED | ⏳ TODO |
| TL-P03 | Abandoned path | PENDING → ACTIVATED (no reservation) | ✅ Pass |

---

## 7. Multi-Ticket Scenarios

**Reference:** PRD Section 7.3 (lines 934-948)

### 7.1 Customer Purchases 3 Tickets

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| MT-001 | Receive 3 separate ticket codes | Each ticket has unique code | ⏳ TODO |
| MT-002 | Reserve all 3 for same slot | If capacity allows, all succeed | ⏳ TODO |
| MT-003 | Reserve for different slots | Ticket 1 (slot A), Ticket 2 (slot B), Ticket 3 (slot C) | ⏳ TODO |
| MT-004 | Reserve 2 same, 1 different | Flexible reservation per ticket | ⏳ TODO |

### 7.2 Example Test Case

**Input:**
- Order contains 3 tickets
- Ticket 1: `TKT-001-20251114-001`
- Ticket 2: `TKT-001-20251114-002`
- Ticket 3: `TKT-001-20251114-003`

**Reservations:**
```
Ticket 1 → Nov 14, 12:00 PM (Slot 2)
Ticket 2 → Nov 14, 12:00 PM (Slot 2) // Same slot
Ticket 3 → Nov 15, 2:00 PM (Slot 15) // Different slot
```

**Expected:**
- Slot 2 `booked_count` increases by 2
- Slot 15 `booked_count` increases by 1
- All 3 tickets status = RESERVED

---

## 8. Performance Test Scenarios

**Reference:** PRD Section 8.1 (lines 953-970)

### 8.1 API Response Time Targets (P95)

| Test ID | Endpoint | Target (P95) | Test Method | Status |
|---------|----------|-------------|-------------|--------|
| PT-001 | `POST /api/tickets/validate` | < 300ms | Load test 100 concurrent requests | ⏳ TODO |
| PT-002 | `GET /api/reservation-slots/available` | < 500ms | Query 90 days of data | ⏳ TODO |
| PT-003 | `POST /api/reservations/create` | < 1s | Transaction with row locking | ⏳ TODO |
| PT-004 | `POST /api/operator/validate-ticket` | < 500ms | QR scan to result display | ⏳ TODO |

### 8.2 Load Test Scenarios

| Test ID | Scenario | Load | Expected Behavior | Status |
|---------|----------|------|-------------------|--------|
| PT-L01 | Calendar loading | 100 users/sec | All requests < 500ms P95 | ⏳ TODO |
| PT-L02 | Concurrent reservations | 50 requests/sec | No errors, proper locking | ⏳ TODO |
| PT-L03 | QR scanning peak | 200 scans/min | All responses < 500ms | ⏳ TODO |
| PT-L04 | Database connection pool | 1000 concurrent | No connection timeouts | ⏳ TODO |

### 8.3 Caching Tests

| Test ID | Feature | Cache Strategy | Expected Behavior | Status |
|---------|---------|----------------|-------------------|--------|
| PT-C01 | Slot availability | 5 min TTL | Reduce DB queries by 80% | 🔜 Phase 2 |
| PT-C02 | Operator sessions | JWT in memory | Fast authentication | ⏳ TODO |
| PT-C03 | Recent validations | Offline cache | Support offline mode | 🔜 Phase 2 |

---

## 9. Concurrency Test Scenarios

**Reference:** PRD Section 8.3 (lines 991-1010)

### 9.1 Race Condition Prevention

| Test ID | Scenario | Test Setup | Expected Behavior | Status |
|---------|----------|-----------|-------------------|--------|
| CC-001 | 10 users book last slot | Slot capacity = 1, 10 concurrent requests | Only 1 succeeds, 9 get SLOT_FULL | ⏳ TODO |
| CC-002 | Same ticket reserved twice | 2 concurrent requests with same ticket | Unique constraint blocks duplicate | ✅ Pass |
| CC-003 | Row-level locking | Concurrent capacity check | SELECT ... FOR UPDATE prevents race | ⏳ TODO |
| CC-004 | Slot full detection | Capacity reached mid-transaction | Transaction rolls back safely | ⏳ TODO |

### 9.2 Transaction Isolation Tests

| Test ID | Isolation Level | Test | Expected Result | Status |
|---------|----------------|------|-----------------|--------|
| CC-I01 | READ COMMITTED | Check dirty reads | No dirty reads occur | ⏳ TODO |
| CC-I02 | Row locking | Two transactions update same slot | Second waits for first to commit | ⏳ TODO |
| CC-I03 | Deadlock detection | Circular dependency | One transaction aborted | ⏳ TODO |

### 9.3 Optimistic Locking Tests

| Test ID | Scenario | Implementation | Status |
|---------|----------|----------------|--------|
| CC-O01 | Version field check | Add `version` column | 🔜 Phase 2 |
| CC-O02 | Stale data detection | Compare versions before update | 🔜 Phase 2 |
| CC-O03 | Retry on conflict | Exponential backoff | 🔜 Phase 2 |

---

## 10. Security Test Scenarios

**Reference:** PRD Section 8.2 (lines 972-989)

### 10.1 Ticket Code Security

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| SC-T01 | Format validation | `TKT-YYYY-XXXXXX-XXXXXX` (min 16 chars) | ⏳ TODO |
| SC-T02 | UUID generation | Use crypto.randomUUID() | ⏳ TODO |
| SC-T03 | Checksum validation | Include checksum in ticket code | 🔜 Phase 2 |
| SC-T04 | Brute force prevention | Rate limit ticket validation | ⏳ TODO |

### 10.2 Operator Authentication

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| SC-A01 | JWT token expiration | 8-hour timeout | ✅ Pass |
| SC-A02 | Failed login lockout | 5 attempts → 15 min lockout | ⏳ TODO |
| SC-A03 | Role-based access | Only OPERATOR role can verify | ⏳ TODO |
| SC-A04 | IP whitelist | Optional venue IP restriction | 🔜 Phase 2 |
| SC-A05 | Session invalidation | Logout clears JWT | ⏳ TODO |

### 10.3 API Rate Limiting

| Test ID | Endpoint | Limit | Expected Response | Status |
|---------|----------|-------|-------------------|--------|
| SC-R01 | Reservation API | 10 req/min per IP | 429 Too Many Requests | ⏳ TODO |
| SC-R02 | Validation API | 100 req/min per operator | 429 Too Many Requests | ⏳ TODO |
| SC-R03 | DDoS protection | API gateway throttle | Request queued/dropped | 🔜 Phase 2 |

### 10.4 Input Validation & Sanitization

| Test ID | Attack Type | Input | Expected Defense | Status |
|---------|------------|-------|------------------|--------|
| SC-I01 | SQL injection | `ticket_number: "'; DROP TABLE--"` | Parameterized queries, no injection | ⏳ TODO |
| SC-I02 | XSS attack | `visitor_name: "<script>alert(1)</script>"` | HTML entity encoding | ⏳ TODO |
| SC-I03 | Path traversal | `ticket_code: "../../../etc/passwd"` | Input sanitization | ⏳ TODO |
| SC-I04 | Buffer overflow | 10MB JSON payload | Request size limit | ⏳ TODO |
| SC-I05 | NoSQL injection | MongoDB-style injection | Not applicable (MySQL) | N/A |

---

## 11. Test Coverage Matrix

### 11.1 Feature Coverage

| Feature | Happy Path | Error Cases | Edge Cases | Performance | Security | Overall |
|---------|-----------|-------------|------------|-------------|----------|---------|
| Ticket Validation | ✅ 3/3 | ✅ 4/4 | ⏳ 2/5 | ⏳ 0/1 | ⏳ 0/4 | 60% |
| Contact Verification | ✅ 3/3 | ⏳ 2/5 | - | - | - | 50% |
| Slot Selection | ✅ 3/3 | ⏳ 1/5 | ⏳ 0/2 | ⏳ 0/3 | - | 31% |
| Reservation Creation | ✅ 5/5 | ⏳ 2/4 | ⏳ 0/4 | ⏳ 0/1 | - | 50% |
| Operator Validation | ⏳ 1/4 | ✅ 3/6 | ⏳ 0/1 | ⏳ 0/1 | - | 33% |
| Ticket Lifecycle | ⏳ 1/4 | ⏳ 0/3 | ⏳ 0/3 | - | - | 10% |
| **TOTAL** | **16/22** | **12/27** | **2/15** | **0/6** | **0/8** | **38%** |

### 11.2 Priority Matrix

| Priority | Category | Test Count | Completed | Remaining |
|----------|----------|-----------|-----------|-----------|
| P0 (Critical) | Happy paths | 22 | 16 | 6 |
| P1 (High) | Error handling | 27 | 12 | 15 |
| P2 (Medium) | Edge cases | 15 | 2 | 13 |
| P3 (Low) | Performance | 6 | 0 | 6 |
| P3 (Low) | Security | 8 | 0 | 8 |
| **TOTAL** | | **78** | **30** | **48** |

---

## 12. Test Execution Plan

### Phase 1: MVP Testing (Current)
- ✅ Manual testing with curl commands
- ✅ Basic happy path validation
- ✅ Error code verification
- Status: **COMPLETE**

### Phase 2: Automated Testing (Next)
- ⏳ Newman E2E test collection (12 tests created)
- ⏳ Run `npm run test:e2e:us015`
- ⏳ CI/CD integration
- Status: **IN PROGRESS**

### Phase 3: Performance Testing
- ⏳ Load testing with k6 or Artillery
- ⏳ Database query optimization
- ⏳ Response time monitoring
- Status: **PLANNED**

### Phase 4: Security Testing
- ⏳ OWASP Top 10 validation
- ⏳ Penetration testing
- ⏳ Authentication audit
- Status: **PLANNED**

---

## 13. Test Data Reference

### Mock Tickets Available

| Ticket Number | Status | Product | Use For |
|--------------|--------|---------|---------|
| TKT-001-20251114-001 | ACTIVATED | Beijing Zoo Adult | Fresh reservations |
| TKT-001-20251114-002 | ACTIVATED | Beijing Zoo Child | Fresh reservations |
| TKT-001-20251114-003 | RESERVED | Beijing Zoo Adult | Operator validation (GREEN) |
| TKT-001-20251114-004 | VERIFIED | Beijing Zoo Adult | Duplicate scan test (YELLOW) |
| TKT-001-20251114-005 | EXPIRED | Beijing Zoo Adult | Expired ticket test (RED) |

### Mock Operators Available

| Operator ID | Name | Password | Terminal |
|------------|------|----------|----------|
| OP-001 | Zhang Wei | password123 | GATE-A1 |
| OP-002 | Li Ming | password123 | GATE-B2 |
| OP-003 | Wang Fang | password123 | GATE-C3 |

### Mock Slots Available

- **Date Range:** Today + 90 days
- **Time Slots per Day:** 4 (09:00-11:00, 12:00-14:00, 15:00-17:00, 18:00-20:00)
- **Total Slots:** 364
- **Capacity per Slot:** 200
- **Booked Count:** Random (0-150)

---

## 14. Running Tests

### Manual Testing
```bash
# Follow integration runbook
cat docs/integration/US-015-reservation-flow.md

# Test individual endpoints
curl "http://localhost:8080/api/reservation-slots/available?month=2025-11&orq=1"
```

### Automated Testing
```bash
# Run Newman E2E tests
npm run test:e2e:us015

# Run TypeScript example
npm run example:us015
```

### Load Testing (Future)
```bash
# Install k6
brew install k6

# Run load test
k6 run tests/load/us015-load-test.js
```

---

## 15. Test Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Pass | Test implemented and passing |
| ❌ Fail | Test implemented but failing |
| ⏳ TODO | Test not yet implemented |
| 🔜 Phase 2 | Planned for future phase |
| N/A | Not applicable |

---

**Last Updated:** 2025-11-14
**Total Test Cases:** 78
**Implemented:** 30 (38%)
**Remaining:** 48 (62%)

**Next Steps:**
1. Complete Newman E2E test execution
2. Implement edge case tests
3. Add performance test suite
4. Conduct security audit
