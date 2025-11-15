import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
import { ReservationSlot, SlotWithCapacityStatus, GetSlotsQuery } from './types';
import { logger } from '../../utils/logger';

export class ReservationSlotsServiceMock {
  private slots: Map<number, ReservationSlot> = new Map();
  private nextId = 1;

  constructor() {
    this.seedInitialSlots();
  }

  /**
   * Seed initial slots for next 90 days
   */
  private seedInitialSlots() {
    const today = new Date();
    const endDate = addDays(today, 90);
    const days = eachDayOfInterval({ start: today, end: endDate });

    // Create 4 time slots per day
    const timeSlots = [
      { start: '09:00:00', end: '11:00:00' },
      { start: '12:00:00', end: '14:00:00' },
      { start: '15:00:00', end: '17:00:00' },
      { start: '18:00:00', end: '20:00:00' },
    ];

    days.forEach((day: Date) => {
      timeSlots.forEach(slot => {
        const slotData: ReservationSlot = {
          id: this.nextId++,
          date: format(day, 'yyyy-MM-dd'),
          start_time: slot.start,
          end_time: slot.end,
          venue_id: null,
          total_capacity: 200,
          booked_count: Math.floor(Math.random() * 150), // Random bookings for demo
          available_count: 0, // Will be calculated
          status: 'ACTIVE',
          orq: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        slotData.available_count = slotData.total_capacity - slotData.booked_count;

        // Update status based on capacity
        if (slotData.booked_count >= slotData.total_capacity) {
          slotData.status = 'FULL';
        }

        this.slots.set(slotData.id, slotData);
      });
    });

    logger.info('reservation_slots.seeded', { count: this.slots.size });
  }

  /**
   * Calculate capacity status for UI
   */
  private calculateCapacityStatus(slot: ReservationSlot): 'AVAILABLE' | 'LIMITED' | 'FULL' {
    const utilization = slot.booked_count / slot.total_capacity;

    if (utilization >= 1.0) return 'FULL';
    if (utilization > 0.5) return 'LIMITED';
    return 'AVAILABLE';
  }

  /**
   * Get available slots for calendar
   */
  async getAvailableSlots(query: GetSlotsQuery): Promise<SlotWithCapacityStatus[]> {
    const { month, date, orq } = query;

    let filteredSlots = Array.from(this.slots.values()).filter(s => s.orq === orq);

    // Filter by month
    if (month) {
      const [year, monthNum] = month.split('-');
      filteredSlots = filteredSlots.filter(s => {
        const slotMonth = s.date.substring(0, 7); // YYYY-MM
        return slotMonth === month;
      });
    }

    // Filter by specific date
    if (date) {
      filteredSlots = filteredSlots.filter(s => s.date === date);
    }

    // Add capacity_status to each slot
    const slotsWithStatus: SlotWithCapacityStatus[] = filteredSlots
      .filter(s => s.status === 'ACTIVE' || s.status === 'FULL')
      .map(slot => ({
        ...slot,
        capacity_status: this.calculateCapacityStatus(slot),
      }))
      .sort((a, b) => {
        // Sort by date, then by start_time
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });

    logger.info('slots.retrieved', {
      query,
      count: slotsWithStatus.length,
    });

    return slotsWithStatus;
  }

  /**
   * Get slot by ID
   */
  async getSlotById(slotId: number): Promise<ReservationSlot | null> {
    return this.slots.get(slotId) || null;
  }

  /**
   * Increment booked count (called when reservation created)
   */
  async incrementBookedCount(slotId: number): Promise<void> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }

    slot.booked_count += 1;
    slot.available_count = slot.total_capacity - slot.booked_count;
    slot.updated_at = new Date().toISOString();

    // Update status to FULL if at capacity
    if (slot.booked_count >= slot.total_capacity) {
      slot.status = 'FULL';
    }

    this.slots.set(slotId, slot);

    logger.info('slot.booked_count.incremented', {
      slot_id: slotId,
      booked_count: slot.booked_count,
      status: slot.status,
    });
  }

  /**
   * Check if slot has capacity
   */
  async hasCapacity(slotId: number): Promise<boolean> {
    const slot = this.slots.get(slotId);
    if (!slot) return false;

    return slot.booked_count < slot.total_capacity && slot.status !== 'CLOSED';
  }
}
