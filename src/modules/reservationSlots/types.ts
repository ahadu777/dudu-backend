export interface ReservationSlot {
  id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  venue_id: number | null;
  total_capacity: number;
  booked_count: number;
  available_count: number;
  status: 'ACTIVE' | 'FULL' | 'CLOSED';
  orq: number;
  created_at: string;
  updated_at: string;
}

export interface SlotWithCapacityStatus extends ReservationSlot {
  capacity_status: 'AVAILABLE' | 'LIMITED' | 'FULL';
}

export interface GetSlotsQuery {
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD
  orq: number;
}

export interface GetSlotsResponse {
  success: boolean;
  data: SlotWithCapacityStatus[];
  metadata: {
    month: string;
    total_slots: number;
    unique_dates: number;
  };
}
