/**
 * OTA Order Management Example
 *
 * Demonstrates how to retrieve OTA orders and access customer tickets with QR codes.
 * This enables OTA platforms to provide order management and ticket delivery services.
 */

interface OrderListRequest {
  limit?: number;
  offset?: number;
  status?: 'confirmed' | 'completed' | 'cancelled';
}

interface OrderListResponse {
  orders: Array<{
    order_id: string;
    product_id: number;
    customer_name: string;
    customer_email: string;
    total_amount: string;
    status: 'confirmed' | 'completed' | 'cancelled';
    created_at: string;
    confirmation_code: string;
  }>;
  total_count: number;
}

interface OrderTicketsResponse {
  tickets: Array<{
    ticket_code: string;
    qr_code: string;
    entitlements: Array<{
      function_code: string;
      remaining_uses: number;
    }>;
    status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  }>;
}

class OTAOrderManagement {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'http://localhost:8080', apiKey: string = 'test-api-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Retrieve list of OTA orders with pagination and filtering
   */
  async listOrders(request: OrderListRequest = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.offset) params.append('offset', request.offset.toString());
    if (request.status) params.append('status', request.status);

    const response = await fetch(`${this.baseUrl}/api/ota/orders?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Order listing failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get tickets and QR codes for a specific order
   */
  async getOrderTickets(orderId: string): Promise<OrderTicketsResponse> {
    const response = await fetch(`${this.baseUrl}/api/ota/orders/${orderId}/tickets`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Ticket retrieval failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }
}

// Example usage
async function example() {
  const ota = new OTAOrderManagement();

  try {
    console.log('📋 Retrieving OTA orders...');

    // List recent orders
    const orders = await ota.listOrders({
      limit: 10,
      status: 'confirmed'
    });

    console.log(`✅ Found ${orders.total_count} confirmed orders:`);
    orders.orders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.order_id} - ${order.customer_name} (${order.total_amount})`);
    });

    // Get tickets for the first order (if any)
    if (orders.orders.length > 0) {
      const firstOrder = orders.orders[0];
      console.log(`\n🎫 Getting tickets for order ${firstOrder.order_id}...`);

      const tickets = await ota.getOrderTickets(firstOrder.order_id);

      console.log(`✅ Retrieved ${tickets.tickets.length} tickets:`);
      tickets.tickets.forEach((ticket, index) => {
        console.log(`  ${index + 1}. ${ticket.ticket_code} (${ticket.status})`);
        console.log(`      QR: ${ticket.qr_code.substring(0, 50)}...`);
        console.log(`      Entitlements: ${ticket.entitlements.map(e => e.function_code).join(', ')}`);
      });
    }

    return { orders, tickets: orders.orders.length > 0 ? await ota.getOrderTickets(orders.orders[0].order_id) : null };
  } catch (error) {
    console.error('❌ Order management failed:', error.message);
    throw error;
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { OTAOrderManagement, OrderListRequest, OrderListResponse, OrderTicketsResponse };