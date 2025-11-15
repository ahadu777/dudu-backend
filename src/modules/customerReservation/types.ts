export interface TicketValidationRequest {
  ticket_number: string;
  orq: number;
}

export interface TicketValidationResponse {
  valid: boolean;
  ticket?: {
    ticket_number: string;
    product_id: number;
    product_name: string;
    status: string;
    expires_at: string | null;
  };
  error?: string;
}

export interface VerifyContactRequest {
  ticket_number: string;
  visitor_name: string;
  visitor_phone: string;
  orq: number;
}

export interface VerifyContactResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CreateReservationRequest {
  ticket_number: string;
  slot_id: number;
  visitor_name: string;
  visitor_phone: string;
  orq: number;
}

export interface CreateReservationResponse {
  success: boolean;
  data?: {
    reservation_id: number;
    ticket_number: string;
    slot_id: number;
    slot_date: string;
    slot_time: string;
    visitor_name: string;
    status: string;
    created_at: string;
  };
  error?: string;
}

export interface TicketReservation {
  id: number;
  ticket_number: string;
  slot_id: number;
  visitor_name: string;
  visitor_phone: string;
  status: 'RESERVED' | 'VERIFIED' | 'CANCELLED' | 'EXPIRED';
  reserved_at: string;
  verified_at: string | null;
  orq: number;
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
