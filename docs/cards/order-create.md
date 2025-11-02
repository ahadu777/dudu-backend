---
card: "Order create (idempotent) with complex pricing support"
slug: order-create-idempotent
team: "A - Commerce"
oas_paths: ["/orders"]
migrations: ["migrations/0002_orders.sql"]
status: "Done"
branch: "feat/a-orders-create"
pr: ""
newman_report: "reports/newman/order-create.json"
last_update: "2025-10-26T11:00:00+0800"
related_stories: ["US-001", "US-011"]
# Enhanced relationship metadata
relationships:
  enhanced_by: ["complex-pricing-engine"]
  depends_on: ["catalog-endpoint"] # product data validation
  triggers: ["payment-webhook"] # order creation triggers payment flow
  data_dependencies: ["Product", "Order", "OrderItem", "PricingContext"]
  shared_services: ["mockDataStore", "inventory-service"]
  sequence_constraints:
    - must_follow: ["catalog-endpoint"] # products must exist
    - must_precede: ["payment-webhook"] # order before payment
  integration_points:
    - data_stores: ["data.ts", "store.ts"] # dual store synchronization required
    - external_apis: [] # no external dependencies
    - internal_services: ["ticket-service"] # called after payment
---

# Order create (idempotent) with complex pricing support — Dev Notes

## Status & Telemetry
- Status: Done (enhanced for complex pricing)
- Readiness: mvp
- Spec Paths: /orders
- Related Stories: US-001 (basic), US-011 (complex pricing)
- Last Update: 2025-10-26T11:00:00+0800

## Purpose
Create order and reserve inventory atomically; idempotent via (user_id, out_trade_no).
**Enhanced**: Now supports complex pricing with customer types, package tiers, and add-ons.

## Business Context
**Real Business Examples**: Products 106-108 are based on actual cruise package requirements:
- **Market Segment**: Tourism/leisure travel with family-oriented packages
- **Pricing Strategy**: Time-based pricing (weekday/weekend) + customer type discounts
- **Package Tiers**: Entry (Pet $188), Standard (Premium $288/$318), Luxury (Deluxe $788/$888)
- **Reference**: See `docs/PRODUCT_EXAMPLES.md` for complete business context

**Function Codes Represent Real Capabilities**:
- `ferry`/`pet_ferry`/`vip_ferry`: Transportation service levels
- `monchhichi_gift`: Branded merchandise partnerships
- `playground_tokens`: Entertainment credit systems
- `tea_set`: Cultural experience components

## Contract (Enhanced)

### Basic Order (Backward Compatible)
```json
POST /orders
{
  "items": [
    {
      "product_id": 101,
      "qty": 2
    }
  ],
  "channel_id": 1,
  "out_trade_no": "simple-order-123"
}
```

### Complex Pricing Order (New)
```json
POST /orders
{
  "items": [
    {
      "product_id": 107,
      "qty": 1,
      "pricing_context": {
        "booking_dates": ["2025-12-21"],
        "customer_breakdown": [
          {
            "customer_type": "adult",
            "count": 1
          },
          {
            "customer_type": "child",
            "count": 1
          }
        ],
        "addons": [
          {
            "addon_id": "tokens-plan-a",
            "quantity": 1
          }
        ]
      }
    }
  ],
  "channel_id": 1,
  "out_trade_no": "pet-plan-order-456"
}
```

### Response (Enhanced)
```json
{
  "order_id": 1001,
  "status": "CREATED",
  "amounts": {
    "subtotal": 376,
    "addons_total": 100,
    "pricing_adjustments": [],
    "discount": 0,
    "total": 476
  },
  "pricing_breakdown": {
    "per_customer_costs": [
      {
        "customer_type": "adult",
        "count": 1,
        "unit_price": 188,
        "total_cost": 188
      },
      {
        "customer_type": "child",
        "count": 1,
        "unit_price": 188,
        "total_cost": 188
      }
    ],
    "addon_details": [
      {
        "addon_id": "tokens-plan-a",
        "name": "遊樂場全日門票及代幣 + 10 代幣",
        "quantity": 1,
        "unit_price": 100,
        "total_cost": 100
      }
    ]
  },
  "created_at": "2025-12-21T10:00:00Z"
}
```

## Rules & Writes (Enhanced TX)
1) **Idempotency check** & payload hash → return same order or 409
2) **Complex pricing calculation**: If pricing_context exists, call complex-pricing-engine
3) **Inventory lock**: `SELECT ... FOR UPDATE` on products AND add-ons
4) **Stock validation**: Check both product inventory and add-on availability
5) **Order creation**: Insert orders + order_items with pricing breakdown
6) **Inventory commit**: Update reserved_count for products and add-ons
7) **Event emission**: `orders.created` with pricing details

## Cruise Product Structure
**3 Separate Products** with **Distinct Functions**:

### Product 106: Premium Plan ($288/$318)
- **Functions**: `ferry`, `monchhichi_gift`, `playground_tokens` (10)
- **Features**: 中環長洲來回船票 + Monchhichi首盒禮品 + 遊樂場代幣10個
- **Pricing**: $288 weekday / $318 weekend (adults), $188 (child/elderly)

### Product 107: Pet Plan ($188)
- **Functions**: `pet_ferry`, `pet_playground`
- **Features**: 寵物友善船票 + 遊樂場寵物區
- **Pricing**: $188 flat rate (all customer types, all days)

### Product 108: Deluxe Tea Set ($788/$888)
- **Functions**: `vip_ferry` (2), `monchhichi_gift_x2` (2), `playground_tokens` (20), `tea_set` (1)
- **Features**: VIP船位限量 + 雙份禮品 + 代幣20個 + 船上茶點
- **Pricing**: $788 weekday / $888 weekend (adults), $188 (child/elderly)

## Customer Type Pricing Matrix
| Customer Type | Premium (106) | Premium Weekend | Pet (107) | Deluxe (108) | Deluxe Weekend | Special Dates |
|---------------|---------------|-----------------|-----------|--------------|----------------|---------------|
| Adult         | $288          | $318           | $188      | $788         | $888           | 待定          |
| Child         | $188          | $188           | $188      | $188         | $188           | 待定          |
| Elderly       | $188          | $188           | $188      | $188         | $188           | 待定          |

## Add-on Products
- **Plan A**: $100 → 10 tokens (available for all products)
- **Plan B**: $180 → 20 tokens (Premium & Deluxe only)
- **Plan C**: $400 → 50 tokens (Premium & Deluxe only)

## Evidence
- **Basic orders**: Postman run `{{baseUrl}}/orders` → 200 (simple products 101-105)
- **Complex orders**: Postman run with pricing_context → 200 (cruise products 106-108)
- **Idempotency**: Retry same out_trade_no → same order_id
- **Pricing accuracy**: Manual verification against screenshot pricing matrix
- **Function validation**: Tickets have correct entitlements per product
- Newman JSON: `reports/newman/order-create.json`

## Order Examples by Product

### Premium Plan (106) - Weekend Adult + Child
```json
{
  "product_id": 106,
  "pricing_context": {
    "booking_dates": ["2025-12-21"],
    "customer_breakdown": [{"customer_type": "adult", "count": 1}, {"customer_type": "child", "count": 1}]
  }
}
// Result: Adult $318 + Child $188 = $506 total
// Tickets: ferry, monchhichi_gift, playground_tokens (10) entitlements
```

### Pet Plan (107) - Any Day
```json
{
  "product_id": 107,
  "pricing_context": {
    "booking_dates": ["2025-12-21"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}]
  }
}
// Result: $188 × 2 = $376 total (flat rate)
// Tickets: pet_ferry, pet_playground entitlements
```

### Deluxe Tea Set (108) - Weekend with Add-ons
```json
{
  "product_id": 108,
  "pricing_context": {
    "booking_dates": ["2025-12-21"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}],
    "addons": [{"addon_id": "tokens-plan-c", "quantity": 1}]
  }
}
// Result: Adult $888 × 2 + Plan C $400 = $2,176 total
// Tickets: vip_ferry (2), monchhichi_gift_x2 (2), playground_tokens (20), tea_set (1) entitlements
```