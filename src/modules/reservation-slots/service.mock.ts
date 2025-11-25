import {
  ReservationSlot,
  CreateSlotRequest,
  UpdateSlotRequest,
  GetSlotsQuery,
  SlotStatus,
  CapacityStatus
} from './types';
import { v4 as uuidv4 } from 'uuid';

// Mock data storage
const mockSlots: Map<string, ReservationSlot> = new Map();

// Initialize with sample data
function initializeMockData() {
  const today = new Date();
  const venues = [1, 2]; // Two sample venues
  const timeSlots = [
    { start: '09:00:00', end: '12:00:00' },
    { start: '12:00:00', end: '15:00:00' },
    { start: '15:00:00', end: '18:00:00' }
  ];

  // Generate 30 days of slots
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    venues.forEach(venueId => {
      timeSlots.forEach(time => {
        const slot: ReservationSlot = {
          id: uuidv4(),
          date: dateStr,
          start_time: time.start,
          end_time: time.end,
          venue_id: venueId,
          total_capacity: 200,
          booked_count: Math.floor(Math.random() * 150), // Random bookings
          available_count: 0, // Will be calculated
          status: 'ACTIVE',
          orq: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Calculate available count
        slot.available_count = slot.total_capacity - slot.booked_count;

        // Auto-update status if full
        if (slot.booked_count >= slot.total_capacity) {
          slot.status = 'FULL';
        }

        mockSlots.set(slot.id, slot);
      });
    });
  }
}

// Initialize on module load
initializeMockData();

export class ReservationSlotServiceMock {
  /**
   * Create new reservation slot
   */
  async createSlot(request: CreateSlotRequest): Promise<ReservationSlot> {
    // Check for duplicate slot
    const duplicate = Array.from(mockSlots.values()).find(
      slot =>
        slot.venue_id === request.venue_id &&
        slot.date === request.date &&
        slot.start_time === request.start_time &&
        slot.orq === request.orq
    );

    if (duplicate) {
      throw new Error('SLOT_ALREADY_EXISTS');
    }

    // Check if date is in the past
    const slotDate = new Date(request.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new Error('CANNOT_CREATE_PAST_SLOT');
    }

    const slot: ReservationSlot = {
      id: uuidv4(),
      date: request.date,
      start_time: request.start_time,
      end_time: request.end_time,
      venue_id: request.venue_id,
      total_capacity: request.total_capacity,
      booked_count: 0,
      available_count: request.total_capacity,
      status: 'ACTIVE',
      orq: request.orq,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockSlots.set(slot.id, slot);
    return slot;
  }

  /**
   * Update existing slot
   */
  async updateSlot(slotId: string, request: UpdateSlotRequest): Promise<ReservationSlot> {
    const slot = mockSlots.get(slotId);

    if (!slot) {
      throw new Error('SLOT_NOT_FOUND');
    }

    // If updating capacity, validate
    if (request.total_capacity !== undefined) {
      if (request.total_capacity < slot.booked_count) {
        throw new Error('CAPACITY_BELOW_BOOKED_COUNT');
      }
      slot.total_capacity = request.total_capacity;
      slot.available_count = slot.total_capacity - slot.booked_count;
    }

    // Update status
    if (request.status !== undefined) {
      slot.status = request.status;
    }

    // Auto-update status if full
    if (slot.booked_count >= slot.total_capacity && slot.status !== 'CLOSED') {
      slot.status = 'FULL';
    } else if (slot.booked_count < slot.total_capacity && slot.status === 'FULL') {
      slot.status = 'ACTIVE';
    }

    slot.updated_at = new Date().toISOString();
    mockSlots.set(slotId, slot);

    return slot;
  }

  /**
   * Delete slot
   */
  async deleteSlot(slotId: string): Promise<{ soft_delete: boolean; message: string }> {
    const slot = mockSlots.get(slotId);

    if (!slot) {
      throw new Error('SLOT_NOT_FOUND');
    }

    // If has bookings, soft delete (set to CLOSED)
    if (slot.booked_count > 0) {
      slot.status = 'CLOSED';
      slot.updated_at = new Date().toISOString();
      mockSlots.set(slotId, slot);

      return {
        soft_delete: true,
        message: 'Slot has reservations, status set to CLOSED'
      };
    }

    // Hard delete if no bookings
    mockSlots.delete(slotId);

    return {
      soft_delete: false,
      message: 'Slot deleted successfully'
    };
  }

  /**
   * Get slots with filters
   */
  async getSlots(query: GetSlotsQuery): Promise<ReservationSlot[]> {
    let slots = Array.from(mockSlots.values());

    // Filter by orq
    slots = slots.filter(slot => slot.orq === query.orq);

    // Filter by venue_id
    if (query.venue_id !== undefined) {
      slots = slots.filter(slot => slot.venue_id === query.venue_id);
    }

    // Filter by date range
    if (query.date_from) {
      slots = slots.filter(slot => slot.date >= query.date_from!);
    }

    if (query.date_to) {
      slots = slots.filter(slot => slot.date <= query.date_to!);
    }

    // Filter by status
    if (query.status) {
      slots = slots.filter(slot => slot.status === query.status);
    }

    // Sort by date and start_time
    slots.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

    return slots;
  }

  /**
   * Get slot by ID
   */
  async getSlotById(slotId: string): Promise<ReservationSlot | null> {
    return mockSlots.get(slotId) || null;
  }

  /**
   * Get available slots for customer view (grouped by date)
   */
  async getAvailableSlots(
    month: string,
    orq: number,
    venueId?: number
  ): Promise<Array<{ date: string; slots: Array<any> }>> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    let slots = Array.from(mockSlots.values()).filter(
      slot =>
        slot.orq === orq &&
        slot.date >= startDate.toISOString().split('T')[0] &&
        slot.date <= endDate.toISOString().split('T')[0] &&
        slot.status !== 'CLOSED'
    );

    if (venueId !== undefined) {
      slots = slots.filter(slot => slot.venue_id === venueId);
    }

    // Group by date
    const grouped = new Map<string, any[]>();

    slots.forEach(slot => {
      if (!grouped.has(slot.date)) {
        grouped.set(slot.date, []);
      }

      grouped.get(slot.date)!.push({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        total_capacity: slot.total_capacity,
        available_count: slot.available_count,
        capacity_status: this.getCapacityStatus(slot),
        status: slot.status
      });
    });

    // Convert to array and sort
    return Array.from(grouped.entries())
      .map(([date, slots]) => ({ date, slots }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Increment booked count (called when reservation created)
   */
  async incrementBookedCount(slotId: string): Promise<void> {
    const slot = mockSlots.get(slotId);

    if (!slot) {
      throw new Error('SLOT_NOT_FOUND');
    }

    if (slot.booked_count >= slot.total_capacity) {
      throw new Error('SLOT_FULL');
    }

    slot.booked_count++;
    slot.available_count = slot.total_capacity - slot.booked_count;

    // Auto-update status if full
    if (slot.booked_count >= slot.total_capacity) {
      slot.status = 'FULL';
    }

    slot.updated_at = new Date().toISOString();
    mockSlots.set(slotId, slot);
  }

  /**
   * Decrement booked count (called when reservation cancelled)
   */
  async decrementBookedCount(slotId: string): Promise<void> {
    const slot = mockSlots.get(slotId);

    if (!slot) {
      throw new Error('SLOT_NOT_FOUND');
    }

    if (slot.booked_count > 0) {
      slot.booked_count--;
      slot.available_count = slot.total_capacity - slot.booked_count;

      // Reopen slot if was full
      if (slot.status === 'FULL' && slot.booked_count < slot.total_capacity) {
        slot.status = 'ACTIVE';
      }

      slot.updated_at = new Date().toISOString();
      mockSlots.set(slotId, slot);
    }
  }

  /**
   * Helper: Calculate capacity status
   */
  private getCapacityStatus(slot: ReservationSlot): CapacityStatus {
    const availablePercent = (slot.available_count / slot.total_capacity) * 100;

    if (availablePercent === 0) {
      return 'FULL';
    } else if (availablePercent <= 50) {
      return 'LIMITED';
    } else {
      return 'AVAILABLE';
    }
  }
}
