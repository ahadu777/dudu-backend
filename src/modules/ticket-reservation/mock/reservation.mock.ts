import { TicketEntity, ReservationSlotEntity, TicketReservationEntity } from '../../../models';

// Mock Tickets (for testing reservation flow)
export const mockTickets: TicketEntity[] = [
  {
    id: 1,
    ticket_code: 'TKT-2025-ABC123-DEF456',
    order_id: 1001,
    status: 'ACTIVATED',
    customer_email: undefined,
    customer_phone: undefined,
    product_id: 101,
    orq: 1,
    qr_code: undefined,
    channel: 'direct',
    created_at: new Date('2025-11-20T10:00:00Z'),
    updated_at: new Date('2025-11-20T10:05:00Z'),
    activated_at: new Date('2025-11-20T10:05:00Z'),
    reserved_at: undefined,
    verified_at: undefined,
    verified_by: undefined,
  },
  {
    id: 2,
    ticket_code: 'TKT-2025-XYZ789-GHI012',
    order_id: 1002,
    status: 'RESERVED',
    customer_email: 'john@example.com',
    customer_phone: '+12025551234',
    product_id: 101,
    orq: 1,
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    channel: 'direct',
    created_at: new Date('2025-11-21T14:00:00Z'),
    updated_at: new Date('2025-11-22T09:30:00Z'),
    activated_at: new Date('2025-11-21T14:05:00Z'),
    reserved_at: new Date('2025-11-22T09:30:00Z'),
    verified_at: undefined,
    verified_by: undefined,
  },
  {
    id: 3,
    ticket_code: 'TKT-2025-AAA111-BBB222',
    order_id: 1003,
    status: 'VERIFIED',
    customer_email: 'jane@example.com',
    customer_phone: '+12025555678',
    product_id: 102,
    orq: 1,
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
    channel: 'direct',
    created_at: new Date('2025-11-15T08:00:00Z'),
    updated_at: new Date('2025-11-24T12:30:00Z'),
    activated_at: new Date('2025-11-15T08:05:00Z'),
    reserved_at: new Date('2025-11-18T10:00:00Z'),
    verified_at: new Date('2025-11-24T12:30:00Z'),
    verified_by: 101,
  },
  {
    id: 4,
    ticket_code: 'TKT-2025-CCC333-DDD444',
    order_id: 1004,
    status: 'PENDING_PAYMENT',
    customer_email: undefined,
    customer_phone: undefined,
    product_id: 101,
    orq: 1,
    qr_code: undefined,
    channel: 'direct',
    created_at: new Date('2025-11-23T16:00:00Z'),
    updated_at: new Date('2025-11-23T16:00:00Z'),
    activated_at: undefined,
    reserved_at: undefined,
    verified_at: undefined,
    verified_by: undefined,
  },
];

// Mock Reservation Slots (90 days of slots for testing)
export const mockReservationSlots: ReservationSlotEntity[] = [];

// Generate slots for the next 90 days
const today = new Date();
for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
  const slotDate = new Date(today);
  slotDate.setDate(today.getDate() + dayOffset);
  const dateStr = slotDate.toISOString().split('T')[0];

  // Morning slot: 09:00 - 12:00
  const morningSlot = new ReservationSlotEntity();
  morningSlot.id = dayOffset * 3 + 1;
  morningSlot.date = dateStr;
  morningSlot.start_time = '09:00:00';
  morningSlot.end_time = '12:00:00';
  morningSlot.venue_id = undefined;
  morningSlot.total_capacity = 200;
  morningSlot.booked_count = dayOffset < 30 ? Math.floor(Math.random() * 100) : 0; // Random bookings for first 30 days
  morningSlot.status = morningSlot.booked_count >= 200 ? 'FULL' : 'ACTIVE';
  morningSlot.orq = 1;
  morningSlot.created_at = new Date();
  morningSlot.updated_at = new Date();
  mockReservationSlots.push(morningSlot);

  // Afternoon slot: 12:00 - 14:00
  const afternoonSlot = new ReservationSlotEntity();
  afternoonSlot.id = dayOffset * 3 + 2;
  afternoonSlot.date = dateStr;
  afternoonSlot.start_time = '12:00:00';
  afternoonSlot.end_time = '14:00:00';
  afternoonSlot.venue_id = undefined;
  afternoonSlot.total_capacity = 200;
  afternoonSlot.booked_count = dayOffset < 30 ? Math.floor(Math.random() * 150) : 0;
  afternoonSlot.status = afternoonSlot.booked_count >= 200 ? 'FULL' : 'ACTIVE';
  afternoonSlot.orq = 1;
  afternoonSlot.created_at = new Date();
  afternoonSlot.updated_at = new Date();
  mockReservationSlots.push(afternoonSlot);

  // Evening slot: 14:00 - 16:00
  const eveningSlot = new ReservationSlotEntity();
  eveningSlot.id = dayOffset * 3 + 3;
  eveningSlot.date = dateStr;
  eveningSlot.start_time = '14:00:00';
  eveningSlot.end_time = '16:00:00';
  eveningSlot.venue_id = undefined;
  eveningSlot.total_capacity = 200;
  eveningSlot.booked_count = dayOffset < 30 ? Math.floor(Math.random() * 180) : 0;
  eveningSlot.status = eveningSlot.booked_count >= 200 ? 'FULL' : 'ACTIVE';
  eveningSlot.orq = 1;
  eveningSlot.created_at = new Date();
  eveningSlot.updated_at = new Date();
  mockReservationSlots.push(eveningSlot);
}

// Mock Ticket Reservations
export const mockTicketReservations: any[] = [
  {
    id: 1,
    source: 'direct',
    ota_ticket_code: undefined,
    ticket_id: 2,
    slot_id: 2, // Today's afternoon slot
    customer_email: 'john@example.com',
    customer_phone: '+12025551234',
    reserved_at: new Date('2025-11-22T09:30:00Z'),
    status: 'RESERVED',
    orq: 1,
    created_at: new Date('2025-11-22T09:30:00Z'),
    updated_at: new Date('2025-11-22T09:30:00Z'),
  },
  {
    id: 2,
    source: 'direct',
    ota_ticket_code: undefined,
    ticket_id: 3,
    slot_id: 1, // Today's morning slot
    customer_email: 'jane@example.com',
    customer_phone: '+12025555678',
    reserved_at: new Date('2025-11-18T10:00:00Z'),
    status: 'VERIFIED',
    orq: 1,
    created_at: new Date('2025-11-18T10:00:00Z'),
    updated_at: new Date('2025-11-24T12:30:00Z'),
  },
];

// Mock OTA Tickets (pre-generated tickets from OTA partners)
export interface MockOtaTicket {
  ticket_code: string;
  product_id: number;
  batch_id: string;
  partner_id: string;
  status: 'PRE_GENERATED' | 'ACTIVATED' | 'VERIFIED' | 'EXPIRED' | 'CANCELLED';  // 统一状态
  qr_code: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  order_id?: string;
  created_at: Date;
  activated_at?: Date;
}

export const mockOtaTickets: MockOtaTicket[] = [
  {
    ticket_code: 'OTA-2025-BATCH001-001',
    product_id: 106,
    batch_id: 'BATCH-2025-001',
    partner_id: 'PARTNER-KLOOK',
    status: 'ACTIVATED',  // 统一状态
    qr_code: 'data:image/png;base64,OTA_QR_CODE_001',
    customer_name: 'Alice Wong',
    customer_email: 'alice@example.com',
    customer_phone: '+85291234567',
    order_id: 'OTA-ORD-001',
    created_at: new Date('2025-11-20T10:00:00Z'),
    activated_at: new Date('2025-11-21T14:00:00Z'),
  },
  {
    ticket_code: 'OTA-2025-BATCH001-002',
    product_id: 106,
    batch_id: 'BATCH-2025-001',
    partner_id: 'PARTNER-KLOOK',
    status: 'ACTIVATED',  // 统一状态
    qr_code: 'data:image/png;base64,OTA_QR_CODE_002',
    customer_name: 'Bob Chen',
    customer_email: 'bob@example.com',
    customer_phone: '+85298765432',
    order_id: 'OTA-ORD-002',
    created_at: new Date('2025-11-20T10:00:00Z'),
    activated_at: new Date('2025-11-22T09:00:00Z'),
  },
  {
    ticket_code: 'OTA-2025-BATCH002-001',
    product_id: 107,
    batch_id: 'BATCH-2025-002',
    partner_id: 'PARTNER-KKDAY',
    status: 'PRE_GENERATED', // Not yet activated
    qr_code: 'data:image/png;base64,OTA_QR_CODE_003',
    created_at: new Date('2025-11-22T08:00:00Z'),
  },
  {
    ticket_code: 'OTA-2025-BATCH002-002',
    product_id: 107,
    batch_id: 'BATCH-2025-002',
    partner_id: 'PARTNER-KKDAY',
    status: 'VERIFIED', // Already used (统一状态：USED → VERIFIED)
    qr_code: 'data:image/png;base64,OTA_QR_CODE_004',
    customer_name: 'Charlie Lee',
    customer_email: 'charlie@example.com',
    order_id: 'OTA-ORD-003',
    created_at: new Date('2025-11-18T08:00:00Z'),
    activated_at: new Date('2025-11-19T10:00:00Z'),
  },
];

// Helper function to find ticket by code
export function findTicketByCode(ticketCode: string): TicketEntity | undefined {
  return mockTickets.find(t => t.ticket_code === ticketCode);
}

// Helper function to find OTA ticket by code
export function findOtaTicketByCode(ticketCode: string): MockOtaTicket | undefined {
  return mockOtaTickets.find(t => t.ticket_code === ticketCode);
}

// Helper function to find reservation by ticket_id
export function findReservationByTicketId(ticketId: number): TicketReservationEntity | undefined {
  return mockTicketReservations.find(r => r.ticket_id === ticketId && r.status === 'RESERVED');
}

// Helper function to find reservation by OTA ticket code
export function findReservationByOtaTicketCode(ticketCode: string): any | undefined {
  return mockTicketReservations.find(
    (r: any) => r.ota_ticket_code === ticketCode && r.source === 'ota'
  );
}

// Helper function to find slot by id
export function findSlotById(slotId: number): ReservationSlotEntity | undefined {
  return mockReservationSlots.find(s => s.id === slotId);
}

// Helper function to get available slots for a month
export function getAvailableSlotsForMonth(month: string, orq: number): ReservationSlotEntity[] {
  return mockReservationSlots.filter(slot =>
    slot.date.startsWith(month) &&
    slot.orq === orq &&
    slot.status !== 'CLOSED'
  );
}
