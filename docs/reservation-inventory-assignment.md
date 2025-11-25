# Reservation Inventory Assignment System

**System Type:** Fixed Capacity Slot-Based Inventory
**Assignment Method:** Counter-Based with Atomic Updates

---

## 🎯 Core Concept

### Inventory Model: Slot-Based Capacity Pools

Each **reservation slot** is an independent inventory pool with:
- **Fixed capacity** (e.g., 200 tickets per slot)
- **Date + Time** (e.g., 2025-12-01, 09:00-12:00)
- **Atomic counter** (`booked_count`) tracking current reservations

**Key Principle:** Slots are **pre-created** (not generated on-demand), and tickets are **assigned** to slots via reservations.

---

## 🗂️ Data Structure

### reservation_slots (Inventory Pools)
```javascript
{
  id: "uuid-123",
  date: "2025-12-01",
  start_time: "09:00:00",
  end_time: "12:00:00",
  total_capacity: 200,      // Maximum tickets allowed
  booked_count: 45,          // Current reservations
  available_count: 155,      // Calculated: 200 - 45
  status: "ACTIVE",          // ACTIVE | FULL | CLOSED
  orq: 1
}
```

### ticket_reservations (Assignment Records)
```javascript
{
  id: "uuid-456",
  ticket_id: "TKT-2025-ABC123",     // Which ticket
  slot_id: "uuid-123",               // Assigned to which slot
  customer_email: "user@example.com",
  customer_phone: "+12025551234",
  reserved_at: "2025-11-25T10:30:00Z",
  status: "RESERVED"
}
```

**Relationship:**
- Many tickets → One slot (Many-to-One)
- One ticket → One slot (enforced by unique constraint on `ticket_id`)

---

## 🔄 Assignment Flow

### Scenario 1: Customer Reserves Ticket

**Request:**
```http
POST /api/reservations/create
{
  "ticket_id": "TKT-2025-ABC123",
  "slot_id": "uuid-123",
  "customer_email": "user@example.com",
  "customer_phone": "+12025551234"
}
```

**Backend Process (Atomic Transaction):**

```javascript
// Step 1: Lock the slot row (prevent concurrent booking)
const slot = await directus.items('reservation_slots')
  .readOne(slotId, {
    lock: 'FOR UPDATE'  // Pessimistic lock in transaction
  });

// Step 2: Check capacity
if (slot.booked_count >= slot.total_capacity) {
  throw new Error('SLOT_FULL');
}

// Step 3: Create reservation record
await directus.items('ticket_reservations').createOne({
  ticket_id: ticketId,
  slot_id: slotId,
  customer_email: email,
  customer_phone: phone,
  status: 'RESERVED',
  orq: 1
});

// Step 4: Increment booked count (atomic update)
await directus.items('reservation_slots').updateOne(slotId, {
  booked_count: slot.booked_count + 1
});

// Step 5: Update ticket status
await directus.items('tickets').updateOne(ticketId, {
  reserved_at: new Date(),
  customer_email: email,
  customer_phone: phone,
  status: 'RESERVED'
});

// Step 6: Auto-update slot status if full
if (slot.booked_count + 1 >= slot.total_capacity) {
  await directus.items('reservation_slots').updateOne(slotId, {
    status: 'FULL'
  });
}

// Commit transaction
```

**Result:**
```javascript
{
  reservation_id: "uuid-456",
  slot: {
    date: "2025-12-01",
    start_time: "09:00:00",
    end_time: "12:00:00",
    booked_count: 46,        // Incremented from 45
    available_count: 154      // Decremented from 155
  }
}
```

---

## 📊 Capacity Management

### Slot Status Auto-Update Rules

```javascript
// Status calculation logic
function updateSlotStatus(slot) {
  if (slot.booked_count >= slot.total_capacity) {
    return 'FULL';
  } else if (slot.status === 'CLOSED') {
    return 'CLOSED';  // Admin manually closed
  } else {
    return 'ACTIVE';
  }
}
```

### Capacity Status for UI Display

```javascript
function getCapacityStatus(slot) {
  const availablePercent = (slot.available_count / slot.total_capacity) * 100;

  if (availablePercent === 0) {
    return 'FULL';        // Red badge
  } else if (availablePercent <= 50) {
    return 'LIMITED';     // Yellow badge
  } else {
    return 'AVAILABLE';   // Green badge
  }
}
```

**Example UI Display:**
```
┌─────────────────────────────────┐
│ 🕐 09:00 AM - 12:00 PM         │
│ 154/200 available              │
│ ✅ Available                   │  ← Green badge (77% available)
│ [Select This Slot]             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🕐 12:00 PM - 3:00 PM          │
│ 30/200 available               │
│ ⚠️ Limited                     │  ← Yellow badge (15% available)
│ [Select This Slot]             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🕐 3:00 PM - 6:00 PM           │
│ 0/200 available                │
│ ❌ Full                        │  ← Red badge (0% available)
│ [Select This Slot] (disabled)  │
└─────────────────────────────────┘
```

---

## 🔒 Concurrency Control

### Problem: Race Conditions

**Scenario:** Two customers try to book the last slot simultaneously

```
Time  | Customer A                    | Customer B
------|-------------------------------|-------------------------------
T0    | Read slot: booked_count = 199 | Read slot: booked_count = 199
T1    | Check: 199 < 200 ✅          | Check: 199 < 200 ✅
T2    | Insert reservation            | Insert reservation
T3    | Update: booked_count = 200    | Update: booked_count = 200
------|-------------------------------|-------------------------------
Result: BOTH succeed! (WRONG - capacity = 201)
```

### Solution: Pessimistic Locking

**Use Database Row Locking:**

```sql
BEGIN TRANSACTION;

-- Lock the slot row (other transactions must wait)
SELECT * FROM reservation_slots WHERE id = 'uuid-123' FOR UPDATE;

-- Check capacity
IF booked_count < total_capacity THEN
  INSERT INTO ticket_reservations (...);
  UPDATE reservation_slots SET booked_count = booked_count + 1 WHERE id = 'uuid-123';
  COMMIT;
ELSE
  ROLLBACK;
  RETURN ERROR 'SLOT_FULL';
END IF;
```

**Directus Implementation (using transactions):**

```javascript
await directus.transaction(async (trx) => {
  // Lock row
  const slot = await trx('reservation_slots')
    .where({ id: slotId })
    .forUpdate()
    .first();

  if (slot.booked_count >= slot.total_capacity) {
    throw new Error('SLOT_FULL');
  }

  // Atomic operations
  await trx('ticket_reservations').insert({ ... });
  await trx('reservation_slots')
    .where({ id: slotId })
    .increment('booked_count', 1);
});
```

---

## 🗓️ Slot Creation Strategy

### Pre-Creation Approach (Recommended)

**How slots are created:**

```javascript
// Initial setup: Create 90 days of slots
function generateSlots(days = 90) {
  const slots = [];
  const timeSlots = [
    { start: '09:00', end: '12:00' },  // Morning
    { start: '12:00', end: '15:00' },  // Afternoon
    { start: '15:00', end: '18:00' }   // Evening
  ];

  for (let day = 0; day < days; day++) {
    const date = addDays(new Date(), day);

    timeSlots.forEach(time => {
      slots.push({
        date: formatDate(date, 'yyyy-MM-dd'),
        start_time: time.start,
        end_time: time.end,
        total_capacity: 200,
        booked_count: 0,
        status: 'ACTIVE',
        orq: 1
      });
    });
  }

  return slots;
}

// Bulk insert into Directus
const slots = generateSlots(90);
await directus.items('reservation_slots').createMany(slots);
```

**Why Pre-Create?**
- ✅ Predictable inventory (customers see all available dates)
- ✅ Faster queries (no dynamic generation)
- ✅ Easier capacity management
- ✅ Admin can close specific slots

**Maintenance:**
- **Daily job:** Create tomorrow's slots (rolling 90-day window)
- **Weekly job:** Clean up expired slots (past dates)

---

## 🚫 Reservation Rules & Constraints

### Business Rules

| Rule | Enforcement | Example |
|------|-------------|---------|
| **One ticket = One reservation** | Unique constraint on `ticket_id` | Cannot reserve same ticket twice |
| **Capacity limit** | Check `booked_count < total_capacity` | Slot has max 200 tickets |
| **Only active tickets can reserve** | Check `activation_status = 'active'` (Phase 2) | Inactive tickets rejected |
| **No past-date reservations** | Check `slot.date >= TODAY` | Cannot reserve yesterday |
| **No double-booking** | Transaction lock | Concurrent requests handled safely |

### Database Constraints

```sql
-- In Directus schema:
ALTER TABLE ticket_reservations
  ADD CONSTRAINT unique_ticket_reservation UNIQUE (ticket_id);

ALTER TABLE reservation_slots
  ADD CONSTRAINT unique_slot_datetime UNIQUE (date, start_time, orq);
```

---

## 📈 Inventory Analytics

### Key Metrics to Track

**Per Slot:**
```javascript
{
  utilization_rate: (booked_count / total_capacity) * 100,  // 45/200 = 22.5%
  fill_rate: booked_count === total_capacity ? 100 : 0,     // Binary: full or not
  booking_velocity: reservations_per_hour                    // Trend analysis
}
```

**Aggregated:**
```sql
-- Overall utilization
SELECT
  date,
  SUM(booked_count) / SUM(total_capacity) * 100 AS daily_utilization
FROM reservation_slots
WHERE date BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY date;

-- Peak demand slots
SELECT
  start_time,
  AVG(booked_count / total_capacity * 100) AS avg_utilization
FROM reservation_slots
GROUP BY start_time
ORDER BY avg_utilization DESC;
```

---

## 🔄 Cancellation & Modification

### Cancel Reservation

```javascript
// When customer cancels
await directus.transaction(async (trx) => {
  // Get reservation
  const reservation = await trx('ticket_reservations')
    .where({ ticket_id: ticketId })
    .first();

  // Update reservation status
  await trx('ticket_reservations')
    .where({ id: reservation.id })
    .update({ status: 'CANCELLED' });

  // Decrement slot count (free up capacity)
  await trx('reservation_slots')
    .where({ id: reservation.slot_id })
    .decrement('booked_count', 1);

  // Update ticket status (back to active, no reservation)
  await trx('tickets')
    .where({ ticket_code: ticketId })
    .update({
      reserved_at: null,
      status: 'ACTIVATED'  // Phase 2: back to active
    });

  // If slot was FULL, reopen it
  const slot = await trx('reservation_slots')
    .where({ id: reservation.slot_id })
    .first();

  if (slot.booked_count < slot.total_capacity && slot.status === 'FULL') {
    await trx('reservation_slots')
      .where({ id: slot.id })
      .update({ status: 'ACTIVE' });
  }
});
```

### Modify Reservation (Change Date/Time)

```javascript
// Move reservation to different slot
async function modifyReservation(ticketId, newSlotId) {
  await directus.transaction(async (trx) => {
    // Get current reservation
    const reservation = await trx('ticket_reservations')
      .where({ ticket_id: ticketId })
      .first();

    const oldSlotId = reservation.slot_id;

    // Lock both slots
    const oldSlot = await trx('reservation_slots').where({ id: oldSlotId }).forUpdate().first();
    const newSlot = await trx('reservation_slots').where({ id: newSlotId }).forUpdate().first();

    // Check new slot capacity
    if (newSlot.booked_count >= newSlot.total_capacity) {
      throw new Error('NEW_SLOT_FULL');
    }

    // Update reservation
    await trx('ticket_reservations')
      .where({ id: reservation.id })
      .update({ slot_id: newSlotId });

    // Decrement old slot
    await trx('reservation_slots')
      .where({ id: oldSlotId })
      .decrement('booked_count', 1);

    // Increment new slot
    await trx('reservation_slots')
      .where({ id: newSlotId })
      .increment('booked_count', 1);
  });
}
```

---

## 🧪 Testing Scenarios

### Test Case 1: Normal Reservation
```javascript
// Setup: Slot has capacity 200, booked 0
POST /api/reservations/create { ticket_id, slot_id }
// Expected: Success, booked_count = 1
```

### Test Case 2: Slot Full Error
```javascript
// Setup: Slot has capacity 200, booked 200
POST /api/reservations/create { ticket_id, slot_id }
// Expected: Error "SLOT_FULL"
```

### Test Case 3: Concurrent Bookings (Race Condition)
```javascript
// Setup: Slot has capacity 200, booked 199
// Action: 2 customers try to book simultaneously
// Expected: One succeeds (booked_count = 200), one fails with "SLOT_FULL"
```

### Test Case 4: Double Booking Prevention
```javascript
// Setup: Ticket already has reservation
POST /api/reservations/create { ticket_id, slot_id }
// Expected: Error "TICKET_ALREADY_RESERVED" (unique constraint violation)
```

---

## 📋 Summary

### Key Takeaways:

1. **Inventory Model:** Fixed capacity slots (pre-created)
2. **Assignment Method:** Counter-based (`booked_count++`)
3. **Concurrency:** Pessimistic locking with transactions
4. **Relationship:** One ticket → One slot (enforced by unique constraint)
5. **Capacity Check:** Always `booked_count < total_capacity` before insert
6. **Status Updates:** Auto-mark slot as FULL when capacity reached

### Benefits of This Approach:

✅ **Scalable** - Simple counter increments
✅ **Reliable** - Database-level concurrency control
✅ **Predictable** - Pre-created slots visible to customers
✅ **Flexible** - Admin can adjust capacity or close slots
✅ **Performant** - No complex inventory allocation logic

---

**Last Updated:** 2025-11-25
**Related Documents:**
- Data Model: `docs/directus-data-model-reservation-system.md`
- Implementation: `docs/implementation-roadmap-reservation-system.md`
