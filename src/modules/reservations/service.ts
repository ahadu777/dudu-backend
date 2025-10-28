import { travelInventory } from '../travel/inventory';
import { CreateReservationRequest, ReservationRecord } from './types';

interface CreateReservationFailure {
  ok: false;
  reason: 'INVALID_REQUEST' | 'ROUTE_UNAVAILABLE' | 'SEATS_UNAVAILABLE';
  message: string;
}

interface CreateReservationSuccess {
  ok: true;
  reservation: ReservationRecord;
  reused: boolean;
}

interface ReleaseSuccess {
  ok: true;
  reservation: ReservationRecord;
}

interface ReleaseFailure {
  ok: false;
  reason: 'NOT_FOUND' | 'ALREADY_RELEASED' | 'EXPIRED';
  message: string;
}

const reservationsById = new Map<string, ReservationRecord>();
const reservationsByKey = new Map<string, string>();

let sequence = 1;

const buildReservationId = (): string => {
  const id = `RSV-${Date.now()}-${sequence.toString().padStart(4, '0')}`;
  sequence = sequence === Number.MAX_SAFE_INTEGER ? 1 : sequence + 1;
  return id;
};

const toSeatCount = (seats: CreateReservationRequest['seats']): number =>
  seats.reduce((acc, seat) => acc + Math.max(0, seat.count || 0), 0);

const cleanupExpiredReservations = (): void => {
  const now = Date.now();
  for (const reservation of reservationsById.values()) {
    if (reservation.status !== 'HELD') {
      continue;
    }

    const expiresAt = Date.parse(reservation.lock_expire_at);
    if (Number.isNaN(expiresAt) || expiresAt > now) {
      continue;
    }

    travelInventory.releaseSeats(reservation.route_id, reservation.travel_date, reservation.seat_count);
    reservation.status = 'EXPIRED';
    reservation.updated_at = new Date().toISOString();
  }
};

export const reservationService = {
  create(request: CreateReservationRequest): CreateReservationSuccess | CreateReservationFailure {
    cleanupExpiredReservations();

    if (!request.route_id || !request.travel_date || !request.seats || request.seats.length === 0) {
      return {
        ok: false,
        reason: 'INVALID_REQUEST',
        message: 'route_id, travel_date, seats are required'
      };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.travel_date)) {
      return {
        ok: false,
        reason: 'INVALID_REQUEST',
        message: 'travel_date must be formatted as YYYY-MM-DD'
      };
    }

    const holdMinutes = request.hold_minutes ?? 10;
    if (holdMinutes <= 0 || holdMinutes > 30) {
      return {
        ok: false,
        reason: 'INVALID_REQUEST',
        message: 'hold_minutes must be between 1 and 30'
      };
    }

    const seatCount = toSeatCount(request.seats);
    if (seatCount <= 0) {
      return {
        ok: false,
        reason: 'INVALID_REQUEST',
        message: 'seats count must be greater than 0'
      };
    }

    const idempotencyKey = request.idempotency_key?.trim();
    if (idempotencyKey) {
      const existingId = reservationsByKey.get(idempotencyKey);
      if (existingId) {
        const existingReservation = reservationsById.get(existingId);
        if (existingReservation) {
          return {
            ok: true,
            reservation: existingReservation,
            reused: true
          };
        }
      }
    }

    const availability = travelInventory.getAvailability(request.route_id, request.travel_date);
    if (!availability) {
      return {
        ok: false,
        reason: 'ROUTE_UNAVAILABLE',
        message: 'Route not found for supplied route_id'
      };
    }

    if (!travelInventory.reserveSeats(request.route_id, request.travel_date, seatCount)) {
      return {
        ok: false,
        reason: 'SEATS_UNAVAILABLE',
        message: 'Insufficient availability for requested seats'
      };
    }

    const nowIso = new Date().toISOString();
    const lockExpireAt = new Date(
      Date.now() + holdMinutes * 60 * 1000
    ).toISOString();

    const reservation: ReservationRecord = {
      reservation_id: buildReservationId(),
      route_id: request.route_id,
      travel_date: request.travel_date,
      seats: request.seats,
      seat_count: seatCount,
      hold_minutes: holdMinutes,
      status: 'HELD',
      lock_expire_at: lockExpireAt,
      created_at: nowIso,
      updated_at: nowIso,
      idempotency_key: idempotencyKey
    };

    reservationsById.set(reservation.reservation_id, reservation);
    if (idempotencyKey) {
      reservationsByKey.set(idempotencyKey, reservation.reservation_id);
    }

    return {
      ok: true,
      reservation,
      reused: false
    };
  },

  release(reservationId: string): ReleaseSuccess | ReleaseFailure {
    cleanupExpiredReservations();

    const reservation = reservationsById.get(reservationId);
    if (!reservation) {
      return {
        ok: false,
        reason: 'NOT_FOUND',
        message: 'Reservation not found'
      };
    }

    if (reservation.status === 'RELEASED') {
      return {
        ok: false,
        reason: 'ALREADY_RELEASED',
        message: 'Reservation already released'
      };
    }

    if (reservation.status === 'EXPIRED') {
      return {
        ok: false,
        reason: 'EXPIRED',
        message: 'Reservation already expired'
      };
    }

    travelInventory.releaseSeats(reservation.route_id, reservation.travel_date, reservation.seat_count);
    reservation.status = 'RELEASED';
    reservation.updated_at = new Date().toISOString();

    return {
      ok: true,
      reservation
    };
  }
};
