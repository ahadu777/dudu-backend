export interface OperatorLoginRequest {
  operator_id: string;
  password: string;
  terminal_id: string;
  orq: number;
}

export interface OperatorLoginResponse {
  success: boolean;
  data?: {
    operator_id: string;
    operator_name: string;
    terminal_id: string;
    session_token: string;
    expires_at: string;
  };
  error?: string;
}

export interface ValidateTicketRequest {
  ticket_code: string;
  operator_id: string;
  terminal_id: string;
  orq: number;
}

export interface ValidateTicketResponse {
  success: boolean;
  validation_result?: {
    ticket_code: string;
    status: 'RESERVED' | 'VERIFIED' | 'EXPIRED' | 'INVALID';
    color_code: 'GREEN' | 'YELLOW' | 'RED';
    message: string;
    details: {
      visitor_name: string;
      slot_date: string;
      slot_time: string;
      product_name: string;
    };
    allow_entry: boolean;
  };
  error?: string;
}

export interface VerifyTicketRequest {
  ticket_code: string;
  operator_id: string;
  terminal_id: string;
  validation_decision: 'ALLOW' | 'DENY';
  orq: number;
}

export interface VerifyTicketResponse {
  success: boolean;
  data?: {
    ticket_code: string;
    verification_status: 'VERIFIED' | 'DENIED';
    verified_at: string;
    operator_id: string;
    terminal_id: string;
  };
  error?: string;
}

export interface OperatorSession {
  operator_id: string;
  operator_name: string;
  terminal_id: string;
  session_token: string;
  expires_at: string;
  orq: number;
  created_at: string;
}

export interface ValidationLog {
  id: number;
  ticket_code: string;
  operator_id: string;
  terminal_id: string;
  validation_result: 'GREEN' | 'YELLOW' | 'RED';
  decision: 'ALLOW' | 'DENY' | null;
  validated_at: string;
  verified_at: string | null;
  orq: number;
}
