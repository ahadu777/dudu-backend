import {
  Product,
  Order,
  Ticket,
  Operator,
  ValidatorSession,
  RedemptionEvent,
  OrderStatus,
  TicketStatus,
  TicketTransitions,
  ISODate,
  TicketCode,
  SessionId,
  ScanResult,
  PromotionDetail,
  UserProfile,
  UserSettings,
  ActivityEntry,
  NotificationSettings,
  PrivacySettings,
  DisplayPreferences,
  PricingStructure,
  PricingRule,
  PackageTier,
  AddonProduct,
  CustomerBreakdown,
  AddonSelection,
  PricingCalculationRequest,
  PricingCalculationResponse,
  PricingAdjustment,
  PricingBreakdown,
  CustomerCost,
  AddonCost,
  TimeAdjustment
} from '../../types/domain';
import { logger } from '../../utils/logger';

/**
 * Unified Mock Data Store aligned with domain.ts
 * Single source of truth for all mock data operations
 */
export class MockStore {
  private products: Map<number, Product & { inventory: { sellable_cap: number; reserved_count: number; sold_count: number; } }>;
  private orders: Map<string, Order>;  // key: `${user_id}-${out_trade_no}`
  private ordersByOrderId: Map<number, Order>;  // secondary index
  private tickets: Map<TicketCode, Ticket>;
  private operators: Map<string, Operator>;  // key: username
  private sessions: Map<SessionId, ValidatorSession>;
  private redemptions: Array<RedemptionEvent>;
  private jtiCache: Set<string>;  // for replay prevention
  private users: Map<number, UserProfile>;  // key: user_id
  private userActivity: Array<ActivityEntry>;  // activity log

  private nextOrderId = 1000;
  private nextTicketId = 1;

  constructor() {
    this.products = new Map();
    this.orders = new Map();
    this.ordersByOrderId = new Map();
    this.tickets = new Map();
    this.operators = new Map();
    this.sessions = new Map();
    this.redemptions = [];
    this.jtiCache = new Set();
    this.users = new Map();
    this.userActivity = [];

    this.initializeSeedData();
  }

  // Enhanced product data for promotion details
  private promotionData: Map<number, { description: string; unit_price: number; features: string[]; images: string[]; badges: string[]; }> = new Map();

  // Complex pricing structures for products
  private complexPricingData: Map<number, PricingStructure> = new Map();

  private initializeSeedData(): void {
    // Initialize promotion enhancement data
    this.promotionData.set(101, {
      description: 'Save 40% with our popular 3-in-1 Transport Pass! Perfect for tourists and daily commuters who want seamless city travel. Get bus, ferry, and metro access in one convenient ticket - worth $42 if purchased separately.',
      unit_price: 25.00,
      features: ['🚌 2 Bus rides included', '⛴️ 1 Ferry crossing', '🚇 1 Metro journey', '⏰ Valid for 24 hours', '📱 Mobile ticket - no booking required', '💰 Save $17 vs individual tickets', '🏷️ Best Value for city exploration'],
      images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1469213252164-be19ee483929?w=800&h=600&fit=crop'],
      badges: ['🔥 Popular Choice', '💎 Best Value', '⏰ Limited Time']
    });

    this.promotionData.set(102, {
      description: 'Ultimate freedom with unlimited city travel! Perfect for power tourists and business travelers who need maximum flexibility. Hop on and off any bus or metro as many times as you want.',
      unit_price: 45.00,
      features: ['🚌 Unlimited bus rides all day', '🚇 Unlimited metro access', '⏰ Valid for 24 hours', '🚊 Peak hour access included', '📱 Mobile ticket with QR code', '🗺️ Works on all city transport lines', '💼 Perfect for business travelers'],
      images: ['https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'],
      badges: ['⭐ Premium', '🚀 Unlimited']
    });

    this.promotionData.set(103, {
      description: 'Immerse yourself in culture and history at our award-winning museum. Explore 5 permanent exhibitions featuring art, science, and local heritage. Audio guide included - a $12 value!',
      unit_price: 18.00,
      features: ['🎨 All 5 permanent exhibitions', '🎧 Audio guide included ($12 value)', '📅 Valid for one full day', '🎓 Student discounts available', '👥 Group rates for 10+ visitors', '📸 Photography permitted in most areas', '☕ Museum café discount included'],
      images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=800&h=600&fit=crop'],
      badges: ['🎨 Cultural', '🎓 Educational']
    });

    this.promotionData.set(104, {
      description: '🎢 Premium Theme Park Experience! Skip the lines with 3 Fast Pass rides included (normally $30 extra). Full day of unlimited rides, shows, and attractions. Free parking saves you another $25!',
      unit_price: 89.00,
      features: ['🎢 Full park entry + all rides', '⚡ 3 Fast Pass rides included ($30 value)', '🎭 All shows and attractions', '🅿️ Free parking ($25 value)', '📸 Professional photo package discount', '🍿 Food & beverage discounts', '🏆 Skip-the-line entrance'],
      images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop'],
      badges: ['🎢 Premium Experience', '⚡ Fast Pass Included', '❄️ Winter Special']
    });

    this.promotionData.set(105, {
      description: 'This seasonal pass is currently unavailable. Check back for new offers!',
      unit_price: 0.00,
      features: ['Currently unavailable'],
      images: [],
      badges: ['❌ Unavailable']
    });

    // Initialize complex pricing structures
    this.initializeComplexPricing();

    // Seed products (from products.json structure)
    this.products.set(101, {
      id: 101,
      sku: 'PASS-3IN1',
      name: '3-in-1 Transport Pass',
      status: 'active',
      sale_start_at: '2024-10-01T00:00:00Z',
      sale_end_at: '2024-12-31T23:59:59Z',
      functions: [
        { function_code: 'bus', label: 'Bus Ride', quantity: 2 },
        { function_code: 'ferry', label: 'Ferry Ride', quantity: 1 },
        { function_code: 'metro', label: 'Metro Entry', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 1000,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(102, {
      id: 102,
      sku: 'DAY-PASS',
      name: 'All Day Pass',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'bus', label: 'Unlimited Bus', quantity: 999 },
        { function_code: 'metro', label: 'Unlimited Metro', quantity: 999 }
      ],
      inventory: {
        sellable_cap: 500,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(103, {
      id: 103,
      sku: 'MUSEUM-TICKET',
      name: 'Museum Entry',
      status: 'active',
      sale_start_at: null,
      sale_end_at: null,
      functions: [
        { function_code: 'museum', label: 'Museum Entry', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 200,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(104, {
      id: 104,
      sku: 'PARK-PASS',
      name: 'Theme Park Pass',
      status: 'active',
      sale_start_at: '2024-11-01T00:00:00Z',
      sale_end_at: '2025-02-28T23:59:59Z',
      functions: [
        { function_code: 'park', label: 'Park Entry', quantity: 1 },
        { function_code: 'ride', label: 'Fast Pass', quantity: 3 }
      ],
      inventory: {
        sellable_cap: 100,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(105, {
      id: 105,
      sku: 'INACTIVE-PASS',
      name: 'Expired Product',
      status: 'archived',
      sale_start_at: null,
      sale_end_at: '2024-01-01T00:00:00Z',
      functions: [
        { function_code: 'expired', label: 'Expired Function', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 0,
        reserved_count: 0,
        sold_count: 0
      }
    });

    // Seed operators
    const bcrypt = require('bcrypt');
    this.operators.set('alice', {
      operator_id: 1,
      username: 'alice',
      password_hash: bcrypt.hashSync('secret123', 10),
      roles: ['gate_operator', 'validator']
    });

    this.operators.set('bob', {
      operator_id: 2,
      username: 'bob',
      password_hash: bcrypt.hashSync('pass456', 10),
      roles: ['gate_operator']
    });

    this.operators.set('charlie', {
      operator_id: 3,
      username: 'charlie',
      password_hash: bcrypt.hashSync('admin789', 10),
      roles: ['gate_operator', 'validator', 'admin']
    });

    // Seed test tickets for validation
    this.seedTestTickets();

    logger.info('mock.store.initialized', {
      products: this.products.size,
      operators: this.operators.size,
      tickets: this.tickets.size
    });
  }

  private seedTestTickets(): void {
    // Create test tickets for user 123 (for workflow validation)
    const testTicket1: Ticket = {
      ticket_code: 'TKT-123-001',
      product_id: 101,
      product_name: '3-in-1 Transport Pass',
      status: TicketStatus.ACTIVE,
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
      entitlements: [
        {
          function_code: 'bus',
          label: 'Bus Ride',
          remaining_uses: 2
        },
        {
          function_code: 'ferry',
          label: 'Ferry Ride',
          remaining_uses: 1
        },
        {
          function_code: 'metro',
          label: 'Metro Entry',
          remaining_uses: 1
        }
      ],
      user_id: 123,
      order_id: 1001
    };

    const testTicket2: Ticket = {
      ticket_code: 'TKT-123-002',
      product_id: 103,
      product_name: 'Museum Entry',
      status: TicketStatus.ASSIGNED,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      entitlements: [
        {
          function_code: 'museum',
          label: 'Museum Entry',
          remaining_uses: 1
        }
      ],
      user_id: 123,
      order_id: 1002
    };

    this.tickets.set(testTicket1.ticket_code, testTicket1);
    this.tickets.set(testTicket2.ticket_code, testTicket2);

    logger.info('mock.store.test_tickets_seeded', {
      user_id: 123,
      ticket_count: 2
    });

    // Seed user profiles
    this.users.set(123, {
      user_id: '123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      preferences: {
        language: 'en',
        timezone: 'UTC',
        notification_email: true
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    });

    this.users.set(456, {
      user_id: '456',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      preferences: {
        language: 'es',
        timezone: 'America/New_York',
        notification_email: false
      },
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    });

    // Seed activity log entries
    this.userActivity.push(
      {
        activity_id: 'act_001',
        type: 'profile',
        action: 'profile_created',
        description: 'User profile was created',
        timestamp: '2025-01-01T00:00:00Z',
        metadata: {
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        },
        severity: 'info'
      },
      {
        activity_id: 'act_002',
        type: 'login',
        action: 'login_success',
        description: 'User logged in successfully',
        timestamp: '2025-01-02T08:30:00Z',
        metadata: {
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0'
        },
        severity: 'info'
      }
    );
  }

  private initializeComplexPricing(): void {
    // Product 106: Premium Plan - Base cruise experience
    const premiumPricingStructure: PricingStructure = {
      base_price: 288, // Adult weekday base price
      pricing_rules: [
        {
          rule_type: 'time_based',
          conditions: {
            day_types: ['weekend', 'holiday']
          },
          price_modifier: {
            type: 'absolute',
            value: 318 // Weekend/holiday pricing
          }
        },
        {
          rule_type: 'customer_type',
          conditions: {
            customer_types: ['child', 'elderly']
          },
          price_modifier: {
            type: 'absolute',
            value: 188 // Fixed price for children and elderly
          }
        },
        {
          rule_type: 'special_date',
          conditions: {
            special_dates: ['2025-12-31', '2026-02-18']
          },
          price_modifier: {
            type: 'fixed',
            value: 0 // Special pricing TBD (待定)
          }
        }
      ],
      addon_products: [
        {
          addon_id: 'tokens-plan-a',
          name: '遊樂場全日門票及代幣 + 10 代幣',
          price: 100,
          quantity_included: 10,
          description: 'Plan A: Additional 10 playground tokens'
        },
        {
          addon_id: 'tokens-plan-b',
          name: '加購代幣 Plan B',
          price: 180,
          quantity_included: 20,
          description: 'Plan B: Additional 20 playground tokens'
        },
        {
          addon_id: 'tokens-plan-c',
          name: '加購代幣 Plan C',
          price: 400,
          quantity_included: 50,
          description: 'Plan C: Additional 50 playground tokens'
        }
      ]
    };

    // Product 107: Pet Plan - Flat rate pricing
    const petPricingStructure: PricingStructure = {
      base_price: 188, // Flat rate for all
      pricing_rules: [
        {
          rule_type: 'customer_type',
          conditions: {
            customer_types: ['adult', 'child', 'elderly']
          },
          price_modifier: {
            type: 'absolute',
            value: 188 // Same price for all customer types
          }
        },
        {
          rule_type: 'time_based',
          conditions: {
            day_types: ['weekend', 'holiday']
          },
          price_modifier: {
            type: 'absolute',
            value: 188 // No weekend premium for pets
          }
        },
        {
          rule_type: 'special_date',
          conditions: {
            special_dates: ['2025-12-31', '2026-02-18']
          },
          price_modifier: {
            type: 'fixed',
            value: 0 // Special pricing TBD (待定)
          }
        }
      ],
      addon_products: [
        {
          addon_id: 'tokens-plan-a',
          name: '遊樂場全日門票及代幣 + 10 代幣',
          price: 100,
          quantity_included: 10,
          description: 'Plan A: Additional 10 playground tokens'
        }
      ]
    };

    // Product 108: Deluxe Tea Set - Premium pricing
    const deluxePricingStructure: PricingStructure = {
      base_price: 788, // Adult weekday base price
      pricing_rules: [
        {
          rule_type: 'time_based',
          conditions: {
            day_types: ['weekend', 'holiday']
          },
          price_modifier: {
            type: 'absolute',
            value: 888 // Weekend/holiday pricing (+$100)
          }
        },
        {
          rule_type: 'customer_type',
          conditions: {
            customer_types: ['child', 'elderly']
          },
          price_modifier: {
            type: 'absolute',
            value: 188 // Fixed price for children and elderly
          }
        },
        {
          rule_type: 'special_date',
          conditions: {
            special_dates: ['2025-12-31', '2026-02-18']
          },
          price_modifier: {
            type: 'fixed',
            value: 0 // Special pricing TBD (待定)
          }
        }
      ],
      addon_products: [
        {
          addon_id: 'tokens-plan-a',
          name: '遊樂場全日門票及代幣 + 10 代幣',
          price: 100,
          quantity_included: 10,
          description: 'Plan A: Additional 10 playground tokens'
        },
        {
          addon_id: 'tokens-plan-b',
          name: '加購代幣 Plan B',
          price: 180,
          quantity_included: 20,
          description: 'Plan B: Additional 20 playground tokens'
        },
        {
          addon_id: 'tokens-plan-c',
          name: '加購代幣 Plan C',
          price: 400,
          quantity_included: 50,
          description: 'Plan C: Additional 50 playground tokens'
        }
      ]
    };

    this.complexPricingData.set(106, premiumPricingStructure);
    this.complexPricingData.set(107, petPricingStructure);
    this.complexPricingData.set(108, deluxePricingStructure);

    // Add the 3 cruise products with distinct functions
    this.products.set(106, {
      id: 106,
      sku: 'CRUISE-2025-PREMIUM',
      name: 'Premium Plan - 中環長洲來回船票',
      status: 'active',
      sale_start_at: '2025-12-12T00:00:00Z',
      sale_end_at: '2026-03-12T23:59:59Z',
      functions: [
        { function_code: 'ferry', label: '中環(五號碼頭)至長洲來回船票', quantity: 1 },
        { function_code: 'monchhichi_gift', label: 'Monchhichi首盒禮品', quantity: 1 },
        { function_code: 'playground_tokens', label: '遊樂場全日門票及代幣', quantity: 10 }
      ],
      inventory: {
        sellable_cap: 200,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(107, {
      id: 107,
      sku: 'CRUISE-2025-PET',
      name: 'Pet Plan - 寵物友善船票',
      status: 'active',
      sale_start_at: '2025-12-12T00:00:00Z',
      sale_end_at: '2026-03-12T23:59:59Z',
      functions: [
        { function_code: 'pet_ferry', label: '中環(五號碼頭)至長洲來回船票(寵物)', quantity: 1 },
        { function_code: 'pet_playground', label: '遊樂場寵物區', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 50,
        reserved_count: 0,
        sold_count: 0
      }
    });

    this.products.set(108, {
      id: 108,
      sku: 'CRUISE-2025-DELUXE',
      name: 'Deluxe Tea Set For Two - 頂級雙人體驗',
      status: 'active',
      sale_start_at: '2025-12-12T00:00:00Z',
      sale_end_at: '2026-03-12T23:59:59Z',
      functions: [
        { function_code: 'vip_ferry', label: '中環(五號碼頭)至長洲來回船票(普通艙VIP船位限量)', quantity: 2 },
        { function_code: 'monchhichi_gift_x2', label: 'Monchhichi首盒禮品 X2', quantity: 2 },
        { function_code: 'playground_tokens', label: '遊樂場全日門票 X2 + 遊樂場代幣20個', quantity: 20 },
        { function_code: 'tea_set', label: 'Monchhichi Tea Set 任何時間船上享用', quantity: 1 }
      ],
      inventory: {
        sellable_cap: 30,
        reserved_count: 0,
        sold_count: 0
      }
    });

    // Add promotion data for all 3 cruise packages
    this.promotionData.set(106, {
      description: '🚢 Premium Plan - 中環(五號碼頭)至長洲來回船票，包含Monchhichi首盒禮品及遊樂場全日門票和代幣。適合家庭出遊，享受經典長洲一日遊體驗。',
      unit_price: 288.00,
      features: [
        '⛴️ 中環(五號碼頭)至長洲來回船票(普通艙)',
        '🎁 Monchhichi 首盒禮品',
        '🎮 遊樂場全日門票',
        '🪙 遊樂場代幣 10個',
        '📅 彈性日期選擇(平日$288/週末假期$318)',
        '👥 小童長者優惠價$188',
        '🎯 可加購代幣套餐'
      ],
      images: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1469213252164-be19ee483929?w=800&h=600&fit=crop'
      ],
      badges: ['🔥 Popular Choice', '👨‍👩‍👧‍👦 Family Friendly']
    });

    this.promotionData.set(107, {
      description: '🐕 Pet Plan - 寵物友善船票，讓您和愛寵一同享受長洲之旅。包含寵物專用船票和遊樂場寵物區域。',
      unit_price: 188.00,
      features: [
        '🐕 中環(五號碼頭)至長洲來回船票(寵物艙)',
        '🐾 遊樂場寵物區域通行證',
        '💰 所有客戶類型統一價$188',
        '📅 不分平日週末同價',
        '🏷️ 寵物友善設施完備'
      ],
      images: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop'
      ],
      badges: ['🐕 Pet Friendly', '💎 Special Price']
    });

    this.promotionData.set(108, {
      description: '✨ Deluxe Tea Set For Two - 頂級雙人體驗，VIP船位限量，雙份Monchhichi禮品，20個遊樂場代幣，船上專享茶點服務。',
      unit_price: 788.00,
      features: [
        '🥇 中環(五號碼頭)至長洲來回船票(VIP船位限量)',
        '🎁 Monchhichi首盒禮品 X2',
        '🎮 遊樂場全日門票 X2',
        '🪙 遊樂場代幣 20個',
        '☕ Monchhichi Tea Set 船上享用',
        '📅 彈性日期選擇(平日$788/週末假期$888)',
        '👥 小童長者優惠價$188',
        '⭐ VIP專屬服務'
      ],
      images: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
      ],
      badges: ['⭐ Premium Experience', '💎 VIP Limited', '🍵 Tea Service']
    });

    logger.info('complex.pricing.initialized', {
      products_with_complex_pricing: this.complexPricingData.size,
      cruise_packages: [106, 107, 108]
    });
  }

  // Product operations
  getProducts(): Product[] {
    return Array.from(this.products.values())
      .filter(p => p.status === 'active')
      .map(({ inventory, ...product }) => product);  // Remove inventory from response
  }

  getProduct(id: number): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;
    const { inventory, ...productData } = product;
    return productData;
  }

  // Get promotion detail with enhanced information
  getPromotionDetail(id: number): PromotionDetail | undefined {
    const product = this.products.get(id);
    const promotionInfo = this.promotionData.get(id);

    if (!product || !promotionInfo) return undefined;

    const available = product.inventory.sellable_cap - product.inventory.reserved_count - product.inventory.sold_count;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: promotionInfo.description,
      unit_price: promotionInfo.unit_price,
      status: product.status,
      sale_start_at: product.sale_start_at,
      sale_end_at: product.sale_end_at,
      functions: product.functions,
      inventory: {
        sellable_cap: product.inventory.sellable_cap,
        reserved_count: product.inventory.reserved_count,
        sold_count: product.inventory.sold_count,
        available: available
      },
      features: promotionInfo.features,
      images: promotionInfo.images,
      badges: promotionInfo.badges
    };
  }

  reserveInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    const available = product.inventory.sellable_cap - product.inventory.reserved_count - product.inventory.sold_count;
    if (available < qty) return false;

    product.inventory.reserved_count += qty;
    return true;
  }

  commitInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    if (product.inventory.reserved_count < qty) return false;

    product.inventory.reserved_count -= qty;
    product.inventory.sold_count += qty;
    return true;
  }

  releaseInventory(productId: number, qty: number): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    product.inventory.reserved_count = Math.max(0, product.inventory.reserved_count - qty);
    return true;
  }

  // Order operations
  createOrder(order: Omit<Order, 'order_id' | 'created_at'>): Order {
    const orderId = this.nextOrderId++;
    const key = `${order.user_id}-${order.out_trade_no}`;

    // Check for idempotency
    const existing = this.orders.get(key);
    if (existing) {
      return existing;
    }

    const newOrder: Order = {
      ...order,
      order_id: orderId,
      created_at: new Date().toISOString()
    };

    this.orders.set(key, newOrder);
    this.ordersByOrderId.set(orderId, newOrder);

    return newOrder;
  }

  getOrder(userId: number, outTradeNo: string): Order | undefined {
    return this.orders.get(`${userId}-${outTradeNo}`);
  }

  getOrderById(orderId: number): Order | undefined {
    return this.ordersByOrderId.get(orderId);
  }

  updateOrderStatus(orderId: number, status: OrderStatus, paidAt?: ISODate): boolean {
    const order = this.ordersByOrderId.get(orderId);
    if (!order) return false;

    order.status = status;
    if (paidAt) {
      order.paid_at = paidAt;
    }

    // Update both maps
    const key = `${order.user_id}-${order.out_trade_no}`;
    this.orders.set(key, order);

    return true;
  }

  // Ticket operations
  createTicket(ticket: Ticket): Ticket {
    this.tickets.set(ticket.ticket_code, ticket);
    return ticket;
  }

  getTicket(ticketCode: TicketCode): Ticket | undefined {
    return this.tickets.get(ticketCode);
  }

  getTicketsByUserId(userId: number): Ticket[] {
    return Array.from(this.tickets.values()).filter(t => t.user_id === userId);
  }

  getTicketsByOrderId(orderId: number): Ticket[] {
    return Array.from(this.tickets.values()).filter(t => t.order_id === orderId);
  }

  updateTicketStatus(ticketCode: TicketCode, newStatus: TicketStatus): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    // Validate state transition
    const allowedTransitions = TicketTransitions[ticket.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      logger.warn('ticket.invalid_transition', {
        ticketCode,
        currentStatus: ticket.status,
        attemptedStatus: newStatus
      });
      return false;
    }

    ticket.status = newStatus;
    return true;
  }

  decrementEntitlement(ticketCode: TicketCode, functionCode: string): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    const entitlement = ticket.entitlements.find(e => e.function_code === functionCode);
    if (!entitlement || entitlement.remaining_uses <= 0) return false;

    entitlement.remaining_uses--;

    // Update ticket status based on remaining uses
    const totalRemaining = ticket.entitlements.reduce((sum, e) => sum + e.remaining_uses, 0);
    if (totalRemaining === 0) {
      this.updateTicketStatus(ticketCode, TicketStatus.REDEEMED);
    } else if (ticket.status === TicketStatus.ACTIVE) {
      this.updateTicketStatus(ticketCode, TicketStatus.PARTIALLY_REDEEMED);
    }

    return true;
  }

  // Operator operations
  getOperator(username: string): Operator | undefined {
    return this.operators.get(username);
  }

  // Session operations
  createSession(session: ValidatorSession): ValidatorSession {
    this.sessions.set(session.session_id, session);
    return session;
  }

  getSession(sessionId: SessionId): ValidatorSession | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionValid(sessionId: SessionId): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    return now < expiresAt;
  }

  // Redemption operations
  addRedemption(event: RedemptionEvent): void {
    this.redemptions.push(event);

    // Add jti to cache if present
    if (event.jti) {
      this.jtiCache.add(event.jti);
    }
  }

  hasJti(jti: string): boolean {
    return this.jtiCache.has(jti);
  }

  getRedemptions(filters?: {
    ticket_id?: number;
    operator_id?: number;
    location_id?: number;
    from?: ISODate;
    to?: ISODate;
  }): RedemptionEvent[] {
    let results = [...this.redemptions];

    if (filters) {
      if (filters.ticket_id) {
        results = results.filter(r => r.ticket_id === filters.ticket_id);
      }
      if (filters.operator_id) {
        results = results.filter(r => r.operator_id === filters.operator_id);
      }
      if (filters.location_id) {
        results = results.filter(r => r.location_id === filters.location_id);
      }
      if (filters.from) {
        results = results.filter(r => r.ts >= filters.from!);
      }
      if (filters.to) {
        results = results.filter(r => r.ts <= filters.to!);
      }
    }

    return results;
  }

  // Cancellation operations
  cancelTicket(ticketCode: TicketCode, reason?: string): boolean {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return false;

    // Check if ticket can be cancelled
    if (ticket.status === TicketStatus.REDEEMED ||
        ticket.status === TicketStatus.EXPIRED ||
        ticket.status === TicketStatus.VOID) {
      return false;
    }

    // Update ticket to VOID status
    ticket.status = TicketStatus.VOID;
    ticket.cancelled_at = new Date().toISOString();
    ticket.cancellation_reason = reason || null;

    return true;
  }

  calculateRefundAmount(ticketCode: TicketCode): number {
    const ticket = this.tickets.get(ticketCode);
    if (!ticket) return 0;

    const order = this.ordersByOrderId.get(ticket.order_id);
    if (!order || !order.amounts) return 0;

    // Calculate refund based on remaining entitlements
    const totalEntitlements = ticket.entitlements.reduce((sum, e) => {
      const product = this.products.get(ticket.product_id);
      const productFunction = product?.functions.find(f => f.function_code === e.function_code);
      return sum + (productFunction?.quantity || 0);
    }, 0);

    const remainingEntitlements = ticket.entitlements.reduce((sum, e) => sum + e.remaining_uses, 0);

    if (totalEntitlements === 0) return 0;

    const usagePercentage = (totalEntitlements - remainingEntitlements) / totalEntitlements;
    const itemPrice = order.amounts.total / order.items.length; // Simple division for prototype

    // Apply refund policy
    let refundPercentage = 0;
    if (usagePercentage === 0) {
      refundPercentage = 1.0; // 100% refund
    } else if (usagePercentage <= 0.5) {
      refundPercentage = 0.5; // 50% refund
    } else if (usagePercentage < 1.0) {
      refundPercentage = 0.25; // 25% refund
    } else {
      refundPercentage = 0; // No refund
    }

    return Math.round(itemPrice * refundPercentage * 100) / 100; // Round to 2 decimal places
  }

  // Refund operations (for refund-processing card)
  private refunds: Map<string, any> = new Map();
  private nextRefundId = 1;

  createRefund(orderOrderId: number, amount: number, reason: string, ticketId?: number): any {
    const refundId = `REF-${this.nextRefundId++}`;
    const refund = {
      refund_id: refundId,
      order_id: orderOrderId,
      ticket_id: ticketId || null,
      amount,
      status: 'pending',
      reason,
      gateway_response: null,
      created_at: new Date().toISOString(),
      completed_at: null
    };

    this.refunds.set(refundId, refund);
    return refund;
  }

  updateRefundStatus(refundId: string, status: string, gatewayResponse?: any): boolean {
    const refund = this.refunds.get(refundId);
    if (!refund) return false;

    refund.status = status;
    if (gatewayResponse) {
      refund.gateway_response = gatewayResponse;
    }
    if (status === 'success' || status === 'failed') {
      refund.completed_at = new Date().toISOString();
    }

    return true;
  }

  getRefundsByUserId(userId: number): any[] {
    const userOrders = Array.from(this.ordersByOrderId.values())
      .filter(o => o.user_id === userId)
      .map(o => o.order_id);

    return Array.from(this.refunds.values())
      .filter(r => userOrders.includes(r.order_id));
  }

  updateOrderRefundStatus(orderId: number, refundAmount: number): boolean {
    const order = this.ordersByOrderId.get(orderId);
    if (!order) return false;

    order.refund_amount = (order.refund_amount || 0) + refundAmount;

    if (order.amounts) {
      if (order.refund_amount >= order.amounts.total) {
        order.refund_status = 'full';
        order.status = OrderStatus.REFUNDED;
      } else if (order.refund_amount > 0) {
        order.refund_status = 'partial';
        order.status = OrderStatus.PARTIALLY_REFUNDED;
      }
    }

    // Update both maps
    const key = `${order.user_id}-${order.out_trade_no}`;
    this.orders.set(key, order);

    return true;
  }

  // User Profile operations
  getUserProfile(userId: number): UserProfile | undefined {
    return this.users.get(userId);
  }

  updateUserProfile(userId: number, updates: Partial<UserProfile>): UserProfile | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser: UserProfile = {
      ...user,
      ...updates,
      user_id: user.user_id, // Preserve user_id
      created_at: user.created_at, // Preserve created_at
      updated_at: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);

    // Log activity
    this.logActivity(userId, {
      type: 'profile',
      action: 'profile_updated',
      description: 'User profile was updated',
      metadata: { changes: updates }
    });

    return updatedUser;
  }

  getUserSettings(userId: number): UserSettings | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    // Default settings structure based on user preferences
    const defaultNotificationSettings: NotificationSettings = {
      email_notifications: user.preferences.notification_email ?? true,
      sms_notifications: false,
      push_notifications: true,
      order_updates: true,
      promotional_emails: false
    };

    const defaultPrivacySettings: PrivacySettings = {
      profile_visibility: 'private',
      show_purchase_history: false,
      data_sharing_consent: false
    };

    const defaultDisplayPreferences: DisplayPreferences = {
      language: (user.preferences.language as 'en' | 'es' | 'fr' | 'de') || 'en',
      timezone: user.preferences.timezone || 'UTC',
      date_format: 'MM/DD/YYYY',
      currency_display: 'USD'
    };

    return {
      notification_settings: defaultNotificationSettings,
      privacy_settings: defaultPrivacySettings,
      display_preferences: defaultDisplayPreferences,
      updated_at: user.updated_at
    };
  }

  updateUserSettings(userId: number, settings: Partial<UserSettings>): UserSettings | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    // Update user preferences based on settings
    if (settings.display_preferences?.language) {
      user.preferences.language = settings.display_preferences.language;
    }
    if (settings.display_preferences?.timezone) {
      user.preferences.timezone = settings.display_preferences.timezone;
    }
    if (settings.notification_settings?.email_notifications !== undefined) {
      user.preferences.notification_email = settings.notification_settings.email_notifications;
    }

    user.updated_at = new Date().toISOString();
    this.users.set(userId, user);

    // Log activity
    this.logActivity(userId, {
      type: 'settings',
      action: 'settings_updated',
      description: 'User settings were updated',
      metadata: { settings_changed: Object.keys(settings) }
    });

    // Return updated settings
    return this.getUserSettings(userId);
  }

  getUserActivity(userId: number, options: {
    limit?: number;
    offset?: number;
    type?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): { activities: ActivityEntry[]; total: number } {
    const { limit = 20, offset = 0, type, fromDate, toDate } = options;

    // Filter activities for this user and apply filters
    let userActivities = this.userActivity.filter(activity => {
      // Add user filtering logic here when we have user_id in activities
      // For now, return all activities for demo purposes
      return true;
    });

    // Apply type filter
    if (type && type !== 'all') {
      userActivities = userActivities.filter(activity => activity.type === type);
    }

    // Apply date filters
    if (fromDate) {
      userActivities = userActivities.filter(activity => activity.timestamp >= fromDate);
    }
    if (toDate) {
      userActivities = userActivities.filter(activity => activity.timestamp <= toDate);
    }

    // Sort by timestamp descending
    userActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = userActivities.length;
    const activities = userActivities.slice(offset, offset + limit);

    return { activities, total };
  }

  private logActivity(userId: number, activity: {
    type: ActivityEntry['type'];
    action: string;
    description: string;
    metadata?: any;
    severity?: ActivityEntry['severity'];
  }): void {
    const activityEntry: ActivityEntry = {
      activity_id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: activity.type,
      action: activity.action,
      description: activity.description,
      timestamp: new Date().toISOString(),
      metadata: activity.metadata,
      severity: activity.severity || 'info'
    };

    this.userActivity.push(activityEntry);

    // Keep only last 1000 activities to prevent memory issues
    if (this.userActivity.length > 1000) {
      this.userActivity = this.userActivity.slice(-1000);
    }
  }

  // Complex Pricing operations
  getComplexPricingStructure(productId: number): PricingStructure | undefined {
    return this.complexPricingData.get(productId);
  }

  calculateComplexPricing(request: PricingCalculationRequest): PricingCalculationResponse {
    const pricingStructure = this.complexPricingData.get(request.product_id);
    if (!pricingStructure) {
      throw new Error(`Complex pricing not available for product ${request.product_id}`);
    }

    let totalPrice = 0;
    const adjustments: PricingAdjustment[] = [];
    const perCustomerCosts: CustomerCost[] = [];
    const timeAdjustments: TimeAdjustment[] = [];
    const addonCosts: AddonCost[] = [];

    // Calculate base pricing per customer type
    for (const customerGroup of request.customer_breakdown) {
      let unitPrice = pricingStructure.base_price; // Default adult price

      // Apply customer type pricing rules
      for (const rule of pricingStructure.pricing_rules) {
        if (rule.rule_type === 'customer_type' &&
            rule.conditions.customer_types?.includes(customerGroup.customer_type)) {
          unitPrice = rule.price_modifier.value;
          break;
        }
      }

      // Apply package tier modifiers
      if (request.package_tier && pricingStructure.package_tiers) {
        const packageTier = pricingStructure.package_tiers.find(t => t.tier_id === request.package_tier);
        if (packageTier) {
          unitPrice += packageTier.base_price_modifier;
        }
      }

      const customerCost = unitPrice * customerGroup.count;
      totalPrice += customerCost;

      perCustomerCosts.push({
        customer_type: customerGroup.customer_type,
        count: customerGroup.count,
        unit_price: unitPrice,
        total_cost: customerCost
      });
    }

    // Apply time-based adjustments for each booking date
    for (const bookingDate of request.booking_dates) {
      const dayType = this.getDayType(bookingDate);

      // Check for special date pricing
      const specialDateRule = pricingStructure.pricing_rules.find(rule =>
        rule.rule_type === 'special_date' &&
        rule.conditions.special_dates?.includes(bookingDate)
      );

      if (specialDateRule) {
        timeAdjustments.push({
          date: bookingDate,
          day_type: 'special',
          adjustment_amount: 0, // TBD pricing
          adjustment_reason: 'Special event pricing (待定)'
        });
        continue;
      }

      // Apply weekend/holiday pricing
      if ((dayType === 'weekend' || dayType === 'holiday')) {
        const weekendRule = pricingStructure.pricing_rules.find(rule =>
          rule.rule_type === 'time_based' &&
          rule.conditions.day_types?.includes(dayType)
        );

        if (weekendRule) {
          const totalCustomers = request.customer_breakdown.reduce((sum, cb) => sum + cb.count, 0);
          const adjustment = (weekendRule.price_modifier.value - pricingStructure.base_price) * totalCustomers;
          totalPrice += adjustment;

          adjustments.push({
            rule_type: 'time_based',
            description: `${dayType} premium for ${bookingDate}`,
            amount: adjustment,
            calculation_basis: `${totalCustomers} customers × $${weekendRule.price_modifier.value - pricingStructure.base_price}`
          });

          timeAdjustments.push({
            date: bookingDate,
            day_type: dayType,
            adjustment_amount: adjustment,
            adjustment_reason: `${dayType} premium pricing`
          });
        }
      }
    }

    // Calculate add-on costs
    let addonsTotal = 0;
    if (request.addons && pricingStructure.addon_products) {
      for (const addonSelection of request.addons) {
        const addon = pricingStructure.addon_products.find(a => a.addon_id === addonSelection.addon_id);
        if (addon) {
          const addonCost = addon.price * addonSelection.quantity;
          addonsTotal += addonCost;

          addonCosts.push({
            addon_id: addon.addon_id,
            name: addon.name,
            quantity: addonSelection.quantity,
            unit_price: addon.price,
            total_cost: addonCost
          });
        }
      }
    }

    const finalTotal = totalPrice + addonsTotal;

    return {
      base_price: totalPrice,
      adjustments,
      addons_total: addonsTotal,
      final_total: finalTotal,
      breakdown: {
        per_customer_costs: perCustomerCosts,
        addon_details: addonCosts,
        time_adjustments: timeAdjustments
      }
    };
  }

  private getDayType(dateString: string): 'weekday' | 'weekend' | 'holiday' {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();

    // Simple weekend detection (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'weekend';
    }

    // Could add holiday detection logic here
    // For now, treat all weekdays as regular days
    return 'weekday';
  }

  // Utility methods
  reset(): void {
    this.products.clear();
    this.orders.clear();
    this.ordersByOrderId.clear();
    this.tickets.clear();
    this.operators.clear();
    this.sessions.clear();
    this.redemptions = [];
    this.jtiCache.clear();
    this.refunds.clear();
    this.users.clear();
    this.userActivity = [];
    this.nextOrderId = 1000;
    this.nextTicketId = 1;
    this.nextRefundId = 1;

    this.initializeSeedData();
  }

  getStats(): object {
    return {
      products: this.products.size,
      orders: this.orders.size,
      tickets: this.tickets.size,
      operators: this.operators.size,
      sessions: this.sessions.size,
      redemptions: this.redemptions.length,
      jtiCacheSize: this.jtiCache.size,
      users: this.users.size,
      userActivity: this.userActivity.length
    };
  }
}

// Export singleton instance
export const mockStore = new MockStore();