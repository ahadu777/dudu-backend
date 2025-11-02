// Mock data store for development without database
export interface ChannelAllocation {
  allocated: number;
  reserved: number;
  sold: number;
}

export interface ChannelReservation {
  reservation_id: string;
  product_id: number;
  channel_id: string;
  quantity: number;
  status: 'active' | 'expired' | 'activated' | 'cancelled';
  expires_at: Date;
  created_at: Date;
  activated_at?: Date;
  order_id?: number;
}

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
  channel_allocations: {
    [channel: string]: ChannelAllocation;
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
  private reservations: Map<string, ChannelReservation> = new Map(); // key: reservation_id
  private nextOrderId = 10001;
  private nextTicketId = 50001;
  private nextReservationId = 1;

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
        },
        channel_allocations: {
          direct: { allocated: 1000, reserved: 0, sold: 0 },
          ota: { allocated: 0, reserved: 0, sold: 0 }
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
        },
        channel_allocations: {
          direct: { allocated: 100, reserved: 0, sold: 0 },
          ota: { allocated: 0, reserved: 0, sold: 0 }
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
        },
        channel_allocations: {
          direct: { allocated: 200, reserved: 0, sold: 0 },
          ota: { allocated: 0, reserved: 0, sold: 0 }
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
        },
        channel_allocations: {
          direct: { allocated: 500, reserved: 0, sold: 0 },
          ota: { allocated: 0, reserved: 0, sold: 0 }
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
        },
        channel_allocations: {
          direct: { allocated: 50, reserved: 0, sold: 50 },
          ota: { allocated: 0, reserved: 0, sold: 0 }
        }
      },
      // Cruise products with base pricing (complex pricing handled separately)
      {
        id: 106,
        sku: 'CRUISE-2025-PREMIUM',
        name: 'Premium Plan - 中環長洲來回船票',
        description: 'Premium cruise experience with ferry, gifts, and playground tokens',
        unit_price: 288.00, // Base weekday adult price
        active: true,
        functions: [
          { function_code: 'ferry', function_name: '中環(五號碼頭)至長洲來回船票', max_uses: 1 },
          { function_code: 'monchhichi_gift', function_name: 'Monchhichi首盒禮品', max_uses: 1 },
          { function_code: 'playground_tokens', function_name: '遊樂場全日門票及代幣', max_uses: 10 }
        ],
        inventory: {
          sellable_cap: 3000, // Increased to accommodate OTA allocation
          reserved_count: 0,
          sold_count: 0
        },
        channel_allocations: {
          direct: { allocated: 1000, reserved: 0, sold: 0 },
          ota: { allocated: 2000, reserved: 0, sold: 0 } // 2000 units for OTA
        }
      },
      {
        id: 107,
        sku: 'CRUISE-2025-PET',
        name: 'Pet Plan - 寵物友善船票',
        description: 'Pet-friendly cruise with special facilities',
        unit_price: 188.00, // Flat rate for all
        active: true,
        functions: [
          { function_code: 'pet_ferry', function_name: '中環(五號碼頭)至長洲來回船票(寵物)', max_uses: 1 },
          { function_code: 'pet_playground', function_name: '遊樂場寵物區', max_uses: 1 }
        ],
        inventory: {
          sellable_cap: 2000, // Increased to accommodate OTA allocation
          reserved_count: 0,
          sold_count: 0
        },
        channel_allocations: {
          direct: { allocated: 500, reserved: 0, sold: 0 },
          ota: { allocated: 1500, reserved: 0, sold: 0 } // 1500 units for OTA
        }
      },
      {
        id: 108,
        sku: 'CRUISE-2025-DELUXE',
        name: 'Deluxe Tea Set For Two - 頂級雙人體驗',
        description: 'Premium VIP cruise experience with exclusive amenities',
        unit_price: 788.00, // Base weekday adult price
        active: true,
        functions: [
          { function_code: 'vip_ferry', function_name: '中環(五號碼頭)至長洲來回船票(VIP)', max_uses: 2 },
          { function_code: 'monchhichi_gift_x2', function_name: 'Monchhichi首盒禮品 X2', max_uses: 2 },
          { function_code: 'playground_tokens', function_name: '遊樂場代幣20個', max_uses: 20 },
          { function_code: 'tea_set', function_name: 'Monchhichi Tea Set', max_uses: 1 }
        ],
        inventory: {
          sellable_cap: 1800, // Increased to accommodate OTA allocation
          reserved_count: 0,
          sold_count: 0
        },
        channel_allocations: {
          direct: { allocated: 300, reserved: 0, sold: 0 },
          ota: { allocated: 1500, reserved: 0, sold: 0 } // 1500 units for OTA
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

  // Channel management operations
  getChannelAvailability(channelId: string, productIds?: number[]): { [productId: number]: number } {
    const availability: { [productId: number]: number } = {};

    const productsToCheck = productIds || Array.from(this.products.keys());

    for (const productId of productsToCheck) {
      const product = this.products.get(productId);
      if (product && product.channel_allocations[channelId]) {
        const allocation = product.channel_allocations[channelId];
        availability[productId] = allocation.allocated - allocation.reserved - allocation.sold;
      }
    }

    return availability;
  }

  createChannelReservation(productId: number, channelId: string, quantity: number, ttlHours: number = 24): ChannelReservation | null {
    const product = this.products.get(productId);
    if (!product || !product.channel_allocations[channelId]) {
      return null;
    }

    const allocation = product.channel_allocations[channelId];
    const available = allocation.allocated - allocation.reserved - allocation.sold;

    if (available < quantity) {
      return null; // Insufficient inventory
    }

    // Create reservation
    const reservationId = `res_${this.nextReservationId++}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const reservation: ChannelReservation = {
      reservation_id: reservationId,
      product_id: productId,
      channel_id: channelId,
      quantity,
      status: 'active',
      expires_at: expiresAt,
      created_at: new Date()
    };

    // Update channel allocation
    allocation.reserved += quantity;

    // Store reservation
    this.reservations.set(reservationId, reservation);

    return reservation;
  }

  getReservation(reservationId: string): ChannelReservation | undefined {
    return this.reservations.get(reservationId);
  }

  activateReservation(reservationId: string, orderId: number): boolean {
    const reservation = this.reservations.get(reservationId);
    if (!reservation || reservation.status !== 'active') {
      return false;
    }

    const product = this.products.get(reservation.product_id);
    if (!product) {
      return false;
    }

    const allocation = product.channel_allocations[reservation.channel_id];

    // Move from reserved to sold
    allocation.reserved -= reservation.quantity;
    allocation.sold += reservation.quantity;

    // Update reservation status
    reservation.status = 'activated';
    reservation.activated_at = new Date();
    reservation.order_id = orderId;

    return true;
  }

  expireReservations(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const reservation of this.reservations.values()) {
      if (reservation.status === 'active' && reservation.expires_at < now) {
        // Expire the reservation
        reservation.status = 'expired';

        // Release inventory
        const product = this.products.get(reservation.product_id);
        if (product && product.channel_allocations[reservation.channel_id]) {
          product.channel_allocations[reservation.channel_id].reserved -= reservation.quantity;
        }

        expiredCount++;
      }
    }

    return expiredCount;
  }

  getActiveReservations(channelId?: string): ChannelReservation[] {
    return Array.from(this.reservations.values()).filter(r =>
      r.status === 'active' && (!channelId || r.channel_id === channelId)
    );
  }

  // Reset for testing
  reset() {
    this.orders.clear();
    this.tickets.clear();
    this.reservations.clear();
    this.nextOrderId = 10001;
    this.nextTicketId = 50001;
    this.nextReservationId = 1;
    this.initializeProducts(); // Reset products to initial state
  }
}

// Singleton instance
export const mockDataStore = new MockDataStore();