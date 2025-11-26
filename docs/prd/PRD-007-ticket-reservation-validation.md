# PRD-007: Ticket Reservation & Validation System

## Document Metadata
```yaml
prd_id: "PRD-007"
product_area: "Tickets & Operations"
owner: "Product Manager"
status: "Draft"
version: "1.0"
created_date: "2025-11-14"
last_updated: "2025-11-14"
related_stories: ["US-015"]
implementation_cards: ["ticket-reservation-slots", "customer-reservation-portal", "operator-validation-scanner"]
```

## 1. Executive Summary

### Problem Statement
Customers who purchase tickets have no ability to select specific date/time slots for venue visits. Venues lack capacity management tools and on-site validation mechanisms to verify tickets for correct dates.

### Solution Overview
Implement a **Ticket Reservation and Validation System** with three key components:
1. **Customer Reservation Portal**: Web-based calendar interface for selecting date/time slots
2. **Slot Capacity Management**: Pre-configured time slots with capacity limits (e.g., 200 per slot)
3. **Operator Validation App**: QR code scanning interface for on-site ticket verification

### Success Metrics
- **Reservation Completion Rate:** > 85%
- **Average Reservation Time:** < 3 minutes
- **Average Validation Time:** < 10 seconds
- **Validation Accuracy:** > 99%
- **Slot Utilization Rate:** > 70%
- **System Uptime:** > 99.5%

### Timeline
- **Sprint 1-2 (Weeks 1-4)**: Database & API + Customer UI
- **Sprint 3 (Week 5)**: Operator App
- **Sprint 4 (Week 6)**: Testing & Production Deployment

---

## 2. Business Context

### Current State
Customers purchase tickets through two flows:
1. **Immediate Purchase (E-commerce)**: Direct purchase with payment
2. **Pre-made Tickets**: Batch-generated tickets distributed to customers

**Problem:**
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

### 3.1 Customer
**Profile**: Has purchased ticket(s) via e-commerce or received pre-made ticket

**Goals:**
- Select specific date/time for venue visit
- Get confirmation of reservation
- Show proof at venue

**Pain Points:**
- Forced commitment to dates at purchase time
- Uncertainty about venue capacity
- No clear validation process

### 3.2 Venue Operator
**Profile**: Works at venue entrance

**Goals:**
- Quickly validate tickets
- Verify correct date/time
- Prevent unauthorized entry

**Pain Points:**
- Manual validation processes
- Unclear ticket validity
- No real-time system access

### 3.3 Admin (Future Phase)
**Profile**: Manages venue operations

**Goals:**
- Configure slot capacity
- View booking analytics
- Handle customer support issues

---

## 4. Functional Requirements

### 4.1 Ticket Lifecycle & Status

```
PENDING_PAYMENT → (payment) → ACTIVATED → (reservation) → RESERVED → (scan) → VERIFIED
                                                              ↓
                                                          EXPIRED
```

#### Ticket Status Definitions

| Status | Description | Business Rule |
|--------|-------------|---------------|
| `PENDING_PAYMENT` | Order created, awaiting payment | Cannot be reserved |
| `ACTIVATED` | Payment confirmed, ready for reservation | Can make reservation |
| `RESERVED` | Customer has selected time slot | Can be validated on reserved date |
| `VERIFIED` | Operator scanned and validated at venue | Entry allowed, cannot be reused |
| `EXPIRED` | Ticket past validity period or slot time | Cannot be validated |

**Key Transitions:**
- `PENDING_PAYMENT` → `ACTIVATED`: Payment confirmation
- `ACTIVATED` → `RESERVED`: Customer creates reservation
- `RESERVED` → `VERIFIED`: Operator validates at venue
- `RESERVED` → `EXPIRED`: Slot end_time passed without verification

---

### 4.2 Customer Reservation Flow

#### 4.2.1 Ticket Entry

**Access Methods:**
- **URL Parameter**: `/reserve?ticket=TICKET_CODE_123`
- **Manual Entry**: Input field on `/reserve` page

**Validation Logic:**
```
1. Check ticket exists in database
2. Validate status is ACTIVATED (not already reserved, verified, or expired)
3. Verify ticket belongs to valid order
4. Return ticket details or error
```

**Error States:**

| Error Code | User Message |
|------------|--------------|
| `TICKET_NOT_FOUND` | "Invalid ticket code. Please check and try again." |
| `TICKET_ALREADY_RESERVED` | "This ticket is already reserved for [date]." |
| `TICKET_NOT_ACTIVATED` | "This ticket is not activated yet. Please complete payment." |
| `TICKET_EXPIRED` | "This ticket has expired." |

---

#### 4.2.2 Contact Information Collection

**Required Fields:**
- **Email address** (format validation: RFC 5322)
- **Phone number** (international format: E.164)

**Validation Options:**

**Option A (Recommended)**: Email/SMS OTP verification
- Send 6-digit OTP to email and phone
- Verify within 5 minutes
- Max 3 retry attempts

**Option B (MVP)**: Simple format validation without OTP
- Regex validation only
- No verification code required
- Faster user flow

**Business Rules:**
- Email/phone stored with ticket
- Used for reservation confirmation
- Used for customer service contact
- No duplicate email/phone validation (same email can have multiple tickets)

---

#### 4.2.3 Calendar & Slot Selection

**Calendar View Requirements:**

**Monthly Calendar Display:**
- Show current month by default
- Navigate between months (±3 months range)
- Date highlighting:
  - **Green border**: Dates with available slots
  - **Yellow border**: Dates with limited slots (<50% capacity)
  - **Grayed out**: Dates with no slots or full slots
  - **Blue highlight**: Selected date
- Past dates disabled (cannot reserve past dates)

**Slot Selection Panel:**

Display for each slot on selected date:
```
┌─────────────────────────────────┐
│ 🕐 12:00 PM - 2:00 PM          │
│                                 │
│ 150/200 available               │
│ ✅ Available                    │
│                                 │
│ [Select This Slot]  button      │
└─────────────────────────────────┘
```

**Capacity Status Logic:**

| Status | Condition | Badge Color | Button State |
|--------|-----------|-------------|--------------|
| Available | > 50% capacity | Green | Enabled |
| Limited | 10-50% capacity | Yellow | Enabled |
| Full | 0% capacity | Red | Disabled |

**Real-Time Capacity:**
- Query database for current `booked_count` on slot selection
- Optimistic locking during reservation creation
- Show "Slot full" error if capacity reached between view and submit

---

#### 4.2.4 Confirmation Flow

**Confirmation Page Display:**
```
┌─────────────────────────────────────┐
│ 📋 Reservation Summary              │
├─────────────────────────────────────┤
│ Ticket: TKT-2025-ABC123-DEF456     │
│                                     │
│ 📅 Date: November 14, 2025         │
│ 🕐 Time: 12:00 PM - 2:00 PM        │
│                                     │
│ 📧 Email: john@example.com         │
│ 📱 Phone: +1 202-555-1234          │
│                                     │
│ [← Go Back]  [Confirm Reservation] │
└─────────────────────────────────────┘
```

**Confirmation Actions:**
1. Show full reservation details
2. Require explicit "Confirm" action
3. Process reservation creation via API
4. Handle success/error states
5. Send confirmation email/SMS

---

#### 4.2.5 Success Page

**Success Page Display:**
```
┌─────────────────────────────────────┐
│        ✅ Reservation Confirmed!    │
├─────────────────────────────────────┤
│ Your ticket is reserved for:        │
│                                     │
│ 📅 November 14, 2025               │
│ 🕐 12:00 PM - 2:00 PM              │
│                                     │
│ Confirmation sent to:               │
│ 📧 john@example.com                │
│ 📱 +1 202-555-1234                 │
│                                     │
│ [Display of QR Code]                │
│                                     │
│ [Download QR Code]                  │
│ [Add to Calendar]                   │
└─────────────────────────────────────┘
```

**Success Actions:**
- Display QR code (generated from ticket_code)
- Download QR code as PNG
- Add to calendar (iCal file download)
- Email confirmation with QR code attachment

---

### 4.3 Operator Validation Flow

#### 4.3.1 Authentication

**Access Control:**
- **Route**: `/operator/login`
- **Method**: Simple PIN or username/password
- **Session**: JWT-based with 8-hour expiration
- **Role**: `OPERATOR`

**Alternative:** Use existing multi-org auth system with operator role assignment

**Security Requirements:**
- IP whitelist (optional for venue)
- Rate limiting: 5 failed attempts → 15 min lockout
- Session timeout: 8 hours idle

---

#### 4.3.2 Scanning Interface

**Route**: `/operator/scan`

**Input Methods:**
1. **QR Code Scanner**: Camera access for QR scanning
2. **Manual Entry**: Fallback text input for ticket code

**Scanning Process:**
```
1. Operator clicks "Scan QR Code"
2. Camera activates
3. QR code detected → Extract ticket_code
4. Call validation API
5. Display validation result
```

**Performance Requirement:**
- Target response time: < 500ms from scan to result display
- Offline mode: Cache recent validations (future phase)

---

#### 4.3.3 Validation Results Display

**Validation Logic:**
```
1. Scan ticket code
2. Lookup ticket in database
3. Check ticket status
4. Check reservation date matches TODAY
5. Display color-coded result
```

**Success State (Valid Ticket):**
```
┌─────────────────────────────────────┐
│        ✅ VALID TICKET              │
├─────────────────────────────────────┤
│ Ticket: TICKET_CODE_123             │
│ Customer: John Doe                  │
│ Email: john@example.com             │
│ Phone: +1234567890                  │
│                                     │
│ Reservation:                        │
│ 📅 Date: 2025-11-14                │
│ 🕐 Time: 12:00 PM - 2:00 PM        │
│ 🎫 Slot: 150/200 booked            │
│                                     │
│ [Mark as Verified]                  │
└─────────────────────────────────────┘
```

**Error State 1: Wrong Date**
```
┌─────────────────────────────────────┐
│        ❌ WRONG DATE                │
├─────────────────────────────────────┤
│ This ticket is reserved for:        │
│ 📅 2025-11-20 (6 days from now)    │
│                                     │
│ Not valid for today (2025-11-14)    │
│                                     │
│ [Scan Again]                        │
└─────────────────────────────────────┘
```

**Error State 2: No Reservation**
```
┌─────────────────────────────────────┐
│        ⚠️ NO RESERVATION            │
├─────────────────────────────────────┤
│ Ticket: TICKET_CODE_123             │
│ Status: ACTIVATED                   │
│                                     │
│ This ticket has no reservation.     │
│ Customer must book a time slot.     │
│                                     │
│ [Scan Again]                        │
└─────────────────────────────────────┘
```

**Error State 3: Invalid Ticket**
```
┌─────────────────────────────────────┐
│        ❌ INVALID TICKET            │
├─────────────────────────────────────┤
│ Ticket code not found or expired.   │
│                                     │
│ [Scan Again]                        │
└─────────────────────────────────────┘
```

**Error State 4: Already Verified**
```
┌─────────────────────────────────────┐
│        ⚠️ ALREADY VERIFIED          │
├─────────────────────────────────────┤
│ This ticket was verified at:        │
│ 🕐 2025-11-14 09:30 AM             │
│ Operator: Jane Smith                │
│                                     │
│ [Scan Again]                        │
└─────────────────────────────────────┘
```

**Color Coding:**
- **Green**: Valid ticket → Allow entry
- **Red**: Invalid/Wrong date → Deny entry
- **Yellow**: Warning (no reservation, already verified) → Operator discretion

---

#### 4.3.4 Mark as Verified

**Verification Action:**
1. Operator clicks "Mark as Verified" button
2. API call: `POST /api/operator/verify-ticket`
3. Update ticket status to `VERIFIED`
4. Record verification metadata:
   - `verified_at`: Current timestamp
   - `verified_by`: Operator user ID
5. Update reservation status to `VERIFIED`
6. Show success confirmation
7. Return to scan mode

**Transaction Safety:**
- Use database transaction to prevent duplicate verification
- Row-level locking on ticket record
- Idempotent: Repeat verification shows warning but doesn't fail

---

### 4.4 Slot Management (Future - Admin Dashboard)

**Not in MVP Scope:**
- Create/edit time slots via admin UI
- Set capacity limits per slot
- View booking statistics
- Export reservation reports
- Bulk slot generation

**Manual Setup for MVP:**
- Database seeds or SQL scripts to create initial slots
- Fixed capacity (e.g., 200 per slot)
- Slots created for 90 days in advance

---

## 5. Database Schema

### 5.1 Table: `tickets`

```sql
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  order_id INT NOT NULL,
  status ENUM('PENDING_PAYMENT', 'ACTIVATED', 'RESERVED', 'VERIFIED', 'EXPIRED') DEFAULT 'PENDING_PAYMENT',
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  product_id INT NOT NULL,
  orq INT NOT NULL COMMENT 'Organization ID',
  qr_code TEXT COMMENT 'Base64 QR code image',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP NULL,
  reserved_at TIMESTAMP NULL,
  verified_at TIMESTAMP NULL,
  verified_by INT NULL COMMENT 'Operator user ID',
  INDEX idx_ticket_code (ticket_code),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_orq (orq),
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Field Descriptions:**
- `ticket_code`: Unique identifier (UUID or secure random string, min 16 chars)
- `status`: Current lifecycle state
- `customer_email`, `customer_phone`: Collected during reservation
- `qr_code`: Optional base64-encoded QR code image
- `verified_by`: Links to operator user who validated the ticket

---

### 5.2 Table: `reservation_slots`

```sql
CREATE TABLE reservation_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue_id INT NULL COMMENT 'Future: multi-venue support',
  total_capacity INT NOT NULL DEFAULT 200,
  booked_count INT NOT NULL DEFAULT 0,
  available_count INT AS (total_capacity - booked_count) STORED,
  status ENUM('ACTIVE', 'FULL', 'CLOSED') DEFAULT 'ACTIVE',
  orq INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_orq (orq),
  INDEX idx_status (status),
  UNIQUE KEY unique_slot (date, start_time, orq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Field Descriptions:**
- `date`: Slot date (YYYY-MM-DD)
- `start_time`, `end_time`: Time range for slot (e.g., 12:00:00 - 14:00:00)
- `total_capacity`: Maximum reservations allowed
- `booked_count`: Current number of reservations
- `available_count`: Computed column (total - booked)
- `status`: `ACTIVE` (bookable), `FULL` (at capacity), `CLOSED` (admin disabled)

**Auto-Status Update:**
- When `booked_count >= total_capacity`, status → `FULL`

---

### 5.3 Table: `ticket_reservations`

```sql
CREATE TABLE ticket_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  slot_id INT NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('RESERVED', 'CANCELLED', 'VERIFIED') DEFAULT 'RESERVED',
  orq INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_slot_id (slot_id),
  INDEX idx_orq (orq),
  UNIQUE KEY unique_ticket_reservation (ticket_id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES reservation_slots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Field Descriptions:**
- `ticket_id`: Foreign key to tickets (one-to-one relationship)
- `slot_id`: Foreign key to reservation_slots
- `customer_email`, `customer_phone`: Contact info from reservation form
- `status`: `RESERVED` (active), `CANCELLED` (future: cancellation support), `VERIFIED` (ticket validated)

**Constraints:**
- `UNIQUE KEY unique_ticket_reservation (ticket_id)`: Prevents double-booking same ticket
- Cascade delete: If ticket deleted, reservation also deleted

---

## 6. API Endpoints

### 6.1 Customer Reservation API

#### `POST /api/tickets/validate`
**Purpose:** Validate ticket code before reservation

**Request:**
```json
{
  "ticket_code": "TKT-2025-ABC123-DEF456",
  "orq": 12
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_id": 123,
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "status": "ACTIVATED",
    "product_id": 5,
    "order_id": 456
  }
}
```

**Note:** Current implementation returns minimal ticket data. Future enhancement may include `product_name`, `expires_at`, `customer_email`, `customer_phone`.

**Response (Error - 400):**
```json
{
  "success": false,
  "error": {
    "code": "TICKET_ALREADY_RESERVED",
    "message": "This ticket is already reserved for 2025-12-01.",
    "reserved_date": "2025-12-01"
  }
}
```

**Error Codes:**
- `TICKET_NOT_FOUND`: Ticket doesn't exist
- `TICKET_NOT_ACTIVATED`: Status is not ACTIVATED (must complete payment)
- `TICKET_ALREADY_RESERVED`: Ticket is already reserved (includes `reserved_date` field)
- `TICKET_EXPIRED`: Ticket past expiration date

---

#### `POST /api/tickets/verify-contact`
**Purpose:** Verify customer contact information exists on ticket

**Request:**
```json
{
  "ticket_code": "TKT-2024-001",
  "orq": 12
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Contact information verified"
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid customer email in ticket"
}
```

**Implementation:**
- MVP: Simple validation of email and phone format on ticket record
- No OTP verification in current version
- Phase 2: Add OTP with Twilio (SMS) + SendGrid (email)

---

#### `GET /api/reservation-slots/available`
**Purpose:** Get available slots for calendar display

**Query Parameters:**
- `month`: YYYY-MM (optional, default: current month)
- `orq`: Organization ID (required)

**Request Example:**
```
GET /api/reservation-slots/available?month=2025-11&orq=1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-25",
      "slots": [
        {
          "id": 1,
          "start_time": "09:00:00",
          "end_time": "12:00:00",
          "total_capacity": 200,
          "available_count": 200,
          "capacity_status": "AVAILABLE",
          "status": "ACTIVE"
        },
        {
          "id": 2,
          "start_time": "14:00:00",
          "end_time": "17:00:00",
          "total_capacity": 200,
          "available_count": null,
          "capacity_status": "FULL",
          "status": "ACTIVE"
        }
      ]
    },
    {
      "date": "2025-11-26",
      "slots": [
        {
          "id": 4,
          "start_time": "09:00:00",
          "end_time": "12:00:00",
          "total_capacity": 200,
          "available_count": 0,
          "capacity_status": "FULL",
          "status": "ACTIVE"
        }
      ]
    }
  ]
}
```

**Response Structure:**
- Grouped by `date` (YYYY-MM-DD format)
- Each date contains array of `slots`
- `available_count` can be `null` when slot is marked FULL
- `capacity_status`: "AVAILABLE" (>50% free), "LIMITED" (10-50% free), or "FULL" (0% free)

**Capacity Status Logic:**
- `AVAILABLE`: available_count > 50% of total_capacity
- `LIMITED`: available_count between 10-50%
- `FULL`: available_count = 0

---

#### `POST /api/reservations/create`
**Purpose:** Create reservation for ticket

**Request:**
```json
{
  "ticket_code": "TKT-2024-001",
  "slot_id": "8",
  "orq": 12,
  "customer_email": "asim@gmail.com",
  "customer_phone": "51532233"
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "data": {
    "reservation_id": "39",
    "ticket_code": "TKT-2024-001",
    "slot_id": 8,
    "slot_date": "2025-12-01",
    "slot_time": "09:00-12:00",
    "customer_email": "asim@gmail.com",
    "customer_phone": "51532233",
    "status": "RESERVED",
    "created_at": "2025-11-26T10:30:00Z"
  }
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "SLOT_FULL",
    "message": "This slot is full. Please select an alternative slot.",
    "alternative_slots": [
      {
        "slot_id": 9,
        "date": "2025-12-01",
        "start_time": "14:00:00"
      }
    ]
  }
}
```

**Additional Error Codes:**
- `TICKET_NOT_FOUND`: Ticket doesn't exist
- `TICKET_NOT_ACTIVATED`: Only activated tickets can make reservations
- `SLOT_NOT_FOUND`: Slot doesn't exist
- `TICKET_ALREADY_RESERVED`: Ticket already has an active reservation

**Notes:**
- `customer_email` and `customer_phone` are optional; if not provided, they will be fetched from the ticket
- If provided, these values will UPDATE the ticket's customer contact information

**Transaction Logic:**
```sql
BEGIN TRANSACTION;
  -- Lock slot row
  SELECT booked_count, total_capacity FROM reservation_slots WHERE id = ? FOR UPDATE;

  -- Check capacity
  IF booked_count >= total_capacity THEN
    ROLLBACK;
    RETURN ERROR "SLOT_FULL";
  END IF;

  -- Create reservation
  INSERT INTO ticket_reservations (ticket_id, slot_id, customer_email, customer_phone) VALUES (?, ?, ?, ?);

  -- Update ticket status
  UPDATE tickets SET status = 'RESERVED', reserved_at = NOW(), customer_email = ?, customer_phone = ? WHERE id = ?;

  -- Increment slot booked_count
  UPDATE reservation_slots SET booked_count = booked_count + 1 WHERE id = ?;

COMMIT;
```

---

### 6.2 Operator Validation API

#### `POST /operators/validate-ticket`
**Purpose:** Validate ticket for venue entry (color-coded result)

**Request:**
```json
{
  "ticket_code": "TKT-2025-ABC123-DEF456",
  "operator_id": "OP-101",
  "terminal_id": "TERM-01",
  "orq": 12
}
```

**Response (GREEN - Valid for Today - 200 OK):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "status": "RESERVED",
    "color_code": "GREEN",
    "message": "Valid reservation - Allow entry",
    "details": {
      "customer_email": "john@example.com",
      "slot_date": "2025-11-14",
      "slot_time": "09:00-12:00",
      "product_name": "General Admission"
    },
    "allow_entry": true
  }
}
```


**Response (YELLOW - Wrong Date - 200 OK):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "status": "RESERVED",
    "color_code": "YELLOW",
    "message": "Warning: Reservation is for 2025-11-20, not today",
    "details": {
      "customer_email": "john@example.com",
      "slot_date": "2025-11-20",
      "slot_time": "09:00-12:00",
      "product_name": "General Admission"
    },
    "allow_entry": false
  }
}
```

**Response (YELLOW - No Reservation - 200 OK):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "status": "ACTIVATED",
    "color_code": "YELLOW",
    "message": "Warning: No reservation found for this ticket",
    "details": {
      "customer_email": "N/A",
      "slot_date": "N/A",
      "slot_time": "N/A",
      "product_name": "General Admission"
    },
    "allow_entry": false
  }
}
```

**Note:** Status reflects actual ticket status (ACTIVATED), not "RESERVED" when no reservation exists.

**Response (RED - Invalid Ticket - 200 OK):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_code": "INVALID-CODE",
    "status": "INVALID",
    "color_code": "RED",
    "message": "Invalid ticket - Deny entry",
    "details": {
      "customer_email": "N/A",
      "slot_date": "N/A",
      "slot_time": "N/A",
      "product_name": "N/A"
    },
    "allow_entry": false
  }
}
```

**Response (RED - Not Reserved - 200 OK):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "status": "ACTIVATED",
    "color_code": "RED",
    "message": "Ticket not reserved - Deny entry",
    "details": {
      "customer_email": "N/A",
      "slot_date": "N/A",
      "slot_time": "N/A",
      "product_name": "General Admission"
    },
    "allow_entry": false
  }
}
```

**Validation Logic (Correct Implementation):**
```
1. Query ticket by ticket_code
2. Check ticket exists → Error: TICKET_NOT_FOUND (RED)
3. Check if ticket status is RESERVED:
   - If status !== 'RESERVED' → Error: TICKET_NOT_RESERVED (RED)
   - This means PENDING_PAYMENT, ACTIVATED, VERIFIED, EXPIRED all get RED
4. Query reservation by ticket_code
5. Check if reservation exists:
   - If NO reservation → Error: NO_RESERVATION (RED, should not happen)
6. Check if reservation.date == CURRENT_DATE:
   - If NO → Warning: WRONG_DATE (YELLOW)
   - If YES → Return VALID (GREEN)
```

**Business Rule:** Only tickets with status=RESERVED are allowed for venue entry validation. This ensures:
- Customers must complete the reservation process before visiting
- Operators can rely on reservation system for capacity management
- Walk-ins without reservations are denied (ACTIVATED status = no reservation yet)
- VERIFIED tickets have already entered (prevent re-entry)

**Operator Flow:**
1. Customer arrives with QR code (ticket status: RESERVED)
2. Operator scans QR → calls `POST /operators/validate-ticket`
3. System returns GREEN/YELLOW/RED based on reservation date
4. If valid, operator clicks "Allow Entry" → calls `POST /operators/verify-ticket`
5. System updates ticket status to VERIFIED and records entry time
6. Customer enters venue

**Implementation Notes (2025-11-26):**
- ✅ **slot_date**: Fetched from `reservation_slots` table via `slot_id`
- ✅ **slot_time**: Fetched from `reservation_slots` table (format: `start_time-end_time`)
- ⚠️  **product_name**: Currently shows "Unknown Product" due to Directus permissions on `products` collection
  - Code implementation ready: `getProduct(productId)` method exists in `src/utils/directus.ts:299-325`
  - Requires: Read permissions on `products` collection for API token
- ⚠️  **verified_by**: Field is sent to Directus but not persisted
  - Code correctly sends `verified_by: operator_id` in PATCH request
  - Issue: Field may not exist in Directus `tickets` table schema or lacks write permissions
  - `verified_at` field works correctly (timestamp is updated)

---

#### `POST /operators/verify-ticket`
**Purpose:** Mark ticket as verified (operator decision: ALLOW/DENY)

**Request:**
```json
{
  "ticket_code": "TKT-2025-ABC123-DEF456",
  "operator_id": "OP-101",
  "terminal_id": "TERM-01",
  "validation_decision": "ALLOW",
  "orq": 12
}
```

**Response (ALLOW - Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "verification_status": "VERIFIED",
    "verified_at": "2025-11-14T09:30:00.000Z",
    "operator_id": "OP-101",
    "terminal_id": "TERM-01"
  }
}
```

**Response (DENY - Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_code": "TKT-2025-ABC123-DEF456",
    "verification_status": "DENIED",
    "verified_at": "2025-11-14T09:30:00.000Z",
    "operator_id": "OP-101",
    "terminal_id": "TERM-01"
  }
}
```

**Transaction Logic:**
```sql
BEGIN TRANSACTION;
  UPDATE tickets
  SET status = 'VERIFIED', verified_at = NOW(), verified_by = ?
  WHERE id = ? AND status = 'RESERVED';

  UPDATE ticket_reservations
  SET status = 'VERIFIED'
  WHERE ticket_id = ?;
COMMIT;
```

---

## 7. Business Rules

### 7.1 Reservation Rules

**Rule 1: One Ticket = One Reservation**
- Each ticket can only have one active reservation
- Database constraint: `UNIQUE KEY unique_ticket_reservation (ticket_id)`
- Cannot reserve same ticket for multiple slots

**Rule 2: Capacity Management**
- Slot capacity is hard limit (e.g., 200)
- No overbooking allowed
- Real-time capacity checking during reservation via row-level locking

**Rule 3: Reservation Modification**
- **MVP**: No modification/cancellation supported
- **Future Phase 2**: Allow changes up to 24 hours before slot

**Rule 4: Expiration**
- Reservations expire after slot `end_time` passes
- Tickets expire based on product-specific rules
- Status transition: `RESERVED` → `EXPIRED` (automated job)

### 7.2 Validation Rules

**Rule 1: Date Matching**
- Ticket reservation date must match current date
- Operator sees clear error if dates don't match
- No grace period (strict date enforcement)

**Rule 2: Status Checks**
- Only `RESERVED` tickets can be verified
- `VERIFIED` tickets show warning (already entered) but don't block re-scan
- `ACTIVATED` tickets show "NO_RESERVATION" error

**Rule 3: Duplicate Scanning**
- System tracks `verified_at` timestamp
- Shows warning message with timestamp and operator name
- Does not prevent re-verification (idempotent operation)

### 7.3 Multi-Ticket Handling

**Scenario:** Customer purchases 3 tickets

**Behavior:**
- Customer receives 3 separate ticket codes
- Must reserve each ticket individually (3 reservations)
- Can reserve all for same slot (if capacity allows)
- Can reserve for different slots (flexible)

**Example:**
- Ticket 1: Reserved for Nov 14, 12:00 PM
- Ticket 2: Reserved for Nov 14, 12:00 PM (same slot)
- Ticket 3: Reserved for Nov 15, 2:00 PM (different slot)

---

## 8. Technical Considerations

### 8.1 Performance Requirements

**Calendar Loading:**
- Fetch slots for ±3 months from current month
- Cache slot availability data (5 min TTL)
- Lazy load: Only fetch slots when user navigates to month

**QR Scanning:**
- Target: < 500ms validation response time (P95)
- Database query optimization with proper indexes
- Future: Offline mode with cached validations

**API Response Times (P95):**
- Ticket validation: < 300ms
- Slot availability: < 500ms
- Reservation creation: < 1s
- Operator validation: < 500ms

### 8.2 Security

**Ticket Code Generation:**
- Format: `TKT-YYYY-XXXXXX-XXXXXX`
- Use UUIDs or secure random strings
- Minimum 16 characters (excluding prefix)
- Include checksum for validation

**Operator Authentication:**
- JWT tokens with 8-hour expiration
- IP whitelist (optional for venue security)
- Role-based access control: `OPERATOR` role
- Rate limiting: 5 failed login attempts → 15 min lockout

**API Rate Limiting:**
- Reservation API: 10 requests/minute per IP
- Validation API: 100 requests/minute per operator
- DDoS protection via API gateway

### 8.3 Error Handling

**Concurrent Booking Prevention:**
```sql
-- Use database transactions with row-level locking
BEGIN TRANSACTION;
  SELECT booked_count FROM reservation_slots WHERE id = ? FOR UPDATE;
  -- Check capacity
  -- Insert reservation
  -- Update counts
COMMIT;
```

**Network Failure Handling:**
- **Operator App**: Queue failed verifications locally, sync when online
- **Customer App**: Show retry button with exponential backoff

**Race Condition Prevention:**
- Row-level locking on `reservation_slots` during capacity check
- Unique constraint on `ticket_reservations.ticket_id`
- Optimistic locking with version field (future enhancement)

### 8.4 Monitoring & Observability

**Key Metrics:**
- Reservation conversion rate: (reservations created / tickets validated)
- Slot utilization percentage: (booked_count / total_capacity) by slot
- Average validation time: Time from scan to verification
- Failed validation reasons: Group by error code

**Logging Events:**
- `ticket.validated` - {ticket_id, status, timestamp}
- `reservation.created` - {ticket_id, slot_id, timestamp}
- `ticket.verified` - {ticket_id, operator_id, timestamp}
- `reservation.failed` - {ticket_id, slot_id, reason}

**Alerts:**
- High reservation failure rate (>10% in 15 min)
- Slot utilization >90% (capacity warning)
- API response time >1s P95
- Authentication failures spike

---

## 9. Future Enhancements

### Phase 2 (Post-MVP)
- **Reservation Modification**: Allow date/time changes up to 24h before slot
- **Reservation Cancellation**: Free up capacity when customer cancels
- **Multi-Venue Support**: Different venues with separate slot configurations
- **Admin Dashboard**: Slot management UI, analytics, reporting
- **Bulk Ticket Import**: CSV upload for pre-made tickets

### Phase 3
- **Mobile App**: React Native app for customers and operators
- **Push Notifications**: Reservation reminders (24h before, 2h before)
- **Waitlist System**: Queue for full slots, notify when capacity opens
- **Dynamic Pricing**: Adjust ticket prices based on demand/utilization

### Phase 4
- **Analytics Dashboard**: Utilization trends, revenue forecasting
- **Customer Feedback**: Post-visit surveys, ratings
- **CRM Integration**: Sync customer data with marketing platform
- **AI Capacity Optimization**: Predict demand, suggest slot additions

---

## 10. Implementation Plan

### Sprint 1 (Week 1-2): Database & API
- [ ] Create database tables: `tickets`, `reservation_slots`, `ticket_reservations`
- [ ] Implement API endpoints:
  - [ ] `POST /api/tickets/validate`
  - [ ] `POST /api/tickets/verify-contact`
  - [ ] `GET /api/reservation-slots/available`
  - [ ] `POST /api/reservations/create`
  - [ ] `POST /operators/validate-ticket`
  - [ ] `POST /operators/verify-ticket`
- [ ] Database seeding: Create initial slots for 90 days
- [ ] Unit tests for all endpoints

### Sprint 2 (Week 3-4): Customer UI
- [ ] Build `/reserve` page with ticket entry
- [ ] Build contact collection form
- [ ] Build calendar component (react-big-calendar)
- [ ] Build slot selection UI with capacity indicators
- [ ] Build confirmation flow
- [ ] Build success page with QR code display
- [ ] Email confirmation integration (SendGrid)
- [ ] End-to-end testing for customer flow

### Sprint 3 (Week 5): Operator App
- [ ] Build `/operator/login` page
- [ ] Build `/operator/scan` interface
- [ ] Integrate QR scanner library (html5-qrcode)
- [ ] Build validation results UI (color-coded states)
- [ ] Build verification flow
- [ ] Manual ticket entry fallback
- [ ] Test with real QR codes on mobile devices

### Sprint 4 (Week 6): Testing & Production
- [ ] Load testing (concurrent reservations)
- [ ] Security audit (API rate limiting, authentication)
- [ ] Performance optimization (database indexes, caching)
- [ ] Documentation (API docs, operator manual)
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Post-launch monitoring

---

## 11. Success Criteria

### Customer Experience
- ✅ Reservation completion rate > 85%
- ✅ Average reservation time < 3 minutes
- ✅ Customer support tickets < 5% of total reservations

### Operational Efficiency
- ✅ Average validation time < 10 seconds per ticket
- ✅ Validation accuracy > 99%
- ✅ Slot utilization rate > 70%

### Technical Performance
- ✅ API response time (P95) < 500ms
- ✅ System uptime > 99.5%
- ✅ Error rate < 1%

---

## 12. Open Questions & Decisions

### 1. Email/SMS Verification
**Question**: Should we implement OTP verification in MVP?

**Options:**
- **A**: Full OTP verification (more secure, better UX)
- **B**: Simple format validation (faster implementation, MVP)

**Decision**: [Pending stakeholder input]

---

### 2. Operator Hardware
**Question**: What devices will operators use?

**Options:**
- Tablets (iPad, Android)
- Smartphones (iPhone, Android)
- Dedicated QR scanners

**Decision**: [Pending - impacts camera quality requirements]

---

### 3. Slot Configuration
**Question**: Should slots be manually created by admins or auto-generated?

**Options:**
- **A**: Manual creation via admin UI (more control)
- **B**: Auto-generate based on business hours + interval (faster setup)
- **C**: Database seeds/SQL scripts (MVP workaround)

**Decision**: [Pending - option C for MVP, option A for Phase 2]

---

### 4. Multi-Organization Support
**Question**: Should reservation slots be org-specific from day 1?

**Options:**
- **A**: Yes - add `orq` filtering everywhere (future-proof)
- **B**: No - add in Phase 2 when multi-tenant needed

**Decision**: [Pending - recommend Option A for scalability]

---

### 5. Ticket Generation Timing
**Question**: When should tickets be created?

**Options:**
- **A**: On order creation (immediate)
- **B**: On payment confirmation (standard)
- **C**: Separate ticket generation flow (batch processing)

**Decision**: [Pending - recommend Option B aligned with existing flow]

---

## 13. Dependencies

### External Services
- **Email**: SendGrid / AWS SES (confirmation emails)
- **SMS**: Twilio (optional OTP verification)
- **QR Code Generation**: qrcode.js or similar library
- **Payment Gateway**: Already integrated (existing system)

### Technology Stack
- **Backend**: Node.js + Express + TypeScript (existing)
- **Database**: MySQL (existing, add 3 new tables)
- **Frontend**: Next.js (existing)
- **Calendar UI**: react-big-calendar or similar
- **QR Scanner**: html5-qrcode or react-qr-reader

---

## Appendix: Sample Data

### Sample Ticket
```json
{
  "id": 123,
  "ticket_code": "TKT-2025-ABC123-DEF456",
  "order_id": 456,
  "status": "RESERVED",
  "customer_email": "john.doe@example.com",
  "customer_phone": "+12025551234",
  "product_id": 5,
  "orq": 1,
  "created_at": "2025-11-10T10:00:00Z",
  "activated_at": "2025-11-10T10:05:00Z",
  "reserved_at": "2025-11-12T14:30:00Z",
  "verified_at": null,
  "verified_by": null
}
```

### Sample Reservation Slot
```json
{
  "id": 10,
  "date": "2025-11-14",
  "start_time": "12:00:00",
  "end_time": "14:00:00",
  "venue_id": null,
  "total_capacity": 200,
  "booked_count": 150,
  "available_count": 50,
  "status": "ACTIVE",
  "orq": 1,
  "created_at": "2025-11-01T00:00:00Z"
}
```

### Sample Reservation
```json
{
  "id": 789,
  "ticket_id": 123,
  "slot_id": 10,
  "customer_email": "john.doe@example.com",
  "customer_phone": "+12025551234",
  "reserved_at": "2025-11-12T14:30:00Z",
  "status": "RESERVED",
  "orq": 1,
  "created_at": "2025-11-12T14:30:00Z"
}
```

---

**Document Control:**
- **Version**: 1.0
- **Status**: Draft
- **Author**: Product Team
- **Next Review**: [TBD]
- **Approval**: [Pending]
