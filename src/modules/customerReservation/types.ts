export interface TicketValidationRequest {
  ticket_code: string;
  orq: number;
}

export type ReservationSource = 'direct' | 'ota';

export interface TicketValidationResponse {
  valid: boolean;
  ticket?: {
    ticket_code: string;
    product_id: number;
    product_name: string;
    status: string;
    expires_at: string | null;
    reserved_at?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    order_id?: number | null;
    source?: ReservationSource; // NEW: ticket source
  };
  error?: string;
}

export interface VerifyContactRequest {
  ticket_code: string;
  orq: number;
}

export interface VerifyContactResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CreateReservationRequest {
  ticket_code: string;
  slot_id: string;
  orq: number;
  customer_email?: string;  // Optional: if provided, use this instead of fetching from ticket
  customer_phone?: string;  // Optional: if provided, use this instead of fetching from ticket
}

export interface CreateReservationResponse {
  success: boolean;
  data?: {
    reservation_id: string;
    ticket_code: string;
    source?: ReservationSource; // NEW: ticket source
    slot_id: string; // UUID string
    slot_date: string;
    slot_time: string;
    customer_email: string;
    customer_phone: string;
    status: string;
    created_at: string;
  };
  error?: string;
}

export interface TicketReservation {
  id: string;
  ticket_code: string;
  slot_id: string; // UUID string
  visitor_name: string;  // customer_email (legacy field name)
  visitor_phone: string; // customer_phone (legacy field name)
  customer_name?: string; // NEW: optional customer name
  status: 'RESERVED' | 'VERIFIED' | 'CANCELLED' | 'EXPIRED';
  reserved_at: string;
  verified_at: string | null;
  orq: number;
  source?: ReservationSource; // reservation source
  created_at: string;
  updated_at: string;
}

// Ticket status enum for reference
export type TicketStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVATED'
  | 'RESERVED'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ModifyReservationRequest {
  reservation_id: string;
  new_slot_id: string;
}

export interface ModifyReservationResponse {
  success: boolean;
  data?: {
    reservation_id: string;
    ticket_code: string;
    new_slot_id: string;
    new_slot_date: string;
    new_slot_time: string;
    updated_at: string;
  };
  error?: string;
}

export interface CancelReservationRequest {
  reservation_id: string;
}

export interface CancelReservationResponse {
  success: boolean;
  message?: string;
  data?: {
    reservation_id: string;
    ticket_status: string;
    cancelled_at: string;
  };
  error?: string;
}
