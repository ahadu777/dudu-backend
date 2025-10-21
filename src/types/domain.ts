
// src/types/domain.ts
export type ISODate = string;
export type TicketCode = string;
export type OperatorToken = string;
export type SessionId = string;

export enum OrderStatus { CREATED='CREATED', PENDING_PAYMENT='PENDING_PAYMENT', PAID='PAID', CANCELLED='CANCELLED', REFUNDED='REFUNDED', PARTIALLY_REFUNDED='PARTIALLY_REFUNDED' }
export enum RefundStatus { PENDING='pending', PROCESSING='processing', SUCCESS='success', FAILED='failed' }
export enum TicketStatus { MINTED='minted', ASSIGNED='assigned', ACTIVE='active', PARTIALLY_REDEEMED='partially_redeemed', REDEEMED='redeemed', EXPIRED='expired', VOID='void' }
export enum ScanResult { SUCCESS='success', REJECT='reject' }
export enum ErrorCode { IDEMPOTENCY_CONFLICT='IDEMPOTENCY_CONFLICT', TOKEN_EXPIRED='TOKEN_EXPIRED', WRONG_FUNCTION='WRONG_FUNCTION', NO_REMAINING='NO_REMAINING', TICKET_INVALID='TICKET_INVALID', UNAUTHORIZED='UNAUTHORIZED', FORBIDDEN='FORBIDDEN', NOT_FOUND='NOT_FOUND' }

export interface FunctionSpec { function_code: string; label: string; quantity: number; }
export interface Product { id: number; sku: string; name: string; status: 'draft'|'active'|'archived'; sale_start_at?: ISODate|null; sale_end_at?: ISODate|null; functions: FunctionSpec[]; }
export interface CatalogResponse { products: Product[]; }

// Promotion detail types for enhanced product information
export interface PromotionDetail {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit_price: number;
  status: 'draft'|'active'|'archived';
  sale_start_at?: ISODate|null;
  sale_end_at?: ISODate|null;
  functions: FunctionSpec[];
  inventory: {
    sellable_cap: number;
    reserved_count: number;
    sold_count: number;
    available: number;
  };
  features?: string[];
  images?: string[];
}
export interface PromotionDetailResponse { promotion: PromotionDetail; }
export interface OrderItemRequest { product_id: number; qty: number; }
export interface Order { order_id: number; user_id: number; status: OrderStatus; items: OrderItemRequest[]; channel_id: number; out_trade_no: string; amounts?: { subtotal: number; discount: number; total: number; }; created_at: ISODate; paid_at?: ISODate|null; refund_amount?: number; refund_status?: 'none'|'partial'|'full'; }
export interface TicketEntitlement { function_code: string; label: string; remaining_uses: number; }
export interface Ticket { ticket_code: TicketCode; product_id: number; product_name: string; status: TicketStatus; expires_at?: ISODate|null; entitlements: TicketEntitlement[]; user_id: number; order_id: number; cancelled_at?: ISODate|null; cancellation_reason?: string|null; }
export interface QRTokenResponse { token: string; expires_in: number; }
export interface Operator { operator_id: number; username: string; password_hash: string; roles: string[]; }
export interface ValidatorSession { session_id: SessionId; operator_id: number; device_id: string; location_id?: number|null; created_at: ISODate; expires_at: ISODate; }
export interface RedemptionEvent { ticket_id: number; function_code: string; operator_id: number; session_id: SessionId; location_id?: number|null; jti?: string|null; result: ScanResult; reason?: string|null; ts: ISODate; }
export interface ApiError { code: ErrorCode|string; message: string; }
export const TicketTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.MINTED]: [TicketStatus.ASSIGNED, TicketStatus.VOID],
  [TicketStatus.ASSIGNED]: [TicketStatus.ACTIVE, TicketStatus.VOID, TicketStatus.EXPIRED],
  [TicketStatus.ACTIVE]: [TicketStatus.PARTIALLY_REDEEMED, TicketStatus.REDEEMED, TicketStatus.EXPIRED, TicketStatus.VOID],
  [TicketStatus.PARTIALLY_REDEEMED]: [TicketStatus.REDEEMED, TicketStatus.EXPIRED, TicketStatus.VOID],
  [TicketStatus.REDEEMED]: [], [TicketStatus.EXPIRED]: [], [TicketStatus.VOID]: []
};

// Cancellation and Refund Types
export interface TicketCancellationRequest { reason?: string; }
export interface TicketCancellationResponse { ticket_status: TicketStatus; refund_amount: number; refund_id: string; cancelled_at: ISODate; }
export interface RefundProcessingRequest { order_id: number; amount: number; reason: string; ticket_id?: number; }
export interface RefundProcessingResponse { refund_id: string; status: RefundStatus; amount: number; }
export interface Refund { refund_id: string; order_id: number; ticket_id?: number|null; amount: number; status: RefundStatus; reason: string; gateway_response?: any; created_at: ISODate; completed_at?: ISODate|null; }
export interface RefundListResponse { refunds: Refund[]; }
export interface CancellationPolicy { rule_type: 'redemption_based'|'time_based'|'product_based'; description: string; refund_percentage: number; conditions: any; }
export interface CancellationPolicyExample { scenario: string; ticket_status: string; redemptions_used: number; total_redemptions: number; refund_percentage: number; explanation: string; }
export interface CancellationPoliciesResponse { policies: CancellationPolicy[]; examples: CancellationPolicyExample[]; }

// User Profile and Settings Types
export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  notification_email?: boolean;
}

export interface UserSettings {
  notification_settings: NotificationSettings;
  privacy_settings: PrivacySettings;
  display_preferences: DisplayPreferences;
  updated_at: ISODate;
}

export interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  order_updates: boolean;
  promotional_emails: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private';
  show_purchase_history: boolean;
  data_sharing_consent: boolean;
}

export interface DisplayPreferences {
  language: 'en' | 'es' | 'fr' | 'de';
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currency_display: 'USD' | 'EUR' | 'GBP' | 'CAD';
}

export interface ActivityEntry {
  activity_id: string;
  type: 'profile' | 'order' | 'ticket' | 'login' | 'settings';
  action: string;
  description: string;
  timestamp: ISODate;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    resource_id?: string;
    changes?: any;
  };
  severity: 'info' | 'warning' | 'critical';
}

export interface ActivityHistory {
  activities: ActivityEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
