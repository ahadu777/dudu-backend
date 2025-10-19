export interface CreateOrderRequest {
  items: Array<{
    product_id: number;
    qty: number;
  }>;
  channel_id: number;
  out_trade_no: string;
  coupon_code?: string;
}

export interface OrderResponse {
  order_id: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  amounts: {
    subtotal: number;
    discount: number;
    total: number;
  };
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  unit_price: number;
  active: boolean;
}

export interface ProductInventory {
  product_id: number;
  sellable_cap: number;
  reserved_count: number;
  sold_count: number;
}

export interface Order {
  id: number;
  user_id: number;
  out_trade_no: string;
  channel_id: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  payload_hash: string;
  paid_at?: Date;
  created_at: Date;
}