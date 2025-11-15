
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
  badges?: string[];
}
export interface PromotionDetailResponse { promotion: PromotionDetail; }
export interface OrderItemRequest {
  product_id: number;
  qty: number;
  pricing_context?: {
    booking_dates?: ISODate[];
    customer_breakdown?: CustomerBreakdown[];
    package_tier?: string;
    addons?: AddonSelection[];
  };
}
export interface Order {
  order_id: number;
  user_id: number;
  status: OrderStatus;
  items: OrderItemRequest[];
  channel_id: number;
  out_trade_no: string;
  amounts?: {
    subtotal: number;
    addons_total?: number;
    pricing_adjustments?: PricingAdjustment[];
    discount: number;
    total: number;
  };
  created_at: ISODate;
  paid_at?: ISODate|null;
  refund_amount?: number;
  refund_status?: 'none'|'partial'|'full';
  pricing_breakdown?: {
    calculation_timestamp: ISODate;
    per_item_details: any[];
    quote_id?: string;
  };
}
export interface TicketEntitlement { function_code: string; label: string; remaining_uses: number; }
export interface Ticket { ticket_code: TicketCode; product_id: number; product_name: string; status: TicketStatus; expires_at?: ISODate|null; entitlements: TicketEntitlement[]; user_id: number; order_id: number; cancelled_at?: ISODate|null; cancellation_reason?: string|null; }

// JTI (JWT Token ID) lifecycle tracking for QR code security
export interface JTIHistoryEntry {
  jti: string;
  issued_at: ISODate;
  status: 'PRE_GENERATED' | 'ACTIVE' | 'INVALIDATED' | 'USED';
}

export interface TicketRawMetadata {
  jti?: {
    pre_generated_jti?: string;    // Original JTI when ticket was bulk-generated
    current_jti: string;             // Currently valid JTI (updated on activation)
    jti_history?: JTIHistoryEntry[]; // Complete JTI lifecycle for audit trail
  };
  qr_metadata?: {
    issued_at: ISODate;
    expires_at: ISODate;
  };
  // Future extensibility: device info, customer preferences, etc.
  device_info?: Record<string, any>;
  customer_preferences?: Record<string, any>;
}

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

// Complex Pricing System Types (US-011)
export interface PricingStructure {
  base_price: number;
  pricing_rules: PricingRule[];
  package_tiers?: PackageTier[];
  addon_products?: AddonProduct[];
}

export interface PricingRule {
  rule_type: 'time_based' | 'customer_type' | 'special_date' | 'package_tier';
  conditions: {
    day_types?: ('weekday' | 'weekend' | 'holiday')[];
    customer_types?: ('adult' | 'child' | 'elderly')[];
    special_dates?: ISODate[];
    package_tier?: string;
  };
  price_modifier: {
    type: 'fixed' | 'percentage' | 'absolute';
    value: number;
  };
}

export interface PackageTier {
  tier_id: string;
  name: string;
  base_price_modifier: number;
  inclusions: PackageInclusion[];
}

export interface PackageInclusion {
  item_type: 'transport' | 'meal' | 'entertainment' | 'merchandise';
  item_code: string;
  item_name: string;
  quantity: number;
  estimated_value?: number;
}

export interface AddonProduct {
  addon_id: string;
  name: string;
  price: number;
  quantity_included: number;
  description?: string;
}

export interface CustomerBreakdown {
  customer_type: 'adult' | 'child' | 'elderly';
  count: number;
}

export interface AddonSelection {
  addon_id: string;
  quantity: number;
}

export interface PricingCalculationRequest {
  product_id: number;
  booking_dates: ISODate[];
  customer_breakdown: CustomerBreakdown[];
  addons?: AddonSelection[];
  package_tier?: string;
}

export interface PricingCalculationResponse {
  base_price: number;
  adjustments: PricingAdjustment[];
  addons_total: number;
  final_total: number;
  breakdown: PricingBreakdown;
}

export interface PricingAdjustment {
  rule_type: string;
  description: string;
  amount: number;
  calculation_basis: string;
}

export interface PricingBreakdown {
  per_customer_costs: CustomerCost[];
  addon_details: AddonCost[];
  time_adjustments: TimeAdjustment[];
  package_tier_info?: PackageTierInfo;
}

export interface CustomerCost {
  customer_type: 'adult' | 'child' | 'elderly';
  count: number;
  unit_price: number;
  total_cost: number;
}

export interface AddonCost {
  addon_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
}

export interface TimeAdjustment {
  date: ISODate;
  day_type: 'weekday' | 'weekend' | 'holiday' | 'special';
  adjustment_amount: number;
  adjustment_reason: string;
}

export interface PackageTierInfo {
  tier_id: string;
  tier_name: string;
  modifier_applied: number;
}

// Admin package configuration types
export interface TemplateEntitlement {
  function_code: string;
  label: string;
  quantity: number;
  redemption_channel: 'mobile' | 'operator' | 'self_service';
  requires_id_verification: boolean;
  validity_type: 'absolute' | 'relative';
  validity_duration_days?: number;
  validity_start_at?: ISODate;
  validity_end_at?: ISODate;
}

export interface PricingTier {
  tier_id: string;
  name: string;
  customer_types: ('adult' | 'child' | 'elderly')[];
  price: number;
  currency: string;
}

export interface PackageTemplateUpsertRequest {
  name: string;
  entitlements: TemplateEntitlement[];
  pricing: {
    currency: string;
    tiers: PricingTier[];
  };
  status?: 'draft' | 'active' | 'archived';
  version?: string;
  description?: string;
}

export interface PackageTemplate {
  templateId: string;
  version: string;
  name: string;
  description?: string;
  entitlements: TemplateEntitlement[];
  pricing: {
    currency: string;
    tiers: PricingTier[];
  };
  status: 'draft' | 'active' | 'archived';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PackageTemplateHistoryResponse {
  templateId: string;
  versions: PackageTemplate[];
}

export interface FareTier {
  passenger_type: 'adult' | 'child' | 'elderly';
  price: number;
  currency: string;
  lock_minutes?: number;
}

export interface RouteFareUpsertRequest {
  routeCode: string;
  fares: FareTier[];
  lockMinutes?: number;
  blackoutDates?: ISODate[];
}

export interface RouteFareConfig {
  routeCode: string;
  fares: FareTier[];
  lockMinutes: number;
  blackoutDates: ISODate[];
  updatedAt: ISODate;
  revision: number;
}

export interface RouteFareHistoryResponse {
  routeCode: string;
  revisions: RouteFareConfig[];
}
