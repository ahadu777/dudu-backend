/**
 * OTA 模块类型定义
 *
 * 所有 OTA API 的请求/响应类型
 */

// ============== 库存相关 ==============

export interface OTAInventoryResponse {
  available_quantities: { [productId: number]: number };
  pricing_context: {
    base_prices: { [productId: number]: { weekday: number; weekend: number } };
    customer_types: string[];
    special_dates: { [date: string]: { multiplier: number } };
    customer_discounts?: { [productId: number]: { [type: string]: number } };
  };
  product_info: {
    [productId: number]: {
      name: string;
      description: string;
      category: string;
    };
  };
}

// ============== 预订相关 ==============

export interface OTAReserveRequest {
  product_id: number;
  quantity: number;
  reservation_expires_at?: string;
}

export interface OTAReserveResponse {
  reservation_id: string;
  reserved_until: string;
  pricing_snapshot: {
    base_price: number;
    weekend_premium?: number;
    customer_discounts?: { [type: string]: number };  // Legacy field (deprecated)
    customer_type_pricing?: Array<{
      customer_type: 'adult' | 'child' | 'elderly';
      unit_price: number;
      discount_applied: number;
    }>;
    currency?: string;
    captured_at?: string;
  };
}

export interface OTAActivateRequest {
  customer_details: {
    name: string;
    email: string;
    phone: string;
  };
  customer_type?: Array<'adult' | 'child' | 'elderly'>;  // Array matching ticket quantity
  visit_date?: string;  // Intended visit date (YYYY-MM-DD) - used for weekend pricing
  payment_reference: string;
  special_requests?: string;
}

export interface OTAActivateResponse {
  order_id: string;
  tickets: any[];
  total_amount: number;
  confirmation_code: string;
}

// ============== 票务生成相关 ==============

export interface OTABulkGenerateRequest {
  product_id: number;
  quantity: number;
  batch_id?: string;  // 可选：前端可传入自定义批次ID，不传则由后端自动生成
  distribution_mode?: 'direct_sale' | 'reseller_batch';
  special_pricing?: {
    base_price: number;
    customer_type_pricing: Array<{
      customer_type: 'adult' | 'child' | 'elderly';
      unit_price: number;
      discount_applied: number;
    }>;
    weekend_premium: number;
    currency: string;
  };
  reseller_metadata?: {
    intended_reseller: string;
    batch_purpose: string;
    distribution_notes?: string;
    margin_guidance?: number;
  };
  batch_metadata?: {
    campaign_type?: 'early_bird' | 'flash_sale' | 'group_discount' | 'seasonal' | 'standard';
    campaign_name?: string;
    special_conditions?: string[];
    marketing_tags?: string[];
    promotional_code?: string;
    notes?: string;
  };
}

export interface OTABulkGenerateResponse {
  batch_id: string;
  distribution_mode: string;
  pricing_snapshot?: any;
  reseller_metadata?: any;
  batch_metadata?: any;
  expires_at?: string;
  tickets: any[];
  total_generated: number;
}

export interface OTATicketActivateRequest {
  customer_details: {
    name: string;
    email: string;
    phone: string;
  };
  customer_type: 'adult' | 'child' | 'elderly';  // Required: determines pricing
  visit_date?: string;  // Optional: YYYY-MM-DD format - used for weekend pricing calculation
  payment_reference: string;
}

export interface OTATicketActivateResponse {
  ticket_code: string;
  order_id: string;
  customer_name: string;
  customer_type: 'adult' | 'child' | 'elderly';
  ticket_price: number;
  currency: string;
  status: string;
  activated_at: string;
}

// ============== 票务列表相关 ==============

export interface OTATicketFilters {
  status?: string;
  batch_id?: string;
  customer_type?: string;
  page?: number;
  page_size?: number;
  limit?: number;  // 兼容旧参数
  created_after?: string;
  created_before?: string;
}

export interface OTATicketListResponse {
  tickets: Array<{
    ticket_code: string;
    status: string;
    batch_id: string | null;
    product_id: number;
    qr_code: string | null;
    created_at: string;
    activated_at: string | null;
    order_id: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_type: string | null;
    reseller_name: string | null;
    distribution_mode: string | null;
  }>;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  // 兼容旧格式
  total_count?: number;
  page?: number;
  page_size?: number;
}

// ============== 分销商相关 ==============

export interface OTAResellerCreateRequest {
  name: string;
  contact_email: string;
  contact_phone?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive';
}

export interface OTAResellerUpdateRequest {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive';
}

// ============== 分析相关 ==============

export interface OTAAnalyticsPeriod {
  start_date?: string;
  end_date?: string;
}

export interface OTACampaignFilters {
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
}

// ============== 仪表板相关 ==============

export interface OTADashboardOptions {
  partner_id?: string;
  period?: OTAAnalyticsPeriod;
  start_date?: string;
  end_date?: string;
}

// ============== 工具函数 ==============

/**
 * 检查日期是否为周末（周六或周日）
 * @param dateString - 日期字符串 (YYYY-MM-DD) 或 Date 对象
 * @returns true 如果是周六(6)或周日(0)
 */
export function isWeekend(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;  // Sunday = 0, Saturday = 6
}
