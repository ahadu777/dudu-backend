// Reservation Slot Types
export interface ReservationSlot {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  venue_id: number;
  total_capacity: number;
  booked_count: number;
  available_count: number; // Calculated: total_capacity - booked_count
  status: SlotStatus;
  orq: number;
  created_at: string;
  updated_at: string;
}

export type SlotStatus = 'ACTIVE' | 'FULL' | 'CLOSED';

export type CapacityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL';

// API Request/Response Types

export interface CreateSlotRequest {
  venue_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  total_capacity: number;
  orq: number;
}

export interface CreateSlotResponse {
  success: boolean;
  data?: ReservationSlot;
  error?: string;
}

export interface UpdateSlotRequest {
  total_capacity?: number;
  status?: SlotStatus;
}

export interface UpdateSlotResponse {
  success: boolean;
  data?: ReservationSlot;
  error?: string;
}

export interface DeleteSlotResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GetSlotsQuery {
  venue_id?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  status?: SlotStatus;
  orq: number;
}

export interface GetSlotsResponse {
  success: boolean;
  data?: ReservationSlot[];
  meta?: {
    total: number;
    venue_id?: number;
    date_range?: {
      from: string;
      to: string;
    };
  };
  error?: string;
}

export interface SlotAvailabilityResponse {
  success: boolean;
  data?: Array<{
    date: string;
    slots: Array<{
      id: string;
      start_time: string;
      end_time: string;
      total_capacity: number;
      available_count: number;
      capacity_status: CapacityStatus;
      status: SlotStatus;
    }>;
  }>;
  error?: string;
}
