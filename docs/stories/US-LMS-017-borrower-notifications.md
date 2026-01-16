---
id: US-LMS-017
title: "Borrower Communication Preferences & Notifications"
owner: Product
status: "Draft"
priority: Medium
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-001", "US-LMS-005"]
enhances: ["US-LMS-005"]
cards: []
---

# US-LMS-017: Borrower Communication Preferences & Notifications

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As a** Borrower
**I want to** manage my communication preferences and receive timely notifications
**So that** I stay informed about my loan through my preferred channels and never miss important updates

---

## Scope

### In Scope
- Communication preference management (email, SMS, push, mail)
- Notification subscription by category
- Payment reminders and due date alerts
- Account status notifications
- Promotional communication opt-in/out
- Quiet hours configuration
- Notification history

### Out of Scope
- WhatsApp/Messenger integration (Phase 2)
- Voice notifications (Phase 2)
- Multi-language notifications (Phase 2)
- Real-time push for mobile app (Phase 2 - web only)

---

## Acceptance Criteria

### A. Set Communication Preferences
- **Given** borrower accesses account settings
- **When** updating communication preferences
- **Then** borrower can select preferred channels for:
  - Payment reminders: Email, SMS, or Both
  - Account alerts: Email, SMS, or Both
  - Marketing: Opt-in or Opt-out (default: opt-out)
- **And** can set quiet hours for non-urgent messages (e.g., 9PM-9AM)
- **And** preferences saved immediately

### B. Payment Reminder
- **Given** borrower's payment due date is 3 days away
- **When** reminder job runs (daily at 9AM)
- **Then** system sends reminder via borrower's preferred channel
- **And** reminder includes:
  - Amount due
  - Due date
  - Payment link (one-click)
  - Current payoff amount
- **And** reminder sent again at 1 day before if not paid

### C. Payment Confirmation
- **Given** borrower makes a payment
- **When** payment is processed successfully
- **Then** system immediately sends confirmation via preferred channel
- **And** confirmation includes:
  - Confirmation number
  - Amount paid
  - New balance
  - Next due date

### D. Delinquency Alert
- **Given** borrower's payment is 1 day past due
- **When** delinquency check runs
- **Then** system sends urgent notification via ALL available channels
- **And** notification includes:
  - Amount past due
  - Late fee warning (amount and when applied)
  - Payment options (online, phone, mail)
  - Contact information for assistance

### E. Account Status Notifications
- **Given** significant account event occurs
- **When** event is processed
- **Then** system sends notification for:
  - Loan approval/denial
  - Disbursement complete
  - Rate change (if variable)
  - Loan payoff
  - Autopay enrollment/changes
- **And** notification sent via preferred channel

### F. Quiet Hours
- **Given** borrower has set quiet hours (e.g., 9PM-9AM)
- **When** non-urgent notification is triggered during quiet hours
- **Then** notification is queued until quiet hours end
- **And** urgent notifications (payment past due, fraud) still sent immediately

### G. Notification History
- **Given** borrower wants to view past notifications
- **When** accessing notification center in portal
- **Then** system shows last 90 days of notifications
- **And** shows delivery status (sent, delivered, failed)
- **And** allows re-send of failed notifications

### H. Unsubscribe
- **Given** borrower receives marketing email/SMS
- **When** borrower clicks unsubscribe
- **Then** preference is updated within 10 business days
- **And** confirmation sent to borrower
- **And** borrower removed from marketing lists
- **And** required notifications (payment due, delinquency) continue

---

## Business Rules

1. **Required Notifications (Cannot Opt Out)**
   - Payment due reminders (regulatory requirement)
   - Past due notices
   - Rate change notices
   - Adverse action notices
   - Annual privacy notice

2. **Notification Timing**
   - Payment reminder: 7 days, 3 days, 1 day before due
   - Past due: 1, 5, 15, 30 days after due
   - Confirmation: Immediate (within 60 seconds)

3. **Channel Priority**
   - If both email and SMS selected, send to both
   - If delivery fails on one, do not auto-fallback (respect preference)
   - Postal mail for regulatory notices only

4. **SMS Compliance (TCPA)**
   - Explicit consent required for SMS
   - Include opt-out instructions in every SMS
   - Track consent timestamp
   - Honor opt-out within 10 days

5. **Email Compliance (CAN-SPAM)**
   - Include physical address
   - Clear unsubscribe mechanism
   - Honor opt-out within 10 business days
   - Accurate subject lines

6. **Quiet Hours Default**
   - Default: None (notifications sent anytime)
   - Recommended: 9PM - 9AM local time
   - Applies to: Marketing, general alerts
   - Exempt: Past due, fraud, security

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Notification preference service |
| TBD | Draft | SMS gateway integration |
| TBD | Draft | Email service |
| TBD | Draft | Notification scheduler |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-005 | Borrower receives notifications through preferred channels |

---

## Non-Functional Requirements

- SMS delivery within 60 seconds
- Email delivery within 5 minutes
- TCPA compliance for SMS (consent tracking)
- CAN-SPAM compliance for email
- Unsubscribe processing within 10 business days
- Notification history retention: 7 years
- Support 1M+ notifications per day
