# Implementation Decisions: Reservation System

**Date:** 2025-11-25
**Based on:** Customer requirements clarification

---

## ✅ Confirmed Decisions

### 1. **Ticket Storage & Creation**
- ✅ **Current State:** OTA tickets stored in Directus already
- ✅ **Activation Default:** All new tickets remain `inactive` until customer activates
- ✅ **Migration:** Existing tickets need status update (to be planned)

**Action:** Integrate with existing Directus ticket collection

---

### 2. **Multi-Venue Support**
- ✅ **Requirement:** Multiple venues supported
- ✅ **Implementation:** `venue_id` field is REQUIRED (not nullable)
- ✅ **Capacity:** Each venue has independent slot pools

**Example:**
```javascript
// Venue A - Capacity 200
{ venue_id: 1, date: '2025-12-01', start_time: '09:00', total_capacity: 200 }

// Venue B - Capacity 150 (different venue, independent pool)
{ venue_id: 2, date: '2025-12-01', start_time: '09:00', total_capacity: 150 }
```

**Action:** Add `venue_id` to all slot queries and reservations

---

### 3. **Slot Management**
- ✅ **Who Creates Slots:** Operators manage capacity via operator dashboard
- ✅ **Creation Method:** Manual creation (not auto-generated 90 days)
- ✅ **Time Slot Flexibility:** Operators define time ranges per venue

**Action:** Build operator endpoints for slot CRUD operations

---

### 4. **Operator Interface**
- ✅ **Primary:** Web app for tablets/phones
- ✅ **Secondary:** QR scanner hardware with API integration
- ✅ **Authentication:** Existing operator login (US-002)

**Action:** Build responsive web UI + headless API for hardware scanners

---

### 5. **Customer Frontend**
- ✅ **Framework:** Next.js (already built by customer)
- ✅ **Our Scope:** Provide Express API endpoints only
- ✅ **Integration:** Customer's Next.js app calls our API

**Action:** Focus on API development, provide OpenAPI spec for frontend team

---

### 6. **Notifications**
- ✅ **Current State:** Email/phone collected, display on-screen only
- ✅ **Target State:** Send email confirmations for reservations
- ✅ **Email Service:** To be configured (SendGrid/AWS SES)

**Email Scenarios:**
1. Reservation created → Send confirmation with QR code
2. Reservation modified → Send updated details
3. Reservation cancelled → Send cancellation confirmation

**Action:** Add email notification endpoints (optional for MVP, required for Phase 2)

---

### 7. **Express Integration Architecture**
- ✅ **Keep Dual Mode:** Mock + Directus (USE_DATABASE flag)
- ✅ **Directus Access:** Use Directus SDK for database mode
- ✅ **Mock Data:** Create mock slot/reservation data for development

**Implementation:**
```typescript
class ReservationService {
  async getSlots(date: string) {
    if (USE_DATABASE) {
      return await directus.items('reservation_slots').readMany({ ... });
    } else {
      return MOCK_SLOTS; // For rapid development
    }
  }
}
```

**Action:** Maintain dual-mode architecture for all new features

---

### 8. **QR Code Handling**
- ✅ **Keep Current System:** QR codes unchanged
- ✅ **Validation Logic:** Fetch reservation during scan
- ✅ **No Regeneration:** Existing QR tokens remain valid

**Scan Flow:**
```
1. Operator scans QR code
2. Extract ticket_code from JWT
3. Query Directus for ticket + reservation
4. Validate reservation date == today
5. Display result (GREEN/RED/YELLOW)
```

**Action:** Extend existing `/venue/scan` endpoint with reservation checks

---

### 9. **Grace Period**
- ✅ **No Grace Period:** Strict date matching
- ✅ **Date Only:** No time-of-day checking within same day
- ✅ **Rule:** Ticket reserved for Dec 1 → ONLY valid on Dec 1

**Validation:**
```javascript
if (reservation.date !== currentDate) {
  return { status: 'WRONG_DATE', message: 'Ticket reserved for different date' };
}
// Time-of-day doesn't matter (9am reservation can scan at 5pm same day)
```

**Action:** Implement strict date-only validation

---

### 10. **Admin Dashboard**
- ✅ **Current State:** Basic demo dashboard exists (`src/demo/dashboard.html`)
- ✅ **New Requirements:**
  - Manually create/close slots
  - View all reservations for specific date
  - Search reservations by email/phone
  - Export reservation reports (CSV/Excel)

**Action:** Extend existing dashboard with reservation management features

---

### 11. **Business Rules (Conflicts)**

**Inactive Ticket + Reservation Attempt:**
- ✅ **Decision:** Reject with error "Must activate first" (Option A)
- ❌ Not allowed: Auto-activate or allow anyway

**Slot 95% Full:**
- ✅ **Decision:** Show warning but allow booking (Option A)
- ❌ No reserved capacity for walk-ins

**Action:** Implement strict activation requirement, allow booking until 100% full

---

## 📋 Updated Implementation Priorities

### **Phase 1A: Core Reservation System (Weeks 1-2)**

**Week 1: Directus Setup + Operator Slot Management**
1. Create Directus collections with **venue_id as required**
2. Build operator slot management API:
   - `POST /api/operator/slots/create` - Create new slot
   - `PUT /api/operator/slots/:id` - Update slot capacity
   - `DELETE /api/operator/slots/:id` - Close/delete slot
   - `GET /api/operator/slots` - List all slots (filtered by venue)
3. Extend admin dashboard with slot management UI

**Week 2: Customer Reservation API**
1. Build reservation endpoints (dual-mode)
2. Implement strict business rules:
   - Check `activation_status = 'active'` before allowing reservation
   - Reject if inactive with clear error message
3. Email notification preparation (optional for MVP)

---

### **Phase 1B: Operator Validation (Weeks 3-4)**

**Week 3: Validation API + Web Interface**
1. Extend `/venue/scan` with reservation validation
2. Build operator web UI (responsive for tablets)
3. Multi-venue support in validation

**Week 4: Testing + Hardware Integration**
1. Newman test suite (comprehensive scenarios - see below)
2. QR scanner hardware API endpoints
3. Admin dashboard enhancements

---

### **Phase 2: Ticket Activation (Weeks 5-7)**
- Same as original plan
- Focus on activation workflow

---

## 🧪 Comprehensive Test Scenarios

### **Category 1: Slot Management (Operator)**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| SM-01 | Create slot for Venue A, Dec 1, 09:00-12:00, capacity 200 | Success, slot created |
| SM-02 | Create duplicate slot (same venue, date, time) | Error: "Slot already exists" |
| SM-03 | Create slot for Venue B, same date/time as Venue A | Success (different venues) |
| SM-04 | Update slot capacity from 200 to 150 (10 bookings exist) | Success, new capacity 150 |
| SM-05 | Update slot capacity from 200 to 5 (10 bookings exist) | Error: "Cannot reduce below booked count" |
| SM-06 | Close slot (set status to CLOSED) | Success, no new reservations allowed |
| SM-07 | Delete slot with 0 bookings | Success, slot deleted |
| SM-08 | Delete slot with 10 bookings | Error: "Cannot delete slot with reservations" |
| SM-09 | View all slots for Venue A (filter by venue_id) | Returns only Venue A slots |
| SM-10 | Create slot for past date (Nov 1, 2025) | Error: "Cannot create slots for past dates" |

---

### **Category 2: Customer Reservation**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| CR-01 | Reserve active ticket for available slot | Success, booked_count incremented |
| CR-02 | Reserve inactive ticket | Error: "Ticket must be activated first" |
| CR-03 | Reserve already-reserved ticket | Error: "Ticket already reserved" |
| CR-04 | Reserve slot at 100% capacity | Error: "Slot full" |
| CR-05 | Reserve slot at 95% capacity (warning scenario) | Success with warning "Limited availability" |
| CR-06 | Reserve slot for wrong venue | Success (if ticket valid for that venue) |
| CR-07 | Reserve past date slot | Error: "Cannot reserve past dates" |
| CR-08 | Concurrent reservation (2 customers, last slot) | One succeeds, one fails with "Slot full" |
| CR-09 | Reserve without customer email | Error: "Email required" |
| CR-10 | Reserve without customer phone | Error: "Phone required" |
| CR-11 | Reserve with invalid email format | Error: "Invalid email format" |
| CR-12 | Modify reservation to different date | Success, old slot count--, new slot count++ |
| CR-13 | Cancel reservation | Success, slot booked_count decremented |

---

### **Category 3: Operator Validation (Scanning)**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| OV-01 | Scan active ticket with reservation for TODAY | ✅ GREEN: "Valid ticket" |
| OV-02 | Scan active ticket with reservation for TOMORROW | ❌ RED: "Wrong date, reserved for Dec 2" |
| OV-03 | Scan active ticket with NO reservation | ⚠️ YELLOW: "No reservation" (allow per business rule) |
| OV-04 | Scan inactive ticket | ❌ RED: "Ticket not activated" |
| OV-05 | Scan already-verified ticket | ⚠️ YELLOW: "Already verified at 9:30 AM" |
| OV-06 | Scan expired ticket | ❌ RED: "Ticket expired" |
| OV-07 | Scan invalid ticket code | ❌ RED: "Invalid ticket" |
| OV-08 | Scan ticket for different venue | ❌ RED: "Wrong venue" (if venue-specific scanning) |
| OV-09 | Mark ticket as verified | Success, ticket status → VERIFIED |
| OV-10 | Scan ticket reserved for yesterday | ❌ RED: "Reservation expired" |

---

### **Category 4: Multi-Venue Support**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| MV-01 | Create slot for Venue A | Success |
| MV-02 | Create slot for Venue B (same date/time) | Success (independent pools) |
| MV-03 | Reserve ticket for Venue A slot | Success |
| MV-04 | Query slots for Venue A only | Returns only Venue A slots |
| MV-05 | Query reservations for Venue B | Returns only Venue B reservations |
| MV-06 | Operator at Venue A scans Venue B ticket | Configurable: Allow or deny |

---

### **Category 5: Admin Dashboard**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| AD-01 | View all reservations for Dec 1, 2025 | List of all reservations on that date |
| AD-02 | Search reservations by email "john@example.com" | Returns all reservations for that email |
| AD-03 | Search reservations by phone "+12025551234" | Returns all reservations for that phone |
| AD-04 | Export reservations for Dec 1 as CSV | CSV file downloaded |
| AD-05 | Export reservations for Dec 1 as Excel | Excel file downloaded |
| AD-06 | Manually close slot for Dec 25 (holiday) | Slot status → CLOSED, no new reservations |
| AD-07 | View slot utilization report (booked/capacity %) | Chart/table showing utilization |

---

### **Category 6: Email Notifications (Phase 2)**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| EN-01 | Create reservation | Email sent with reservation details + QR code |
| EN-02 | Modify reservation | Email sent with updated details |
| EN-03 | Cancel reservation | Email sent confirming cancellation |
| EN-04 | Email delivery failure | Log error, continue reservation process |

---

### **Category 7: Dual-Mode Architecture**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| DM-01 | Reserve slot with USE_DATABASE=false | Uses mock data, success |
| DM-02 | Reserve slot with USE_DATABASE=true | Uses Directus, success |
| DM-03 | Scan ticket with USE_DATABASE=false | Uses mock validation |
| DM-04 | Scan ticket with USE_DATABASE=true | Uses Directus validation |
| DM-05 | Switch modes mid-operation | No data corruption, graceful handling |

---

### **Category 8: Edge Cases & Error Handling**

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| EC-01 | Network timeout during reservation | Rollback transaction, show error |
| EC-02 | Database connection lost mid-transaction | Rollback, data consistency maintained |
| EC-03 | Slot deleted while customer reserving | Error: "Slot no longer available" |
| EC-04 | Ticket deleted while operator scanning | Error: "Ticket not found" |
| EC-05 | Reservation created at exact midnight | Correctly assigned to new date |
| EC-06 | Time zone handling (slot in UTC, scan in local time) | Correct date matching |
| EC-07 | Extremely long email/phone (> 255 chars) | Error: "Field too long" |
| EC-08 | SQL injection attempt in search fields | Query sanitized, no injection |

---

## 📊 Test Coverage Summary

**Total Test Cases:** 60+

**Coverage:**
- ✅ Slot Management: 10 tests
- ✅ Customer Reservation: 13 tests
- ✅ Operator Validation: 10 tests
- ✅ Multi-Venue: 6 tests
- ✅ Admin Dashboard: 7 tests
- ✅ Email Notifications: 4 tests
- ✅ Dual-Mode: 5 tests
- ✅ Edge Cases: 8 tests

**Test Types:**
- Unit tests: Business logic validation
- Integration tests: API endpoint testing (Newman)
- E2E tests: Complete user workflows
- Concurrency tests: Race condition handling
- Error handling: Edge cases and failures

---

## 🚀 Next Steps

1. ✅ **Update Directus data model** with venue_id as required field
2. ✅ **Add operator slot management API** to implementation roadmap
3. ✅ **Create Newman test collections** with all 60+ test cases
4. ✅ **Add admin dashboard specs** for reservation management
5. ✅ **Email notification design** (optional for MVP)

---

**Last Updated:** 2025-11-25
**Status:** Ready for implementation Week 1
