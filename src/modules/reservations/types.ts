import { PassengerType } from '../travel/types';

export interface ReservationPassenger {
  passenger_type: PassengerType;
  count: number;
}

export interface CreateReservationRequest {
  route_id: string;
  travel_date: string;
  seats: ReservationPassenger[];
  hold_minutes?: number;
  idempotency_key?: string;
}

export type ReservationStatus = 'HELD' | 'RELEASED' | 'EXPIRED';

export interface ReservationRecord {
  reservation_id: string;
  route_id: string;
  travel_date: string;
  seats: ReservationPassenger[];
  seat_count: number;
  hold_minutes: number;
  status: ReservationStatus;
  lock_expire_at: string;
  created_at: string;
  updated_at: string;
  idempotency_key?: string;
}
