/**
 * 小程序订单类型定义
 * 基于 PRD-008 设计
 */

// ========== 通用类型 ==========

export type CustomerType = 'adult' | 'child' | 'elderly';

// ========== 请求类型 ==========

/**
 * 客户明细项（请求）
 */
export interface CustomerBreakdownInput {
  customer_type: CustomerType;
  count: number;
}

/**
 * 附加项（请求）
 */
export interface AddonInput {
  addon_id: string;
  quantity: number;
}

/**
 * 创建订单请求
 */
export interface CreateOrderRequest {
  order_no: string;                         // 订单号（前端生成，用于幂等）
  product_id: number;                       // 产品ID
  travel_date: string;                      // 出行日期 (YYYY-MM-DD)
  customer_breakdown: CustomerBreakdownInput[];  // 客户明细
  addons?: AddonInput[];                    // 附加项（可选）
}

// ========== 响应类型 ==========

/**
 * 定价明细项（响应）
 */
export interface CustomerPricingItem {
  customer_type: CustomerType;
  count: number;
  unit_price: number;
  total: number;
}

/**
 * 附加项明细（响应）
 */
export interface AddonPricingItem {
  addon_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * 定价上下文（存储到数据库）
 */
export interface PricingContext {
  travel_date: string;
  is_weekend: boolean;
  customer_breakdown: CustomerPricingItem[];
  addons: AddonPricingItem[];
  subtotal: number;
  addons_total: number;
}

/**
 * 创建订单响应
 */
export interface CreateOrderResponse {
  id: number;
  order_no: string;
  status: string;
  product_id: number;
  product_name: string;
  travel_date: string;
  quantity: number;
  total: number;
  pricing_context: PricingContext;
  created_at: string;
}

/**
 * 票券信息
 */
export interface TicketInfo {
  ticket_id: number;
  ticket_code: string;
  customer_type: CustomerType;
  status: string;
  qr_code?: string;
}

/**
 * 订单详情响应
 */
export interface OrderDetailResponse extends CreateOrderResponse {
  paid_at?: string;
  tickets?: TicketInfo[];
}

/**
 * 订单列表项
 */
export interface OrderListItem {
  order_id: number;
  order_no: string;
  status: string;
  product_id: number;
  product_name: string;
  travel_date: string;
  quantity: number;
  total: number;
  created_at: string;
  paid_at?: string;
}

/**
 * 订单列表响应
 */
export interface OrderListResponse {
  orders: OrderListItem[];
  total: number;
  page: number;
  page_size: number;
}
