export interface OrdersCreated {
  order_id: number;
  user_id: number;
  items: Array<{
    product_id: number;
    qty: number;
    unit_price: number;
  }>;
  channel_id: number;
  amounts: {
    subtotal: number;
    discount: number;
    total: number;
  };
  out_trade_no: string;
  ts: string;
}

export interface OrdersPaid {
  order_id: number;
  user_id: number;
  items: Array<{
    product_id: number;
    qty: number;
    unit_price: number;
  }>;
  total: number;
  paid_at: string;
}

export interface TicketsAssigned {
  order_id: number;
  user_id: number;
  tickets: Array<{
    ticket_id: number;
    code: string;
  }>;
  entitlements: Array<{
    ticket_id: number;
    function_code: string;
    remaining_uses: number;
  }>;
}

export interface RedemptionRecorded {
  ticket_id: number;
  function_code: string;
  operator_id: number;
  location_id: number;
  result: 'success' | 'reject';
  reason?: string;
  ts: string;
}