import { TRAVEL_ROUTES } from './data';
import { AvailabilitySnapshot } from './types';

interface ReservationLedgerEntry {
  reserved: number;
}

const availabilityLedger = new Map<string, ReservationLedgerEntry>();

const routeIndex = new Map(TRAVEL_ROUTES.map(route => [route.routeId, route]));

const buildKey = (routeId: string, travelDate: string): string =>
  `${routeId}:${travelDate}`;

export const travelInventory = {
  getAvailability(routeId: string, travelDate: string): AvailabilitySnapshot | null {
    const route = routeIndex.get(routeId);
    if (!route) {
      return null;
    }

    const key = buildKey(routeId, travelDate);
    const entry = availabilityLedger.get(key) ?? { reserved: 0 };
    const reserved = entry.reserved;
    const capacity = route.seatCapacity;
    const available = Math.max(capacity - reserved, 0);

    return {
      routeId,
      travelDate,
      capacity,
      reserved,
      available
    };
  },

  reserveSeats(routeId: string, travelDate: string, seatCount: number): boolean {
    if (seatCount <= 0) return false;

    const route = routeIndex.get(routeId);
    if (!route) return false;

    if (travelDate.length !== 10) return false; // simple YYYY-MM-DD guard

    const current = this.getAvailability(routeId, travelDate);
    if (!current) return false;
    if (seatCount > current.available) {
      return false;
    }

    const key = buildKey(routeId, travelDate);
    availabilityLedger.set(key, {
      reserved: current.reserved + seatCount
    });

    return true;
  },

  releaseSeats(routeId: string, travelDate: string, seatCount: number): void {
    if (seatCount <= 0) return;

    const key = buildKey(routeId, travelDate);
    const existing = availabilityLedger.get(key);
    if (!existing) return;

    const nextReserved = Math.max(existing.reserved - seatCount, 0);
    if (nextReserved === 0) {
      availabilityLedger.delete(key);
    } else {
      availabilityLedger.set(key, { reserved: nextReserved });
    }
  }
};
