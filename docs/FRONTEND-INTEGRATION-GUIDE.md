# Frontend Integration Guide: Ticket Reservation & Operator Validation APIs

## Document Overview
This guide provides complete API documentation for frontend teams to integrate the ticket reservation and operator validation system (PRD-006 Week 1-3 implementation).

**Last Updated:** 2025-11-25
**API Version:** 1.0

## 🌐 **Base URLs**

**Express Backend API (Your main integration point):**
- **Development**: `http://localhost:8080`
- **Production**: `https://express-jdpny.ondigitalocean.app`

**⚠️ Important - Frontend Should Call Express Backend, NOT Directus Directly**

**Directus CMS (Backend use only - DO NOT call from frontend):**
- Instance: `https://dudu-derp-cxk5g.ondigitalocean.app/`
- Mode: Production ready with `USE_DIRECTUS=true`
- Access: Secured via backend API token (not exposed to frontend)

---

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Week 1: Operator Slot Management APIs](#week-1-operator-slot-management)
3. [Week 2: Customer Reservation APIs](#week-2-customer-reservation)
4. [Week 3: Operator Validation APIs](#week-3-operator-validation)
5. [Complete User Flows](#complete-user-flows)
6. [Error Handling](#error-handling)
7. [TypeScript Types](#typescript-types)

---

## Week 1: Operator Slot Management

### 1.1 Get Available Slots (Public - Customer View)

**Endpoint:** `GET /api/reservation-slots/available`

**Description:** Get list of available time slots for a specific month (customer-facing)

**Query Parameters:**
```typescript
{
  month: string;      // Format: "YYYY-MM" (e.g., "2025-11")
  orq: number;        // Organization ID (required)
  venue_id?: number;  // Optional: Filter by specific venue
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-11-25",
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "total_capacity": 200,
      "booked_count": 15,
      "available_count": 185,
      "status": "ACTIVE",
      "capacity_status": "AVAILABLE"
    },
    {
      "id": 2,
      "date": "2025-11-25",
      "start_time": "12:00:00",
      "end_time": "14:00:00",
      "total_capacity": 200,
      "booked_count": 190,
      "available_count": 10,
      "status": "ACTIVE",
      "capacity_status": "LIMITED"
    }
  ],
  "metadata": {
    "month": "2025-11",
    "total_slots": 18
  }
}
```

**Frontend Example (React/TypeScript):**
```typescript
import axios from 'axios';

interface Slot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  total_capacity: number;
  booked_count: number;
  available_count: number;
  status: 'ACTIVE' | 'FULL' | 'CLOSED';
  capacity_status: 'AVAILABLE' | 'LIMITED' | 'FULL';
}

async function getAvailableSlots(month: string, orgId: number): Promise<Slot[]> {
  const response = await axios.get('/api/reservation-slots/available', {
    params: { month, orq: orgId }
  });
  return response.data.data;
}

// Usage in component
const slots = await getAvailableSlots('2025-11', 1);
```

**Display Logic:**
- Show slots with `capacity_status: "AVAILABLE"` in green
- Show slots with `capacity_status: "LIMITED"` in yellow (< 20% remaining)
- Hide or grey out slots with `capacity_status: "FULL"`

---

### 1.2 Create Slot (Operator Only)

**Endpoint:** `POST /api/operator/slots/create`

**Description:** Operators create new time slots for venue entry

**Request Body:**
```json
{
  "venue_id": 1,
  "date": "2025-12-01",
  "start_time": "09:00:00",
  "end_time": "12:00:00",
  "total_capacity": 200,
  "orq": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 19,
    "venue_id": 1,
    "date": "2025-12-01",
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "total_capacity": 200,
    "booked_count": 0,
    "available_count": 200,
    "status": "ACTIVE",
    "created_at": "2025-11-25T12:00:00Z"
  }
}
```

---

### 1.3 Update Slot Capacity (Operator Only)

**Endpoint:** `PUT /api/operator/slots/:slot_id`

**Request Body:**
```json
{
  "total_capacity": 250,
  "status": "ACTIVE"
}
```

---

### 1.4 List All Slots (Operator Dashboard)

**Endpoint:** `GET /api/operator/slots`

**Query Parameters:**
```typescript
{
  venue_id?: number;
  date_from?: string;  // "YYYY-MM-DD"
  date_to?: string;
  status?: 'ACTIVE' | 'FULL' | 'CLOSED';
  orq: number;
}
```

---

## Week 2: Customer Reservation

### 2.1 Validate Ticket Eligibility

**Endpoint:** `POST /api/tickets/validate`

**Description:** Check if ticket is activated and eligible for reservation

**Request Body:**
```json
{
  "ticket_number": "TKT-ACTIVE-001",
  "orq": 1
}
```

**Response (Success - Activated Ticket):**
```json
{
  "success": true,
  "eligible": true,
  "ticket": {
    "ticket_number": "TKT-ACTIVE-001",
    "product_name": "Beijing Zoo Adult Ticket",
    "activation_status": "active",
    "activated_at": "2025-11-20T10:00:00Z",
    "expires_at": "2025-12-31T23:59:59Z"
  },
  "message": "Ticket is eligible for reservation"
}
```

**Response (Error - Inactive Ticket):**
```json
{
  "success": false,
  "eligible": false,
  "error": {
    "code": "TICKET_NOT_ACTIVATED",
    "message": "This ticket must be activated before making a reservation"
  }
}
```

**Frontend Logic:**
```typescript
async function checkTicketEligibility(ticketNumber: string): Promise<boolean> {
  try {
    const response = await axios.post('/api/tickets/validate', {
      ticket_number: ticketNumber,
      orq: 1
    });

    if (response.data.success && response.data.eligible) {
      return true;
    } else {
      // Show error message to user
      alert(response.data.error.message);
      return false;
    }
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}
```

---

### 2.2 Verify Contact Information

**Endpoint:** `POST /api/tickets/verify-contact`

**Description:** Verify visitor details before creating reservation

**Request Body:**
```json
{
  "ticket_number": "TKT-ACTIVE-001",
  "visitor_name": "John Smith",
  "visitor_phone": "+1234567890",
  "orq": 1
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Contact information verified"
}
```

---

### 2.3 Create Reservation

**Endpoint:** `POST /api/reservations/create`

**Description:** Create a reservation for an activated ticket

**Request Body:**
```json
{
  "ticket_number": "TKT-ACTIVE-001",
  "slot_id": 1,
  "visitor_name": "John Smith",
  "visitor_phone": "+1234567890",
  "orq": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "reservation_id": "RSV-123e4567",
    "ticket_number": "TKT-ACTIVE-001",
    "slot": {
      "id": 1,
      "date": "2025-11-25",
      "start_time": "09:00:00",
      "end_time": "12:00:00"
    },
    "visitor_name": "John Smith",
    "visitor_phone": "+1234567890",
    "status": "RESERVED",
    "created_at": "2025-11-25T10:30:00Z",
    "qr_code": "https://api.yourdomain.com/qr/RSV-123e4567"
  },
  "message": "Reservation created successfully"
}
```

**Response (Error - Slot Full):**
```json
{
  "success": false,
  "error": {
    "code": "SLOT_FULL",
    "message": "This time slot is fully booked. Please choose another slot."
  }
}
```

**Frontend Flow:**
```typescript
async function createReservation(
  ticketNumber: string,
  slotId: number,
  visitorName: string,
  visitorPhone: string
) {
  // Step 1: Validate ticket
  const isEligible = await checkTicketEligibility(ticketNumber);
  if (!isEligible) return;

  // Step 2: Verify contact
  await axios.post('/api/tickets/verify-contact', {
    ticket_number: ticketNumber,
    visitor_name: visitorName,
    visitor_phone: visitorPhone,
    orq: 1
  });

  // Step 3: Create reservation
  const response = await axios.post('/api/reservations/create', {
    ticket_number: ticketNumber,
    slot_id: slotId,
    visitor_name: visitorName,
    visitor_phone: visitorPhone,
    orq: 1
  });

  return response.data.data;
}
```

---

### 2.4 Modify Reservation

**Endpoint:** `PUT /api/reservations/:reservation_id`

**Description:** Change reservation to a different time slot

**Request Body:**
```json
{
  "new_slot_id": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservation_id": "RSV-123e4567",
    "old_slot": {
      "date": "2025-11-25",
      "start_time": "09:00:00"
    },
    "new_slot": {
      "date": "2025-11-26",
      "start_time": "14:00:00"
    }
  },
  "message": "Reservation updated successfully"
}
```

---

### 2.5 Cancel Reservation

**Endpoint:** `DELETE /api/reservations/:reservation_id`

**Response:**
```json
{
  "success": true,
  "message": "Reservation cancelled successfully"
}
```

---

## Week 3: Operator Validation

### 3.1 Operator Authentication

**Endpoint:** `POST /operators/auth`

**Description:** Operator logs in to scanning terminal

**Request Body:**
```json
{
  "operator_id": "OP-001",
  "password": "password123",
  "terminal_id": "TERM-A",
  "orq": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operator_id": "OP-001",
    "operator_name": "Zhang Wei",
    "terminal_id": "TERM-A",
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-11-25T22:00:00Z"
  }
}
```

**Frontend Storage:**
```typescript
// Store session token in localStorage
localStorage.setItem('operator_session', JSON.stringify(response.data.data));
```

---

### 3.2 Validate Ticket (QR Scan)

**Endpoint:** `POST /operators/validate-ticket`

**Description:** Scan ticket QR code and get color-coded validation result

**Request Body:**
```json
{
  "ticket_number": "TKT-ACTIVE-001",
  "operator_id": "OP-001",
  "terminal_id": "TERM-A",
  "orq": 1
}
```

**Response (GREEN - Allow Entry):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_number": "TKT-ACTIVE-001",
    "status": "RESERVED",
    "color_code": "GREEN",
    "message": "Valid reservation - Allow entry",
    "details": {
      "visitor_name": "John Smith",
      "slot_date": "2025-11-25",
      "slot_time": "09:00-12:00",
      "product_name": "Beijing Zoo Adult Ticket"
    },
    "allow_entry": true
  }
}
```

**Response (YELLOW - Warning):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_number": "TKT-ACTIVE-001",
    "status": "RESERVED",
    "color_code": "YELLOW",
    "message": "Warning: No reservation found for this ticket",
    "details": {
      "visitor_name": "N/A",
      "slot_date": "N/A",
      "slot_time": "N/A",
      "product_name": "Beijing Zoo Adult Ticket"
    },
    "allow_entry": false
  }
}
```

**Response (RED - Deny Entry):**
```json
{
  "success": true,
  "validation_result": {
    "ticket_number": "TKT-INACTIVE-001",
    "status": "PENDING_PAYMENT",
    "color_code": "RED",
    "message": "Ticket not activated - Deny entry",
    "details": {
      "visitor_name": "N/A",
      "slot_date": "N/A",
      "slot_time": "N/A",
      "product_name": "Beijing Zoo Adult Ticket"
    },
    "allow_entry": false
  }
}
```

**Frontend Display Logic:**
```typescript
function displayValidationResult(result: ValidationResult) {
  const { color_code, message, allow_entry, details } = result;

  // Display color-coded UI
  const backgroundColor = {
    GREEN: '#4CAF50',
    YELLOW: '#FFC107',
    RED: '#F44336'
  }[color_code];

  // Show result to operator
  return (
    <div style={{ backgroundColor, padding: '20px' }}>
      <h2>{message}</h2>
      <p><strong>Visitor:</strong> {details.visitor_name}</p>
      <p><strong>Date:</strong> {details.slot_date}</p>
      <p><strong>Time:</strong> {details.slot_time}</p>
      <button disabled={!allow_entry}>
        {allow_entry ? 'Allow Entry' : 'Deny Entry'}
      </button>
    </div>
  );
}
```

**Color Code Scenarios:**

| Color | Scenario | Action |
|-------|----------|--------|
| **GREEN** | Valid reservation for today | Allow entry automatically |
| **YELLOW** | No reservation OR Already verified | Manual operator decision |
| **RED** | Wrong date / Expired / Not activated / Invalid | Deny entry |

---

### 3.3 Verify Ticket Entry

**Endpoint:** `POST /operators/verify-ticket`

**Description:** Mark ticket as verified (allow entry)

**Request Body:**
```json
{
  "ticket_number": "TKT-ACTIVE-001",
  "operator_id": "OP-001",
  "terminal_id": "TERM-A",
  "validation_decision": "ALLOW",
  "orq": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket_number": "TKT-ACTIVE-001",
    "status": "VERIFIED",
    "verified_at": "2025-11-25T10:45:00Z",
    "operator_id": "OP-001",
    "terminal_id": "TERM-A"
  },
  "message": "Ticket verified successfully"
}
```

---

## Complete User Flows

### Flow 1: Customer Makes Reservation

```typescript
// 1. Customer views available slots
const slots = await getAvailableSlots('2025-11', 1);

// 2. Customer selects a slot and enters details
const selectedSlot = slots[0];
const ticketNumber = 'TKT-ACTIVE-001';
const visitorName = 'John Smith';
const visitorPhone = '+1234567890';

// 3. Validate ticket
const validation = await axios.post('/api/tickets/validate', {
  ticket_number: ticketNumber,
  orq: 1
});

if (!validation.data.eligible) {
  alert('Ticket must be activated first!');
  return;
}

// 4. Create reservation
const reservation = await axios.post('/api/reservations/create', {
  ticket_number: ticketNumber,
  slot_id: selectedSlot.id,
  visitor_name: visitorName,
  visitor_phone: visitorPhone,
  orq: 1
});

// 5. Show confirmation with QR code
alert(`Reservation confirmed! ID: ${reservation.data.data.reservation_id}`);
```

---

### Flow 2: Operator Scans Ticket at Venue

```typescript
// 1. Operator logs in
const login = await axios.post('/operators/auth', {
  operator_id: 'OP-001',
  password: 'password123',
  terminal_id: 'TERM-A',
  orq: 1
});

localStorage.setItem('operator_token', login.data.data.session_token);

// 2. Operator scans QR code
const ticketNumber = 'TKT-ACTIVE-001'; // From QR code

const validation = await axios.post('/operators/validate-ticket', {
  ticket_number: ticketNumber,
  operator_id: 'OP-001',
  terminal_id: 'TERM-A',
  orq: 1
});

// 3. Display color-coded result
const { color_code, allow_entry } = validation.data.validation_result;

if (color_code === 'GREEN') {
  // Automatically verify and allow entry
  await axios.post('/operators/verify-ticket', {
    ticket_number: ticketNumber,
    operator_id: 'OP-001',
    terminal_id: 'TERM-A',
    validation_decision: 'ALLOW',
    orq: 1
  });
  alert('Entry Allowed ✓');

} else if (color_code === 'YELLOW') {
  // Show warning, operator decides
  const decision = confirm(validation.data.validation_result.message);
  if (decision) {
    await axios.post('/operators/verify-ticket', {
      ticket_number: ticketNumber,
      operator_id: 'OP-001',
      terminal_id: 'TERM-A',
      validation_decision: 'ALLOW',
      orq: 1
    });
  }

} else if (color_code === 'RED') {
  // Deny entry
  alert('Entry Denied: ' + validation.data.validation_result.message);
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Error Code | Description | User Action |
|------------|-------------|-------------|
| `TICKET_NOT_FOUND` | Invalid ticket number | Check ticket number |
| `TICKET_NOT_ACTIVATED` | Ticket must be activated first | Activate ticket in app |
| `TICKET_EXPIRED` | Ticket past expiration date | Contact support |
| `SLOT_FULL` | Time slot fully booked | Choose different time |
| `RESERVATION_NOT_FOUND` | No reservation exists | Create new reservation |
| `INVALID_CREDENTIALS` | Operator login failed | Check username/password |
| `SESSION_EXPIRED` | Operator session timed out | Log in again |

### Frontend Error Handler

```typescript
function handleAPIError(error: any) {
  if (error.response?.data?.error) {
    const { code, message } = error.response.data.error;

    switch (code) {
      case 'TICKET_NOT_ACTIVATED':
        showActivationPrompt();
        break;
      case 'SLOT_FULL':
        refreshAvailableSlots();
        break;
      case 'SESSION_EXPIRED':
        redirectToLogin();
        break;
      default:
        alert(message);
    }
  } else {
    alert('Network error. Please try again.');
  }
}
```

---

## TypeScript Types

```typescript
// Week 1: Slots
interface ReservationSlot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  total_capacity: number;
  booked_count: number;
  available_count: number;
  status: 'ACTIVE' | 'FULL' | 'CLOSED';
  capacity_status: 'AVAILABLE' | 'LIMITED' | 'FULL';
}

// Week 2: Reservations
interface TicketReservation {
  reservation_id: string;
  ticket_number: string;
  slot: {
    id: number;
    date: string;
    start_time: string;
    end_time: string;
  };
  visitor_name: string;
  visitor_phone: string;
  status: 'RESERVED' | 'VERIFIED' | 'CANCELLED';
  created_at: string;
  verified_at?: string;
}

// Week 3: Validation
interface ValidationResult {
  ticket_number: string;
  status: string;
  color_code: 'GREEN' | 'YELLOW' | 'RED';
  message: string;
  details: {
    visitor_name: string;
    slot_date: string;
    slot_time: string;
    product_name: string;
  };
  allow_entry: boolean;
}

interface OperatorSession {
  operator_id: string;
  operator_name: string;
  terminal_id: string;
  session_token: string;
  expires_at: string;
}
```

---

## Testing the APIs

### Quick Test Commands

```bash
# Test slot availability
curl http://localhost:8080/api/reservation-slots/available?month=2025-11&orq=1

# Test ticket validation
curl -X POST http://localhost:8080/api/tickets/validate \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-ACTIVE-001","orq":1}'

# Test operator login
curl -X POST http://localhost:8080/operators/auth \
  -H "Content-Type: application/json" \
  -d '{"operator_id":"OP-001","password":"password123","terminal_id":"TERM-A","orq":1}'

# Test ticket scan
curl -X POST http://localhost:8080/operators/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticket_number":"TKT-ACTIVE-001","operator_id":"OP-001","terminal_id":"TERM-A","orq":1}'
```

---

## Postman Collection

Import the Newman test collection for complete API testing:
- **Location:** `postman/auto-generated/prd-006-week3-operator-validation.postman_collection.json`
- **Run tests:** `npx newman run postman/auto-generated/prd-006-week3-operator-validation.postman_collection.json`

---

## Support & Questions

**Backend Repository:** `src/modules/`
- Week 1: `reservation-slots/`
- Week 2: `customerReservation/`
- Week 3: `operatorValidation/` + `operators/router.ts`

**Documentation:**
- PRD: `docs/prd/PRD-006-ticket-activation-reservation.md`
- Test Scenarios: `docs/TEST_SCENARIOS_US-015.md`
- Implementation Status: `docs/implementation-status-week1.md`, `docs/implementation-status-week2.md`

**Contact:** Backend team for API questions
