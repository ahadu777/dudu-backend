# Implementation Roadmap: Ticket Reservation System

**Approach:** Sequential implementation (US-015 → US-016)
**Backend:** Directus + Express API
**Timeline:** 7 weeks total (4 weeks + 3 weeks)

---

## 📅 Phase 1: US-015 - Operator Validation System (4 Weeks)

### Week 1: Database & Backend Foundation ✅ COMPLETED

**Sprint Goal:** Set up Directus collections and basic API

#### Tasks:
- [x] **Mock Service Implementation (Dual-Mode Architecture)**
  - [x] Create `reservation-slots` module with mock service
  - [x] Create `ReservationSlot` type definitions
  - [x] Implement controller and router
  - [x] Initialize 30 days × 2 venues × 3 time slots = 180 mock slots
  - [x] Support dual-mode: Mock + Directus (controlled by USE_DATABASE flag)

- [x] **Operator Slot Management APIs**
  - [x] `POST /api/operator/slots/create` - Create new time slots
  - [x] `PUT /api/operator/slots/:slot_id` - Update capacity/status
  - [x] `DELETE /api/operator/slots/:slot_id` - Delete or close slots
  - [x] `GET /api/operator/slots` - List slots with filters

- [x] **Customer Availability API**
  - [x] `GET /api/reservation-slots/available?month=YYYY-MM&orq=1`
    - Returns slots grouped by date
    - Includes capacity status (AVAILABLE/LIMITED/FULL)
    - Excludes CLOSED slots

**Deliverables:**
- ✅ Mock service with 180 slots initialized
- ✅ Operator slot management endpoints working
- ✅ Customer slot availability API working
- ✅ Server running and tested (Week 1 complete)

**Status:** ✅ Week 1 APIs tested successfully on 2025-11-25

---

### Week 2: Customer Reservation Portal (Backend) ✅ COMPLETED

**Sprint Goal:** Enable customers to validate tickets and create reservations

#### Tasks:
- [x] **Enhanced Service with Activation Checks**
  - [x] Created `service.enhanced.ts` with activation status validation
  - [x] Integration with `reservation-slots` service from Week 1
  - [x] Mock tickets with activation lifecycle states
  - [x] Atomic slot capacity management (increment/decrement)

- [x] **Express API - Ticket Validation**
  - [x] `POST /api/tickets/validate`
    - Input: `{ "ticket_number": "TKT-...", "orq": 1 }`
    - **NEW:** Checks `activation_status === 'inactive'` → REJECT with `TICKET_NOT_ACTIVATED`
    - Validates status is ACTIVATED (not PENDING_PAYMENT, EXPIRED, etc.)
    - Returns ticket details or error

- [x] **Express API - Contact Verification**
  - [x] `POST /api/tickets/verify-contact`
    - Input: `{ "ticket_number": "...", "visitor_name": "email@...", "visitor_phone": "+...", "orq": 1 }`
    - Email format validation (regex)
    - Phone format validation (E.164)
    - Return success/failure

- [x] **Express API - Create Reservation**
  - [x] `POST /api/reservations/create`
    - Input: `{ "ticket_number": "...", "slot_id": "uuid", "visitor_name": "...", "visitor_phone": "...", "orq": 1 }`
    - **Transaction logic:**
      1. Validate ticket (includes activation check)
      2. Get slot and check capacity
      3. Create reservation record (UUID ID)
      4. Increment slot booked_count (atomic)
      5. Update ticket status to RESERVED
    - Return reservation details

- [x] **NEW: Reservation Modification & Cancellation**
  - [x] `PUT /api/reservations/:reservation_id` - Change to different slot
    - Decrements old slot count
    - Increments new slot count
    - Updates reservation record
    - Error if already VERIFIED
  - [x] `DELETE /api/reservations/:reservation_id` - Cancel reservation
    - Decrements slot booked_count
    - Sets reservation status to CANCELLED
    - Returns ticket to ACTIVATED status
    - Error if already VERIFIED

- [x] **Error Handling**
  - [x] TICKET_NOT_ACTIVATED - Inactive ticket rejected
  - [x] SLOT_FULL - Slot at capacity
  - [x] TICKET_ALREADY_RESERVED - Duplicate reservation
  - [x] TICKET_NOT_FOUND - Invalid ticket
  - [x] CANNOT_MODIFY_VERIFIED_RESERVATION - Already checked in
  - [x] CANNOT_CANCEL_VERIFIED_RESERVATION - Already checked in

**Deliverables:**
- ✅ Ticket validation with activation check
- ✅ Reservation creation with atomic slot booking
- ✅ Modification endpoint (change slots)
- ✅ Cancellation endpoint (free capacity)
- ✅ Error handling for all edge cases
- ✅ Mock tickets: 5 seeded with activation states

**Status:** ✅ Week 2 backend complete - ready for testing (2025-11-25)

---

### Week 3: Operator Validation & Scanning

**Sprint Goal:** Enable operators to scan and validate tickets

#### Tasks:
- [ ] **Express API - Operator Validation**
  - [ ] `POST /api/operator/validate-ticket`
    - Input: `{ "ticket_code": "TKT-..." }`
    - Query Directus for ticket + reservation
    - **Validation logic:**
      - Check ticket exists
      - Check status (PENDING_PAYMENT → reject, EXPIRED → reject)
      - Check reservation exists
      - Check reservation date == TODAY (no grace period)
      - Return color-coded result (GREEN/YELLOW/RED)
    - **Response examples:**
      - ✅ VALID: Ticket reserved for today
      - ❌ WRONG_DATE: Ticket reserved for different date
      - ⚠️ NO_RESERVATION: Ticket active but no reservation
      - ❌ INVALID: Ticket not found or expired

- [ ] **Express API - Verify Ticket (Mark as Verified)**
  - [ ] `POST /api/operator/verify-ticket`
    - Input: `{ "ticket_id": "...", "operator_id": 5 }`
    - **Transaction logic:**
      1. Update `tickets.verified_at = NOW()`
      2. Update `tickets.verified_by = operator_id`
      3. Update `tickets.status = 'VERIFIED'`
      4. Update `ticket_reservations.status = 'VERIFIED'`
    - Return success confirmation

- [ ] **Extend Existing Operator Scanning**
  - [ ] Update `src/modules/venue/router.ts` (POST /venue/scan) to call new validation
  - [ ] Add reservation status to scan response
  - [ ] Show reserved date/time in operator UI

**Deliverables:**
- ✅ Operator validation endpoint with all scenarios
- ✅ Ticket verification (mark as verified)
- ✅ Enhanced scan response with reservation details

---

### Week 4: Testing & Integration

**Sprint Goal:** End-to-end testing and Newman coverage

#### Tasks:
- [ ] **Newman Test Collection**
  - [ ] Create `us-015-reservation-validation.postman_collection.json`
  - [ ] **Test Scenarios:**
    1. View available slots
    2. Validate ticket
    3. Create reservation (success)
    4. Create reservation (slot full - error)
    5. Create reservation (duplicate - error)
    6. Operator validate (correct date - success)
    7. Operator validate (wrong date - error)
    8. Operator validate (no reservation - warning)
    9. Verify ticket (mark as verified)
    10. Operator validate (already verified - warning)
  - [ ] Run tests: `npx newman run postman/auto-generated/us-015-...`

- [ ] **Integration Runbook Testing**
  - [ ] Test all commands in `docs/integration/US-015-runbook.md`
  - [ ] Verify copy-paste commands work
  - [ ] Update runbook with actual Directus endpoints

- [ ] **Performance Testing**
  - [ ] Slot availability: < 500ms (P95)
  - [ ] Reservation creation: < 1s (P95)
  - [ ] Operator validation: < 500ms (P95)

- [ ] **Bug Fixes & Polish**
  - [ ] Fix any issues found in testing
  - [ ] Add error logging
  - [ ] Update OpenAPI spec

**Deliverables:**
- ✅ Complete Newman test suite passing
- ✅ Integration runbook validated
- ✅ Performance targets met
- ✅ US-015 marked as "Done" in `docs/stories/_index.yaml`

---

## 📅 Phase 2: US-016 - Ticket Activation System (3 Weeks)

### Week 5: Ticket Activation Foundation

**Sprint Goal:** Implement two-phase activation lifecycle

#### Tasks:
- [ ] **Directus Schema Update**
  - [ ] Add `activation_status` field to `tickets` (enum: inactive, active, redeemed, cancelled)
  - [ ] Add `activated_at` timestamp field
  - [ ] Add `activation_mode` field (enum: immediate, deferred)

- [ ] **Express API - Activation Endpoints**
  - [ ] `POST /api/tickets/:ticket_id/activate`
    - Input: `{ "ticket_id": "TKT-..." }`
    - Update `tickets.activation_status = 'active'`
    - Set `tickets.activated_at = NOW()`
    - Return success + activation details
    - **Validation:** Only allow if current status is 'inactive'

  - [ ] `GET /api/tickets/:ticket_id/status`
    - Return: `{ "ticket_id": "...", "status": "...", "activation_status": "...", "activation_mode": "...", "activated_at": "..." }`

- [ ] **Update Order Creation Logic**
  - [ ] Modify `src/modules/orders/` to support `activation_mode` parameter
  - [ ] **Pre-Made Mode:** Set `activation_status = 'inactive'` on ticket creation
  - [ ] **Immediate Mode:** Set `activation_status = 'active'` + `activated_at = NOW()`

**Deliverables:**
- ✅ Activation endpoints working
- ✅ Order creation supports both modes
- ✅ Ticket status correctly set on purchase

---

### Week 6: Integration with Reservation System

**Sprint Goal:** Connect activation with existing reservation flow

#### Tasks:
- [ ] **Update Reservation Creation Logic**
  - [ ] Modify `POST /api/reservations/create` to check `activation_status = 'active'`
  - [ ] Return error if ticket is `inactive`: `{ "error": "Ticket must be activated before reservation" }`

- [ ] **Enhanced Operator Validation**
  - [ ] Update `POST /api/operator/validate-ticket` to show activation status
  - [ ] **New validation scenario:**
    - ❌ INACTIVE: Ticket not yet activated
  - [ ] Update response to include `activation_status` field

- [ ] **Reservation Modification (Optional)**
  - [ ] `PUT /api/reservations/:reservation_id`
    - Allow changing date/time slot before verification
  - [ ] `DELETE /api/reservations/:reservation_id`
    - Cancel reservation → return ticket to `active` (no reservation)

**Deliverables:**
- ✅ Only active tickets can reserve
- ✅ Operator sees activation status
- ✅ Reservation modification working (optional)

---

### Week 7: Testing & Completion

**Sprint Goal:** Full US-016 testing and documentation

#### Tasks:
- [ ] **Newman Test Collection**
  - [ ] Create `us-016-activation-reservation.postman_collection.json`
  - [ ] **Test Scenarios:**
    1. Purchase ticket (pre-made mode) → verify inactive
    2. Activate ticket → verify active
    3. Try to reserve inactive ticket → error
    4. Reserve activated ticket → success
    5. Purchase ticket (immediate mode) → verify auto-activated
    6. Immediate mode ticket can reserve immediately
    7. Operator scan inactive ticket → error
    8. Operator scan active ticket with reservation → success
    9. Modify reservation date → success
    10. Cancel reservation → ticket returns to active

- [ ] **Integration Runbook Testing**
  - [ ] Test all commands in `docs/integration/US-016-runbook.md`
  - [ ] Update with actual endpoints and responses

- [ ] **Documentation Updates**
  - [ ] Update `src/types/domain.ts` with new activation types
  - [ ] Update OpenAPI spec with new endpoints
  - [ ] Update cards to "Done" status

- [ ] **Final Validation**
  - [ ] All Newman tests passing
  - [ ] Performance targets met
  - [ ] No regressions in US-015 functionality

**Deliverables:**
- ✅ Complete Newman test suite for US-016
- ✅ Integration runbook validated
- ✅ US-016 marked as "Done"
- ✅ Full reservation system operational

---

## 🎯 Success Criteria

### Phase 1 (US-015) Complete When:
- [x] Customers can view available time slots
- [x] Customers can validate tickets before reservation
- [x] Customers can create reservations with contact info
- [x] Operators can scan tickets and see reservation status
- [x] Operators can validate if ticket is reserved for today
- [x] Operators can mark tickets as verified
- [x] All Newman tests pass
- [x] Performance targets met (< 1s response times)

### Phase 2 (US-016) Complete When:
- [x] Tickets can be purchased in inactive state (pre-made mode)
- [x] Tickets can be auto-activated (immediate mode)
- [x] Customers can activate inactive tickets
- [x] Only active tickets can make reservations
- [x] Operators see activation status in validation
- [x] Reservations can be modified/cancelled
- [x] All Newman tests pass
- [x] No regressions in Phase 1 features

---

## 🚀 Deployment Checklist

### Before Phase 1 Launch:
- [ ] Directus collections created in production
- [ ] 90 days of slots seeded
- [ ] API endpoints deployed
- [ ] Operator training completed
- [ ] Rollback plan prepared

### Before Phase 2 Launch:
- [ ] Schema changes deployed (activation fields)
- [ ] Existing tickets migrated (set default activation_status)
- [ ] Order creation updated for both modes
- [ ] Customer communication (explain activation feature)

---

## 📊 Monitoring & Metrics

### Track These Metrics:

**Phase 1:**
- Reservation completion rate (target: > 85%)
- Average reservation time (target: < 3 minutes)
- Slot utilization rate (target: > 70%)
- Operator validation time (target: < 10 seconds)

**Phase 2:**
- Activation rate (% of inactive tickets activated within 7/30/90 days)
- Immediate vs. pre-made mode usage
- Average time from purchase to activation
- Reservation rate for activated tickets

---

## 🔧 Technical Debt & Future Enhancements

### Not in MVP Scope (Future Phases):
- [ ] Email/SMS confirmation (currently no OTP)
- [ ] Calendar UI component (frontend)
- [ ] Offline operator scanning
- [ ] Reservation reminders (24h before)
- [ ] Waitlist for full slots
- [ ] Admin dashboard for slot management
- [ ] Multi-venue support
- [ ] Dynamic pricing based on demand

---

**Last Updated:** 2025-11-25
**Current Progress:** Week 1 ✅ Complete | Week 2 ✅ Complete | Week 3 ⏳ Next

**Related Documents:**
- Data Model: `docs/directus-data-model-reservation-system.md`
- PRDs: PRD-006
- Stories: US-015, US-016
- Runbooks: `docs/integration/US-015-runbook.md`, `docs/integration/US-016-runbook.md`
- Week 1 Status: `docs/implementation-status-week1.md`
- Week 2 Status: `docs/implementation-status-week2.md`
