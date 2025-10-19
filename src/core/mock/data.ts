// Mock data store for development without database
export interface MockProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit_price: number;
  active: boolean;
  functions: Array<{
    function_code: string;
    function_name: string;
    max_uses: number;
  }>;
  inventory: {
    sellable_cap: number;
    reserved_count: number;
    sold_count: number;
  };
}

export interface MockOrder {
  id: number;
  user_id: number;
  out_trade_no: string;
  channel_id: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  subtotal: number;
  discount: number;
  total: number;
  payload_hash: string;
  items: Array<{
    product_id: number;
    qty: number;
    unit_price: number;
  }>;
  created_at: Date;
  paid_at?: Date;
}

export interface MockTicket {
  id: number;
  order_id: number;
  user_id: number;
  code: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  entitlements: Array<{
    function_code: string;
    remaining_uses: number;
  }>;
  created_at: Date;
}

class MockDataStore {
  private products: Map<number, MockProduct> = new Map();
  private orders: Map<string, MockOrder> = new Map(); // key: user_id-out_trade_no
  private tickets: Map<number, MockTicket> = new Map();
  private nextOrderId = 10001;
  private nextTicketId = 50001;

  constructor() {
    this.initializeProducts();
  }

  private initializeProducts() {
    // Seed products with mock data
    const seedProducts: MockProduct[] = [
      {
        id: 101,
        sku: 'DAYPASS-001',
        name: 'Day Pass',
        description: 'Full day access to all attractions',
        unit_price: 99.00,
        active: true,
        functions: [
          { function_code: 'ENTRY', function_name: 'Park Entry', max_uses: 1 },
          { function_code: 'FASTPASS', function_name: 'Fast Pass Access', max_uses: 3 }
        ],
        inventory: {
          sellable_cap: 1000,
          reserved_count: 0,
          sold_count: 0
        }
      },
      {
        id: 102,
        sku: 'VIP-001',
        name: 'VIP Pass',
        description: 'VIP access with exclusive benefits',
        unit_price: 299.00,
        active: true,
        functions: [
          { function_code: 'ENTRY', function_name: 'Park Entry', max_uses: 1 },
          { function_code: 'VIP_LOUNGE', function_name: 'VIP Lounge Access', max_uses: -1 },
          { function_code: 'FASTPASS', function_name: 'Unlimited Fast Pass', max_uses: -1 }
        ],
        inventory: {
          sellable_cap: 100,
          reserved_count: 0,
          sold_count: 0
        }
      },
      {
        id: 103,
        sku: 'FAMILY-001',
        name: 'Family Package (4 persons)',
        description: 'Family package for 4 people',
        unit_price: 350.00,
        active: true,
        functions: [
          { function_code: 'ENTRY', function_name: 'Park Entry', max_uses: 4 },
          { function_code: 'MEAL', function_name: 'Meal Voucher', max_uses: 4 }
        ],
        inventory: {
          sellable_cap: 200,
          reserved_count: 0,
          sold_count: 0
        }
      },
      {
        id: 104,
        sku: 'STUDENT-001',
        name: 'Student Pass',
        description: 'Discounted pass for students',
        unit_price: 59.00,
        active: true,
        functions: [
          { function_code: 'ENTRY', function_name: 'Park Entry', max_uses: 1 }
        ],
        inventory: {
          sellable_cap: 500,
          reserved_count: 0,
          sold_count: 0
        }
      },
      {
        id: 105,
        sku: 'SEASON-001',
        name: 'Season Pass',
        description: 'Unlimited access for 3 months',
        unit_price: 599.00,
        active: false, // Inactive product for testing
        functions: [
          { function_code: 'ENTRY', function_name: 'Park Entry', max_uses: -1 },
          { function_code: 'FASTPASS', function_name: 'Fast Pass Access', max_uses: -1 }
        ],
        inventory: {
          sellable_cap: 50,
          reserved_count: 0,
          sold_count: 50 // Sold out for testing
        }
      }
    ];

    seedProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  // Product operations
  getProduct(id: number): MockProduct | undefined {
    return this.products.get(id);
  }

  getAllProducts(): MockProduct[] {
    return Array.from(this.products.values());
  }

  getActiveProducts(): MockProduct[] {
    return Array.from(this.products.values()).filter(p => p.active);
  }

  // Order operations
  createOrder(order: Omit<MockOrder, 'id' | 'created_at'>): MockOrder {
    const newOrder: MockOrder = {
      ...order,
      id: this.nextOrderId++,
      created_at: new Date()
    };

    const key = `${order.user_id}-${order.out_trade_no}`;
    this.orders.set(key, newOrder);
    return newOrder;
  }

  getOrder(userId: number, outTradeNo: string): MockOrder | undefined {
    return this.orders.get(`${userId}-${outTradeNo}`);
  }

  getOrderById(orderId: number): MockOrder | undefined {
    for (const order of this.orders.values()) {
      if (order.id === orderId) {
        return order;
      }
    }
    return undefined;
  }

  updateOrderStatus(orderId: number, status: MockOrder['status'], paidAt?: Date): boolean {
    const order = this.getOrderById(orderId);
    if (order) {
      order.status = status;
      if (paidAt) {
        order.paid_at = paidAt;
      }
      return true;
    }
    return false;
  }

  // Inventory operations
  reserveInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    const available = product.inventory.sellable_cap -
                     product.inventory.reserved_count -
                     product.inventory.sold_count;

    if (available >= qty) {
      product.inventory.reserved_count += qty;
      return true;
    }
    return false;
  }

  commitInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    if (product.inventory.reserved_count >= qty) {
      product.inventory.reserved_count -= qty;
      product.inventory.sold_count += qty;
      return true;
    }
    return false;
  }

  releaseInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    product.inventory.reserved_count = Math.max(0, product.inventory.reserved_count - qty);
    return true;
  }

  // Ticket operations
  createTicket(ticket: Omit<MockTicket, 'id' | 'created_at'>): MockTicket {
    const newTicket: MockTicket = {
      ...ticket,
      id: this.nextTicketId++,
      created_at: new Date()
    };

    this.tickets.set(newTicket.id, newTicket);
    return newTicket;
  }

  getTicketsByUser(userId: number): MockTicket[] {
    return Array.from(this.tickets.values()).filter(t => t.user_id === userId);
  }

  getTicketByCode(code: string): MockTicket | undefined {
    for (const ticket of this.tickets.values()) {
      if (ticket.code === code) {
        return ticket;
      }
    }
    return undefined;
  }

  // Reset for testing
  reset() {
    this.orders.clear();
    this.tickets.clear();
    this.nextOrderId = 10001;
    this.nextTicketId = 50001;
    this.initializeProducts(); // Reset products to initial state
  }
}

// Singleton instance
export const mockDataStore = new MockDataStore();