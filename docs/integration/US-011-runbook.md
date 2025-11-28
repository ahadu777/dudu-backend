# US-011: Complex Pricing System - Integration Runbook

**Story**: Dynamic Multi-Variable Pricing System
**Status**: Approved
**Implementation Date**: 2025-11
**Business Requirement**: PRD-001 (Complex Pricing Extension)

## Overview

This runbook validates the complex pricing system that supports dynamic pricing based on multiple variables:
- Time periods (weekdays vs weekends/holidays)
- Customer types (adult, child, elderly)
- Package tiers (Premium, Pet, Deluxe)
- Add-on products (token packages)
- Special event dates

## Business Context

**Use Case**: Cruise/tour operators offer dynamic pricing that maximizes revenue while providing transparent pricing for different customer segments.

**Products with Complex Pricing**:
- Product 106: Premium Plan ($288 weekday / $318 weekend)
- Product 107: Pet Plan ($188 flat rate)
- Product 108: Deluxe Tea Set ($758 weekday / $788 weekend)

## Prerequisites

```bash
# Start the server (if not running)
npm run build && PORT=8080 npm start

# Wait for server startup
sleep 3

# Verify server health
curl http://localhost:8080/healthz
```

---

## Copy-Paste Command Flow

### 1. Get Pricing Rules for Product

```bash
# Get pricing rules for Premium Plan (Product 106)
curl -s http://localhost:8080/pricing/rules/106 | python3 -m json.tool

# Expected: base_prices, time_rules, customer_rules, special_dates, available_addons
# - Adult base: $288
# - Child/Elderly: $188
# - Weekend premium: +$30/person
# - Special dates: 2025-12-31, 2026-02-18
```

### 2. Test Weekday Pricing (Adult)

```bash
# Calculate price for 2 adults on a weekday (Monday 2025-12-15)
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}]
  }' | python3 -m json.tool

# Expected:
# - base_price: 576 (2 × $288)
# - adjustments: []
# - final_total: 576
```

### 3. Test Weekend Pricing (Premium)

```bash
# Calculate price for 2 adults on a Saturday (2025-12-20)
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-20"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}]
  }' | python3 -m json.tool

# Expected:
# - base_price: 576 (2 × $288)
# - adjustments: [+$60 weekend premium (2 × $30)]
# - final_total: 636
```

### 4. Test Mixed Customer Types

```bash
# Calculate for family: 2 adults + 2 children + 1 elderly on weekend
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-20"],
    "customer_breakdown": [
      {"customer_type": "adult", "count": 2},
      {"customer_type": "child", "count": 2},
      {"customer_type": "elderly", "count": 1}
    ]
  }' | python3 -m json.tool

# Expected breakdown:
# - Adults: 2 × $288 = $576
# - Children: 2 × $188 = $376
# - Elderly: 1 × $188 = $188
# - Base total: $1,140
# - Weekend premium: 5 × $30 = $150
# - Final total: $1,290
```

### 5. Test Pet Plan (Flat Rate)

```bash
# Pet Plan has flat rate pricing regardless of day type
curl -s http://localhost:8080/pricing/rules/107 | python3 -m json.tool

# Calculate price
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 107,
    "booking_dates": ["2025-12-20"],
    "customer_breakdown": [{"customer_type": "adult", "count": 1}]
  }' | python3 -m json.tool

# Expected: $188 flat rate (no weekend premium)
```

### 6. Test Deluxe Tea Set (Premium Package)

```bash
# Get Deluxe pricing rules
curl -s http://localhost:8080/pricing/rules/108 | python3 -m json.tool

# Calculate for 2 adults (designed for couples)
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 108,
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}]
  }' | python3 -m json.tool

# Expected: $758 × 2 = $1,516 (weekday)
```

### 7. Test Add-on Products

```bash
# Calculate with token add-on
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "adult", "count": 2}],
    "addons": [{"addon_id": "tokens-plan-b", "quantity": 1}]
  }' | python3 -m json.tool

# Expected:
# - base_price: 576 (2 × $288)
# - addons_total: 180 (Plan B: 20 tokens)
# - final_total: 756
```

### 8. Test Multiple Add-ons

```bash
# Multiple add-on packages
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-20"],
    "customer_breakdown": [
      {"customer_type": "adult", "count": 2},
      {"customer_type": "child", "count": 2}
    ],
    "addons": [
      {"addon_id": "tokens-plan-a", "quantity": 2},
      {"addon_id": "tokens-plan-c", "quantity": 1}
    ]
  }' | python3 -m json.tool

# Expected:
# - Base: 2×288 + 2×188 = 952
# - Weekend premium: 4×30 = 120
# - Addons: 2×100 + 1×400 = 600
# - Final total: 1,672
```

### 9. Test Validation - Invalid Customer Type

```bash
# Invalid customer type should return 422
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "student", "count": 1}]
  }' | python3 -m json.tool

# Expected: {"code":"INVALID_CUSTOMER_TYPE","message":"Invalid customer_type: student..."}
```

### 10. Test Validation - Invalid Date Format

```bash
# Invalid date format should return 422
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "booking_dates": ["15-12-2025"],
    "customer_breakdown": [{"customer_type": "adult", "count": 1}]
  }' | python3 -m json.tool

# Expected: {"code":"INVALID_DATE","message":"Invalid date format..."}
```

### 11. Test Product Not Found

```bash
# Non-existent product should return 404
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 999,
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "adult", "count": 1}]
  }' | python3 -m json.tool

# Expected: {"code":"PRODUCT_NOT_FOUND","message":"Complex pricing not available for product 999"}
```

### 12. Test Missing Required Fields

```bash
# Missing product_id
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_dates": ["2025-12-15"],
    "customer_breakdown": [{"customer_type": "adult", "count": 1}]
  }' | python3 -m json.tool

# Expected: {"code":"INVALID_REQUEST","message":"product_id is required"}

# Missing booking_dates
curl -s -X POST "http://localhost:8080/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 106,
    "customer_breakdown": [{"customer_type": "adult", "count": 1}]
  }' | python3 -m json.tool

# Expected: {"code":"INVALID_REQUEST","message":"booking_dates must be a non-empty array"}
```

---

## Success Criteria Validation

### Pricing Rules
- [x] Weekday base pricing working ($288 adult)
- [x] Weekend premium applied (+$30/person)
- [x] Child pricing correct ($188 flat)
- [x] Elderly pricing correct ($188 flat)
- [x] Special dates identified (2025-12-31, 2026-02-18)

### Package Tiers
- [x] Premium Plan (106): Complex pricing with addons
- [x] Pet Plan (107): Flat rate pricing
- [x] Deluxe Tea Set (108): Premium tier pricing

### Add-on Products
- [x] Plan A: $100 for 10 tokens
- [x] Plan B: $180 for 20 tokens
- [x] Plan C: $400 for 50 tokens

### Validation & Error Handling
- [x] Invalid customer type returns 422
- [x] Invalid date format returns 422
- [x] Product not found returns 404
- [x] Missing required fields return 400

### Performance
- [x] Pricing calculation < 100ms
- [x] Rules retrieval < 50ms

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pricing/calculate` | POST | Calculate total price for booking |
| `/pricing/rules/:product_id` | GET | Get pricing rules for product |
| `/catalog` | GET | Get products with pricing info |

---

## Pricing Matrix Reference

### Product 106 (Premium Plan)
| Customer Type | Weekday | Weekend/Holiday |
|---------------|---------|-----------------|
| Adult | $288 | $318 |
| Child | $188 | $218 |
| Elderly | $188 | $218 |

### Add-on Packages
| Plan | Price | Tokens | Value/Token |
|------|-------|--------|-------------|
| Plan A | $100 | 10 | $10 |
| Plan B | $180 | 20 | $9 |
| Plan C | $400 | 50 | $8 |

---

## Integration Notes

### For Frontend Integration
```typescript
// Example: Calculate family booking price
const response = await fetch('/pricing/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 106,
    booking_dates: ['2025-12-20'],
    customer_breakdown: [
      { customer_type: 'adult', count: 2 },
      { customer_type: 'child', count: 2 }
    ],
    addons: [{ addon_id: 'tokens-plan-b', quantity: 1 }]
  })
});

const { final_total, breakdown } = await response.json();
// Display breakdown to user before payment
```

### For Order Creation
The pricing calculation response should be validated against the order total at checkout to prevent tampering.

---

## Related Documentation

- [US-011 Story](../stories/US-011-complex-pricing-system.md)
- [Product Examples](../PRODUCT_EXAMPLES.md)
- [PRD-001 Cruise Ticketing](../prd/PRD-001-cruise-ticketing-platform.md)

**Runbook Status**: Validated
**Last Updated**: 2025-11
