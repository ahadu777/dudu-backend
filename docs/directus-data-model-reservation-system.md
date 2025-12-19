# Directus Data Model: Ticket Reservation System

**Sequential Implementation Plan**
- **Phase 1 (US-015):** Operator Validation & Slot Management
- **Phase 2 (US-016):** Ticket Activation & Customer Reservation

---

## 📊 Phase 1: US-015 - Operator Validation System (4 weeks)

### Collection 1: `reservation_slots`
**Purpose:** Time-slot capacity management for venue visits

| Field Name | Type | Required | Default | Notes |
|------------|------|----------|---------|-------|
| `id` | UUID | ✅ | auto | Primary Key |
| `date` | Date | ✅ | - | Reservation date (YYYY-MM-DD) |
| `start_time` | Time | ✅ | - | Slot start time (HH:MM:SS) |
| `end_time` | Time | ✅ | - | Slot end time (HH:MM:SS) |
| `venue_id` | Integer | ✅ | - | Venue ID (REQUIRED for multi-venue support) |
| `total_capacity` | Integer | ✅ | 200 | Maximum tickets allowed |
| `booked_count` | Integer | ✅ | 0 | Current reservations count |
| `available_count` | Integer | ❌ | - | **Calculated field**: total_capacity - booked_count |
| `status` | String (enum) | ✅ | 'ACTIVE' | Values: ACTIVE, FULL, CLOSED |
| `orq` | Integer | ✅ | - | Organization ID (multi-tenancy) |
| `created_at` | Timestamp | ✅ | now() | Auto-generated |
| `updated_at` | Timestamp | ✅ | now() | Auto-updated |

**Indexes:**
- `idx_date` on `date`
- `idx_venue_id` on `venue_id`
- `idx_orq` on `orq`
- `idx_status` on `status`
- **Unique constraint**: `(venue_id, date, start_time, orq)` - prevent duplicate slots per venue

**Business Rules:**
- When `booked_count >= total_capacity`, auto-update `status` to 'FULL'
- `available_count` is computed field: `total_capacity - booked_count`

---

### Collection 2: `ticket_reservations`
**Purpose:** Link tickets to specific time slots

| Field Name | Type | Required | Default | Notes |
|------------|------|----------|---------|-------|
| `id` | UUID | ✅ | auto | Primary Key |
| `ticket_id` | String | ✅ | - | **Foreign Key** → tickets.ticket_code |
| `slot_id` | UUID | ✅ | - | **Foreign Key** → reservation_slots.id |
| `customer_email` | String (email) | ✅ | - | Contact for confirmation |
| `customer_phone` | String | ✅ | - | Phone number (E.164 format) |
| `reserved_at` | Timestamp | ✅ | now() | When reservation was made |
| `status` | String (enum) | ✅ | 'RESERVED' | Values: RESERVED, CANCELLED, VERIFIED |
| `orq` | Integer | ✅ | - | Organization ID |
| `created_at` | Timestamp | ✅ | now() | Auto-generated |
| `updated_at` | Timestamp | ✅ | now() | Auto-updated |

**Indexes:**
- `idx_ticket_id` on `ticket_id`
- `idx_slot_id` on `slot_id`
- `idx_orq` on `orq`
- **Unique constraint**: `ticket_id` - one reservation per ticket

**Relationships:**
- Many-to-One: `ticket_reservations.slot_id` → `reservation_slots.id`

**Business Rules:**
- Cannot reserve same ticket twice (unique constraint on `ticket_id`)
- When creating reservation:
  1. Lock `reservation_slots` row (transaction)
  2. Check `booked_count < total_capacity`
  3. Insert reservation
  4. Increment `reservation_slots.booked_count`

---

### Collection 3: Enhancement to Existing `tickets` Collection
**Purpose:** Add reservation-related fields to existing tickets

**New Fields to Add:**

| Field Name | Type | Required | Default | Notes |
|------------|------|----------|---------|-------|
| `customer_email` | String (email) | ❌ | null | Collected during reservation |
| `customer_phone` | String | ❌ | null | Collected during reservation |
| `reserved_at` | Timestamp | ❌ | null | When ticket was reserved |
| `verified_at` | Timestamp | ❌ | null | When operator scanned at venue |
| `verified_by` | Integer | ❌ | null | Operator user ID who verified |

**Keep Existing Fields:**
- `ticket_code` (Primary Key)
- `order_id`
- `product_id`
- `user_id`
- `status` (extend enum - see below)
- `entitlements` (JSON)
- `expires_at`
- `created_at`

**Extend `status` Enum:**
Add new values to existing TicketStatus:
- `PENDING_PAYMENT` - Order created, awaiting payment
- `ACTIVATED` - Payment confirmed, ready for reservation (NEW)
- `RESERVED` - Customer has selected time slot (NEW)
- `VERIFIED` - Operator validated at venue (NEW)
- `EXPIRED` - Ticket past validity period (EXISTING)
- Keep existing: `minted`, `active`, `redeemed`, etc.

**Indexes:**
- Existing indexes remain
- Add: `idx_status` on `status` (for filtering)

---

## 📊 Phase 2: US-016 - Ticket Activation System (3 weeks)

### Enhancement to `tickets` Collection
**Purpose:** Support two-phase activation lifecycle

**New Fields to Add:**

| Field Name | Type | Required | Default | Notes |
|------------|------|----------|---------|-------|
| `activation_status` | String (enum) | ✅ | 'inactive' | Values: inactive, active, redeemed, cancelled |
| `activated_at` | Timestamp | ❌ | null | When ticket was activated |
| `activation_mode` | String (enum) | ✅ | 'deferred' | Values: immediate, deferred |

**Business Rules:**
- **Pre-Made Mode**: Tickets created with `activation_status = 'inactive'`
- **Immediate Mode**: Tickets created with `activation_status = 'active'` (auto-activated)
- Activation is one-way: `inactive` → `active` (cannot revert)
- Only tickets with `activation_status = 'active'` can create reservations

**Status Lifecycle:**
```
Purchase (Pre-Made):
  activation_status: inactive → (customer activates) → active → (reserves) → active+reservation → (scan) → redeemed

Purchase (Immediate):
  activation_status: active → (reserves) → active+reservation → (scan) → redeemed
```

---

## 🔗 Directus Relationships Configuration

### reservation_slots → ticket_reservations
- **Type:** One-to-Many
- **Field:** `ticket_reservations.slot_id` references `reservation_slots.id`
- **On Delete:** RESTRICT (cannot delete slot if reservations exist)

### tickets → ticket_reservations
- **Type:** One-to-One
- **Field:** `ticket_reservations.ticket_id` references `tickets.ticket_code`
- **On Delete:** CASCADE (if ticket deleted, remove reservation)

---

## 📋 Directus Collection Creation Checklist

### Phase 1 Setup:
- [ ] Create `reservation_slots` collection
  - [ ] Add all fields with proper types
  - [ ] Set up calculated field for `available_count`
  - [ ] Create indexes (date, orq, status)
  - [ ] Add unique constraint (date + start_time + orq)

- [ ] Create `ticket_reservations` collection
  - [ ] Add all fields
  - [ ] Set up foreign key to `reservation_slots`
  - [ ] Set up foreign key to `tickets`
  - [ ] Create indexes
  - [ ] Add unique constraint on `ticket_id`

- [ ] Extend `tickets` collection
  - [ ] Add Phase 1 fields (customer_email, customer_phone, etc.)
  - [ ] Extend `status` enum
  - [ ] Add new indexes

### Phase 2 Setup:
- [ ] Extend `tickets` collection
  - [ ] Add `activation_status` field (enum)
  - [ ] Add `activated_at` timestamp
  - [ ] Add `activation_mode` field (enum)

---

## 🔒 Directus Permissions & Access Control

### Collection: `reservation_slots`
- **Public (unauthenticated):** Read-only (for viewing availability)
- **Customer Role:** Read-only
- **Operator Role:** Read-only
- **Admin Role:** Full CRUD

### Collection: `ticket_reservations`
- **Public:** None
- **Customer Role:**
  - Create: Own tickets only
  - Read: Own reservations only
  - Update: Own reservations only (before verification)
  - Delete: Own reservations only (cancellation)
- **Operator Role:** Read-only (for validation)
- **Admin Role:** Full CRUD

### Collection: `tickets`
- **Public:** None
- **Customer Role:** Read-only (own tickets)
- **Operator Role:** Update (verified_at, verified_by fields only)
- **Admin Role:** Full CRUD

---

## 🧪 Sample Data for Testing

### reservation_slots (Sample)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "date": "2025-12-01",
  "start_time": "09:00:00",
  "end_time": "11:00:00",
  "total_capacity": 200,
  "booked_count": 45,
  "status": "ACTIVE",
  "orq": 1
}
```

### ticket_reservations (Sample)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "ticket_id": "TKT-2025-ABC123",
  "slot_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_email": "john@example.com",
  "customer_phone": "+12025551234",
  "reserved_at": "2025-11-25T10:30:00Z",
  "status": "RESERVED",
  "orq": 1
}
```

---

## 🚀 API Endpoints (Express Backend)

### Operator Slot Management (NEW):

**Create Slot:**
- `POST /api/operator/slots/create`
  - Body: `{ "venue_id": 1, "date": "2025-12-01", "start_time": "09:00", "end_time": "12:00", "total_capacity": 200 }`
  - Creates new time slot for venue

**Update Slot:**
- `PUT /api/operator/slots/:slot_id`
  - Body: `{ "total_capacity": 150, "status": "ACTIVE" }`
  - Updates slot capacity or status
  - Validation: Cannot reduce capacity below current booked_count

**Close/Delete Slot:**
- `DELETE /api/operator/slots/:slot_id`
  - Soft delete (set status to CLOSED) if reservations exist
  - Hard delete if booked_count = 0

**List Slots:**
- `GET /api/operator/slots?venue_id=1&date_from=2025-12-01&date_to=2025-12-31`
  - Returns slots filtered by venue and date range

### Phase 1 Endpoints:

**Slot Availability:**
- `GET /api/reservation-slots/available?month=2025-12&orq=1`
  - Returns slots with capacity status

**Ticket Validation:**
- `POST /api/tickets/validate`
  - Body: `{ "ticket_code": "TKT-2025-ABC123" }`
  - Validates ticket can make reservation

**Create Reservation:**
- `POST /api/reservations/create`
  - Body: `{ "ticket_id": "TKT-2025-ABC123", "slot_id": "uuid", "customer_email": "...", "customer_phone": "..." }`
  - Creates reservation + updates slot count

**Operator Validation:**
- `POST /api/operator/validate-ticket`
  - Body: `{ "ticket_code": "TKT-2025-ABC123" }`
  - Checks reservation date matches today

- `POST /api/operator/verify-ticket`
  - Body: `{ "ticket_id": "TKT-2025-ABC123", "operator_id": 5 }`
  - Marks ticket as verified

### Phase 2 Endpoints:

**Ticket Activation:**
- `POST /api/tickets/:ticket_id/activate`
  - Transitions inactive → active

- `GET /api/tickets/:ticket_id/status`
  - Returns activation status

**Enhanced Reservation:**
- Uses same endpoints as Phase 1, but checks `activation_status = 'active'` before allowing reservation

---

## 📊 Migration Strategy (Directus)

### Step 1: Create Collections (via Directus UI or API)
```bash
# Use Directus Studio UI to create collections
# Or use Directus API with schema definitions
```

### Step 2: Seed Initial Slots (via Directus API)
```javascript
// Generate 90 days of slots (morning/afternoon/evening)
const slots = [];
for (let day = 0; day < 90; day++) {
  const date = addDays(new Date(), day);
  slots.push(
    { date, start_time: '09:00', end_time: '12:00', total_capacity: 200, orq: 1 },
    { date, start_time: '12:00', end_time: '15:00', total_capacity: 200, orq: 1 },
    { date, start_time: '15:00', end_time: '18:00', total_capacity: 200, orq: 1 }
  );
}
// Bulk insert via Directus API
```

---

## ✅ Validation Checklist

Before going live:
- [ ] All Directus collections created with correct field types
- [ ] Relationships configured properly
- [ ] Permissions set for each role
- [ ] Sample data inserted and tested
- [ ] Express API endpoints connected to Directus
- [ ] Newman tests passing for all scenarios
- [ ] Operator UI can scan and validate tickets
- [ ] Customer can view slots and create reservations

---

**Last Updated:** 2025-11-25
**Related PRDs:** PRD-006, PRD-007
**Related Stories:** US-015, US-016
