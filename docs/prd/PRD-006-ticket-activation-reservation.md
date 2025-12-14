# PRD-006: Ticket Activation and Time-Slot Reservation System

## Document Metadata
```yaml
prd_id: "PRD-006"
product_area: "Tickets & Fulfillment"
owner: "Product Manager"
status: "Draft"
created_date: "2025-11-14"
last_updated: "2025-11-14"
related_stories: ["US-016"]
implementation_cards: ["ticket-lifecycle-daemon", "reservation-slot-management", "operator-validation-scanner", "customer-reservation-portal"]
```

## Executive Summary

**Problem Statement**: Currently, tickets are issued immediately upon purchase and lack time-based reservation capabilities. Customers need flexibility to activate tickets later and reserve specific time slots for experiences that don't have inherent time constraints.

**Solution Overview**: Implement a two-phase ticket lifecycle system where tickets are purchased in an inactive state, can be activated by customers, and then reserved for specific date/time slots. Operators gain enhanced scanning capabilities to validate reservations at venues.

**Success Metrics**:
- Reservation utilization rate (target: >75% of activated tickets have reservations)
- No-show reduction through commitment mechanisms (target: 20% reduction)
- Operator validation efficiency (target: <3s per scan with reservation check)
- Customer satisfaction with flexible scheduling (target: 85% satisfaction rating)

**Timeline**: 3-week implementation (activation system → reservation UI → operator scanning)

## Business Context

### Market Opportunity
- **Market Need**: Flexible ticket management for experiences without fixed schedules
- **Customer Segments**:
  - **Primary**: Advance purchasers who want to commit to specific dates later
  - **Secondary**: Gift recipients who need to schedule their experience
  - **Tertiary**: Group organizers coordinating multiple attendees
- **Competitive Landscape**: Most ticketing systems require immediate time commitment at purchase
- **Business Impact**: Reduce no-shows, improve capacity planning, enhance customer flexibility

### Customer Research
- **User Personas**:
  - **Advance Planner**: Buys tickets weeks ahead, wants to lock in dates closer to travel
  - **Gift Giver/Receiver**: Purchases for others who schedule independently
  - **Spontaneous Traveler**: Buys immediately for same-day use (immediate mode)
  - **Group Coordinator**: Manages multiple tickets with shared reservation times

- **Pain Points**:
  - Forced commitment to specific dates at purchase time
  - No visibility into which tickets are reserved vs unreserved
  - Manual coordination for group reservations
  - Operator uncertainty about ticket validity for current day
  - No-shows from customers who forget their reservation dates

- **Validation**: Extends PRD-001 ticketing platform with lifecycle management

### Business Requirements
- **Operational Goals**:
  - Enable capacity planning through advance reservations
  - Reduce no-shows with commitment mechanisms
  - Improve operator efficiency at entry points
  - Support both immediate and deferred activation workflows
- **Revenue Goals**:
  - Increase advance sales through purchase-activate separation
  - Reduce revenue loss from no-shows and unreserved tickets
- **Customer Experience Goals**:
  - Flexibility to purchase now, schedule later
  - Clear reservation status visibility
  - Seamless operator validation experience

## Product Specification

### Core Features

#### 1. Ticket Activation System
**Description**: Two-mode ticket purchase supporting immediate and pre-made flows with activation lifecycle

**Business Value**:
- Enables advance sales without forced scheduling
- Supports gift ticket use cases
- Improves inventory predictability

**User Value**:
- Purchase flexibility (buy now, use later)
- Gift-friendly workflows
- Control over scheduling commitment

**Acceptance Criteria**:
- Tickets default to `inactive` status on purchase (pre-made mode)
- Immediate mode option activates tickets at purchase time
- Activation endpoint transitions tickets from `inactive` → `active`
- Only active tickets can make reservations
- Activation is permanent (cannot revert to inactive)

**Priority**: High

#### 2. Time-Slot Reservation Calendar
**Description**: Web-based calendar UI for selecting reservation date/time for activated tickets

**Business Value**:
- Capacity planning visibility
- Demand forecasting data
- No-show reduction through commitment

**User Value**:
- Visual date selection interface
- Clear availability indication
- Confirmation of reserved time slots

**Acceptance Criteria**:
- Calendar UI displays available dates for ticket usage
- User can select date (and optionally time slot) for reservation
- Support single-ticket and multi-ticket batch reservations
- Display reservation confirmation with date/time details
- Only activated tickets can be reserved
- Reservations can be modified before redemption date

**Priority**: High

#### 3. Enhanced Operator Scanning
**Description**: Operator device/mini-app with enhanced QR scanning showing reservation status

**Business Value**:
- Faster entry validation
- Reduced entry disputes
- Real-time capacity management

**User Value** (Operator):
- Clear reservation status display
- Date validation for current day
- Quick decision-making support

**Acceptance Criteria**:
- Operator login system for venue devices/mini-apps
- QR scan immediately displays ticket information including:
  - Activation status (active/inactive)
  - Reservation status (reserved/not reserved)
  - Reserved date (if applicable)
  - Validity check (is ticket valid for today?)
- Visual indicators for valid/invalid entry
- Support for offline caching with sync

**Priority**: High

#### 4. Reservation Validation Logic
**Description**: Backend validation rules for ticket entry based on reservation status

**Business Value**:
- Policy enforcement automation
- Audit trail for entry decisions
- Flexibility for business rule changes

**User Value** (Operator):
- Automated decision support
- Reduced training burden
- Clear validation feedback

**Acceptance Criteria**:
- **Scenario 1 - With Reservation**: Ticket entry only allowed on reserved date
- **Scenario 2 - Without Reservation**: Configurable policy (allow entry | require reservation)
- **Scenario 3 - Wrong Date**: Clear rejection message with reservation details
- **Scenario 4 - Inactive Ticket**: Reject with activation requirement message
- Validation rules configurable by product/venue
- Grace periods configurable (e.g., allow entry 1 day before/after)

**Priority**: High

## Business Rules & Logic

### Ticket Lifecycle States
```
PURCHASED (inactive) → ACTIVATED (active, no reservation) → RESERVED (active, with reservation) → REDEEMED (used)
```

**State Transition Rules**:
- **Purchase**: Defaults to `inactive` status (pre-made mode) or `active` (immediate mode)
- **Activation**: `inactive` → `active` (one-way, irreversible)
- **Reservation**: `active` + no reservation → `active` + reserved date
- **Redemption**: Validation checks reservation requirements before `redeemed` status

### Reservation Business Rules

**Reservation Creation**:
- Only activated tickets (`status=active`) can make reservations
- Reservations must be for future dates (cannot reserve past dates)
- Multiple tickets can be reserved together for same date/time
- Reservation time slots configurable per product (e.g., morning/afternoon/evening)

**Reservation Modification**:
- Reservations can be changed up until redemption
- Cancelling reservation returns ticket to `active` (no reservation) state
- Same-day reservation changes allowed with business rule configuration

**Reservation Validation**:
- Scan validation checks current date against reservation date
- Configurable grace periods (e.g., ±1 day flexible)
- Business rules per product/venue for unreserved ticket handling

### Purchase Mode Rules

**Immediate Mode** (E-commerce flow):
- Ticket activated automatically at purchase
- Customer can immediately make reservation
- Supports same-day purchase and use

**Pre-Made Mode** (Deferred activation):
- Ticket remains inactive after purchase
- Customer activates later via activation endpoint
- Useful for gift tickets, advance sales, bulk purchases

## Data Requirements

### New Data Structures

**Ticket Activation Tracking**:
```typescript
{
  ticket_id: string
  status: 'inactive' | 'active' | 'redeemed' | 'cancelled'
  activated_at: Date | null
  activation_mode: 'immediate' | 'deferred'
}
```

**Ticket Reservation**:
```typescript
{
  reservation_id: string
  ticket_id: string
  reserved_date: Date
  reserved_time_slot: 'morning' | 'afternoon' | 'evening' | 'full_day'
  created_at: Date
  modified_at: Date
  status: 'active' | 'cancelled'
}
```

**Operator Session Context**:
```typescript
{
  session_id: string
  operator_id: string
  venue_id: string
  device_type: 'scanner' | 'mini_app' | 'web'
  login_at: Date
}
```

### Database Schema Changes

**Tickets Table Enhancements**:
- Add `activation_status` column: ENUM('inactive', 'active', 'redeemed', 'cancelled')
- Add `activated_at` timestamp column
- Add `activation_mode` column: ENUM('immediate', 'deferred')

**New Reservations Table**:
```sql
CREATE TABLE ticket_reservations (
  reservation_id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL,
  reserved_date DATE NOT NULL,
  reserved_time_slot ENUM('morning', 'afternoon', 'evening', 'full_day'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'cancelled') DEFAULT 'active',
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
  INDEX idx_ticket_reservation (ticket_id, status),
  INDEX idx_date_lookup (reserved_date, status)
);
```

## User Flows

### Consumer Flow 1: Pre-Made Ticket with Reservation

```
1. Purchase tickets (status=inactive)
   ↓
2. Receive order confirmation with activation instructions
   ↓
3. Customer activates tickets (inactive → active)
   ↓
4. Customer accesses reservation calendar
   ↓
5. Select date and time slot
   ↓
6. Confirm reservation (active + reservation created)
   ↓
7. Receive reservation confirmation
   ↓
8. On reservation date: arrive at venue
   ↓
9. Operator scans QR code
   ↓
10. System validates: active? reserved? correct date?
   ↓
11. Allow entry (status → redeemed)
```

### Consumer Flow 2: Immediate Mode (E-commerce)

```
1. Purchase tickets (status=active automatically)
   ↓
2. Immediately make reservation (optional) or use same-day
   ↓
3. Arrive at venue
   ↓
4. Operator scans and validates
   ↓
5. Allow entry
```

### Operator Flow: Enhanced Scanning

```
1. Operator logs into scanning device/mini-app
   ↓
2. Customer presents QR code
   ↓
3. Scan QR code
   ↓
4. System displays:
   - Ticket activation status
   - Reservation status
   - Reserved date (if applicable)
   - Validation result (valid for today? yes/no)
   ↓
5. Operator decision:
   - GREEN: Valid for today → allow entry
   - YELLOW: No reservation but policy allows → allow entry
   - RED: Wrong date or inactive → deny entry
   ↓
6. System logs entry decision
```

## Technical Implementation

### API Endpoints

**Ticket Validation**:
- `POST /api/tickets/validate` - Validate ticket eligibility for reservation
  - Request: `{ticket_code: string, orq: number}`
  - Response: `{success: boolean, valid: boolean, ticket?: {...}, error?: string}`

**Contact Verification**:
- `POST /api/tickets/verify-contact` - Verify customer contact information
  - Request: `{ticket_code: string, orq: number}`
  - Response: `{success: boolean, message?: string, error?: string}`

**Reservation Slots**:
- `GET /api/reservation-slots/available` - Get available time slots for month
  - Query: `?month=2025-11&orq=12&venueId=1`
  - Response: Array of slots grouped by date with capacity status

**Reservation Management**:
- `POST /api/reservations/create` - Create reservation for ticket and slot
  - Request: `{ticket_code: string, slot_id: string, orq: number, customer_email?: string, customer_phone?: string}`
  - Response: `{success: boolean, data?: {...}, error?: string}`
- `PUT /api/reservations/:reservation_id` - Modify reservation (change slot)
  - Request: `{new_slot_id: string}`
- `DELETE /api/reservations/:reservation_id` - Cancel reservation

**Operator Validation** (Future Phase):
- `POST /api/operator/validate-ticket` - Validate ticket for venue entry
- `POST /api/operator/verify-ticket` - Mark ticket as verified

### Frontend Components

**Consumer Web Interface**:
- Ticket activation page
- Reservation calendar component
- Reservation management dashboard
- My reservations view

**Operator Mini-App/Device Interface**:
- Operator login screen
- QR scanner interface with camera access
- Validation result display (color-coded)
- Scan history and session management

## Success Metrics & KPIs

### Business Metrics
- **Activation Rate**: % of inactive tickets activated within 7/30/90 days
- **Reservation Rate**: % of active tickets with reservations
- **No-Show Rate**: % of reservations where customer doesn't arrive
- **Same-Day Usage**: % of immediate mode vs pre-made mode usage
- **Operator Efficiency**: Average scan-to-decision time

### Product Metrics
- **API Performance**:
  - Activation endpoint: <1s response
  - Reservation creation: <2s response
  - Scan validation: <1s response (critical path)
- **User Engagement**:
  - Calendar interaction rate
  - Reservation modification frequency
  - Average days between purchase and reservation

### Operational Metrics
- **Entry Validation**:
  - Rejection rate by reason (inactive, wrong date, no reservation)
  - Appeal/override frequency
  - Operator decision accuracy
- **System Reliability**:
  - Offline scan capability uptime
  - Reservation sync success rate

## Risk Assessment

### Technical Risks
- **Offline Scanning**: Operators need cached validation rules
  - **Mitigation**: Implement offline-first architecture with periodic sync
- **Reservation Conflicts**: Double-booking or capacity management
  - **Mitigation**: Real-time inventory checks with reservation quotas
- **Calendar UX Complexity**: Date selection can be confusing
  - **Mitigation**: Clear availability indicators, helpful error messages

### Business Risks
- **Customer Confusion**: Two-mode system may confuse customers
  - **Mitigation**: Clear purchase flow indicators, activation reminders
- **No-Show Management**: Reservations don't guarantee attendance
  - **Mitigation**: Cancellation policies, overbooking strategies, reminders
- **Operator Training**: Enhanced scanning requires new workflows
  - **Mitigation**: Simple color-coded UI, training materials, gradual rollout

### Operational Risks
- **Policy Enforcement**: Business rules may need frequent adjustments
  - **Mitigation**: Configurable validation rules, admin interface for rule management
- **Peak Capacity**: Popular dates may have reservation conflicts
  - **Mitigation**: Waitlist system, alternative date suggestions, dynamic capacity

## Phased Implementation

### Phase 1: Activation System (Week 1)
- Backend activation endpoint
- Database schema changes
- Activation status tracking
- Basic activation UI

### Phase 2: Reservation Calendar (Week 2)
- Calendar UI component
- Reservation creation/modification APIs
- Availability checking logic
- Reservation confirmation flow

### Phase 3: Enhanced Scanning (Week 3)
- Operator interface updates
- Reservation validation logic
- Color-coded validation results
- Scan history and logging

### Phase 4: Optimization (Future)
- Offline scanning capabilities
- Advanced capacity management
- Automated reminders
- Analytics dashboard

## Related Documents
- PRD-001: Cruise Package Ticketing Platform (base ticketing system)
- PRD-003: Event Venue Operations Platform (operator scanning foundation)
- Technical cards: ticket-activation, time-slot-reservation, reservation-validation-scanning

---

**Document Status**: Draft - Ready for Review
**Next Steps**: Review with stakeholders → Create user stories → Define technical cards
