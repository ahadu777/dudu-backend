import { directusService } from '../../utils/directus';
import { logger } from '../../utils/logger';

export class ReservationSlotServiceDirectus {
  /**
   * Get available slots for customer view (grouped by date)
   * Fetches real data from Directus reservation_slots collection
   */
  async getAvailableSlots(
    month: string,
    orq: number,
    venueId?: number
  ): Promise<Array<{ date: string; slots: Array<any> }>> {
    logger.info('directus.reservation_slots.get_available.start', { month, orq, venueId });

    // Fetch slots from Directus
    const slots = await directusService.getAvailableSlots({
      month,
      orq,
      venue_id: venueId
    });

    if (!slots || slots.length === 0) {
      logger.warn('directus.reservation_slots.no_slots_found', { month, orq, venueId });
      return [];
    }

    // Filter by month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const filteredSlots = slots.filter(slot => {
      const slotDate = new Date(slot.date);
      return slotDate >= startDate && slotDate <= endDate;
    });

    // Group by date
    const grouped = new Map<string, any[]>();

    filteredSlots.forEach(slot => {
      if (!grouped.has(slot.date)) {
        grouped.set(slot.date, []);
      }

      // Calculate available_count (virtual property)
      const available_count = slot.total_capacity - (slot.booked_count || 0);

      // Calculate capacity status
      const availablePercent = (available_count / slot.total_capacity) * 100;
      let capacityStatus: 'AVAILABLE' | 'LIMITED' | 'FULL' = 'AVAILABLE';

      if (availablePercent === 0) {
        capacityStatus = 'FULL';
      } else if (availablePercent <= 50) {
        capacityStatus = 'LIMITED';
      }

      grouped.get(slot.date)!.push({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        total_capacity: slot.total_capacity,
        available_count,
        capacity_status: capacityStatus,
        status: slot.status
      });
    });

    // Convert to array and sort
    const result = Array.from(grouped.entries())
      .map(([date, slots]) => ({ date, slots }))
      .sort((a, b) => a.date.localeCompare(b.date));

    logger.info('directus.reservation_slots.get_available.success', {
      month,
      orq,
      dates_count: result.length,
      total_slots: filteredSlots.length
    });

    return result;
  }
}
