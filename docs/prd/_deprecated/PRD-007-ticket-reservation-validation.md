# PRD-007: Ticket Reservation & Validation System

## Document Metadata
```yaml
prd_id: "PRD-007"
category: "core"
product_area: "Tickets & Operations"
owner: "Product Manager"
status: "Deprecated"
version: "2.0"
created_date: "2025-11-14"
last_updated: "2025-12-19"
deprecated_at: "2025-12-19"
deprecated_reason: "功能与 PRD-006 重叠 90%+，合并以统一票务预约系统"
merged_into: "PRD-006"
related_stories: ["US-015"]
implementation_cards: ["reservation-slot-management", "customer-reservation-portal", "operator-validation-scanner"]
```

> **DEPRECATED**: 本 PRD 已合并到 [PRD-006](./PRD-006-ticket-activation-reservation.md)。
> PRD-006 统一管理票务激活和预约功能，避免功能重叠。

## 1. Executive Summary

### Problem Statement
Customers who purchase tickets have no ability to select specific date/time slots for venue visits. Venues lack capacity management tools and on-site validation mechanisms to verify tickets for correct dates.

### Solution Overview
Implement a **Ticket Reservation and Validation System** with three key components:
1. **Customer Reservation Portal**: Web-based calendar interface for selecting date/time slots
2. **Slot Capacity Management**: Pre-configured time slots with capacity limits (e.g., 200 per slot)
3. **Operator Validation App**: QR code scanning interface for on-site ticket verification

### Success Metrics
| Metric | Target |
|--------|--------|
| Reservation Completion Rate | > 85% |
| Average Reservation Time | < 3 minutes |
| Average Validation Time | < 10 seconds |
| Validation Accuracy | > 99% |
| Slot Utilization Rate | > 70% |
| System Uptime | > 99.5% |

### Timeline
- **Sprint 1-2**: Database & API + Customer UI
- **Sprint 3**: Operator App
- **Sprint 4**: Testing & Production Deployment

---

## 2. Business Context

### Current State
Customers purchase tickets through two flows:
1. **Immediate Purchase (E-commerce)**: Direct purchase with payment
2. **Pre-made Tickets**: Batch-generated tickets distributed to customers

**Problems:**
- Purchased tickets have no time/date concept
- Venues cannot manage capacity across time slots
- No validation mechanism at venue entry points

### Market Opportunity
- **Customer Need**: Flexibility to select visit times after purchase
- **Venue Need**: Capacity management to prevent overcrowding
- **Operator Need**: Quick, reliable ticket validation at entry points

### Competitive Landscape
Most ticketing systems force date/time commitment at purchase. This solution decouples purchase from reservation, providing superior flexibility.

---

## 3. User Personas

### Customer
Has purchased ticket(s) via e-commerce or received pre-made ticket.
- **Goals**: Select date/time, get confirmation, show proof at venue
- **Pain Points**: Forced commitment at purchase, uncertainty about capacity

### Venue Operator
Works at venue entrance.
- **Goals**: Quickly validate tickets, verify correct date/time, prevent unauthorized entry
- **Pain Points**: Manual processes, unclear validity, no real-time access

### Admin (Future Phase)
Manages venue operations.
- **Goals**: Configure capacity, view analytics, handle support issues

---

## 4. Core Capabilities

### 4.1 Ticket Lifecycle
```
PENDING_PAYMENT → ACTIVATED → RESERVED → VERIFIED
                                  ↓
                              EXPIRED
```

| Status | Description |
|--------|-------------|
| `PENDING_PAYMENT` | Order created, awaiting payment |
| `ACTIVATED` | Payment confirmed, ready for reservation |
| `RESERVED` | Customer has selected time slot |
| `VERIFIED` | Operator validated at venue |
| `EXPIRED` | Past validity period |

### 4.2 Customer Reservation
- Enter ticket code (URL parameter or manual entry)
- Provide contact information (email, phone)
- Select date from calendar with availability indicators
- Select time slot with capacity status
- Confirm and receive QR code

### 4.3 Operator Validation
- Scan QR code or manual entry
- Color-coded validation results:
  - **Green**: Valid ticket for today → Allow entry
  - **Yellow**: Warning (wrong date, no reservation) → Operator discretion
  - **Red**: Invalid ticket → Deny entry
- Mark ticket as verified

---

## 5. Business Rules

### Reservation Rules
1. **One Ticket = One Reservation**: Each ticket can only have one active reservation
2. **Capacity Management**: Slot capacity is hard limit, no overbooking
3. **No Modification (MVP)**: Cancellation/changes in Phase 2

### Validation Rules
1. **Date Matching**: Reservation date must match current date
2. **Status Checks**: Only `RESERVED` tickets can be verified
3. **Duplicate Scanning**: Shows warning but allows re-verification

### Multi-Ticket Handling
- Each ticket reserved individually
- Can reserve multiple tickets for same or different slots

---

## 6. Future Enhancements

### Phase 2
- Reservation modification/cancellation
- Multi-venue support
- Admin dashboard

### Phase 3
- Mobile app
- Push notifications
- Waitlist system

### Phase 4
- Analytics dashboard
- CRM integration
- AI capacity optimization

---

## 7. Open Questions

| Question | Options | Status |
|----------|---------|--------|
| Email/SMS OTP verification? | A: Full OTP, B: Format validation only | MVP: Option B |
| Operator hardware? | Tablet, smartphone, dedicated scanner | Pending |
| Slot auto-generation? | Manual, auto-generate, database seeds | MVP: Database seeds |

---

## 8. Dependencies

### External Services
- **Email**: SendGrid / AWS SES
- **SMS**: Twilio (optional)
- **QR Generation**: qrcode.js

### Technology Stack
- Backend: Node.js + Express + TypeScript
- Database: MySQL (3 new tables)
- Frontend: Next.js
- Calendar UI: react-big-calendar

---

## Technical Specifications

> **Note**: Detailed technical specifications have been moved to implementation cards per documentation standards.

| Specification | Card Reference |
|---------------|----------------|
| Database Schema | `reservation-slot-management` |
| Customer API Endpoints | `customer-reservation-portal` |
| Operator API Endpoints | `operator-validation-scanner` |
| UI Wireframes | Story US-015 |

---

**Document Control:**
- **Version**: 2.0 (Slimmed per DOCUMENT-SPEC standards)
- **Previous Version**: 1.0 (1383 lines) → 2.0 (~200 lines)
