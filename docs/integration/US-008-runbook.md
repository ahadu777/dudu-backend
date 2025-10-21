# US-008 — Promotion detail view for dashboard

Complete flow for viewing detailed promotion information before purchase decision.

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **No authentication required**: Public endpoint
- **Seeded data**: Products 101-105 with enhanced promotion details
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. Browse Available Promotions
Get the catalog of available products:
```bash
curl -s http://localhost:8080/catalog | jq '.'
```

**Expected**: Array of products with basic info (id, sku, name, status, functions)

### 2. View Promotion Detail (Active Product)
Get detailed information for the 3-in-1 Transport Pass:
```bash
curl -s http://localhost:8080/catalog/promotions/101 | jq '.'
```

**Expected Response**:
```json
{
  "promotion": {
    "id": 101,
    "sku": "PASS-3IN1",
    "name": "3-in-1 Transport Pass",
    "description": "Perfect for tourists and daily commuters. This convenient 3-in-1 pass gives you access to multiple transport modes in one ticket.",
    "unit_price": 25,
    "status": "active",
    "functions": [
      {"function_code": "bus", "label": "Bus Ride", "quantity": 2},
      {"function_code": "ferry", "label": "Ferry Ride", "quantity": 1},
      {"function_code": "metro", "label": "Metro Entry", "quantity": 1}
    ],
    "inventory": {
      "sellable_cap": 1000,
      "reserved_count": 0,
      "sold_count": 0,
      "available": 1000
    },
    "features": [
      "2 Bus rides included",
      "1 Ferry crossing",
      "1 Metro journey",
      "Valid for 24 hours",
      "No booking required"
    ],
    "images": ["https://example.com/transport-pass.jpg"]
  }
}
```

### 3. View Promotion Detail (Premium Product)
Get detailed information for the Theme Park Pass:
```bash
curl -s http://localhost:8080/catalog/promotions/104 | jq '.'
```

**Expected**: Premium product with higher price ($89), park features, and fast pass benefits.

### 4. View Promotion Detail (Archived Product)
Get information for an archived/inactive product:
```bash
curl -s http://localhost:8080/catalog/promotions/105 | jq '.'
```

**Expected**: Product with status "archived", $0 price, and "Currently unavailable" features.

## Error Handling Tests

### Invalid Product ID Format
```bash
curl -s http://localhost:8080/catalog/promotions/invalid | jq '.'
```

**Expected**: 400 Bad Request with error message "Product ID must be a valid number"

### Non-existent Product
```bash
curl -s http://localhost:8080/catalog/promotions/999 | jq '.'
```

**Expected**: 404 Not Found with error message "Promotion not found"

## Frontend Integration Points

### Dashboard Display Data
The promotion detail response provides everything needed for rich dashboard views:

- **Marketing Copy**: `description`, `features[]`, `images[]`
- **Pricing Info**: `unit_price`, `status`
- **Inventory Status**: `inventory.available`, `inventory.sellable_cap`
- **Product Functions**: `functions[]` for entitlement details

### Purchase Flow Integration
After viewing promotion details, users can proceed to purchase:

```bash
# Use the product_id from promotion detail in order creation
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [{"product_id": 101, "qty": 1}],
    "channel_id": 1,
    "out_trade_no": "promo-purchase-$(date +%s)"
  }' | jq '.'
```

## Complete Dashboard Flow
```bash
# 1. User browses catalog
curl -s http://localhost:8080/catalog

# 2. User clicks on interesting product (e.g., ID 101)
curl -s http://localhost:8080/catalog/promotions/101

# 3. User reviews details and decides to purchase
curl -s -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{"items": [{"product_id": 101, "qty": 1}], "channel_id": 1, "out_trade_no": "promo-101-$(date +%s)"}'

# 4. Continue with payment flow (US-001)
```

## Key Features Demonstrated

✅ **Rich product information** with marketing copy and features
✅ **Real-time inventory** showing availability
✅ **Comprehensive error handling** for edge cases
✅ **Seamless purchase integration** with existing order flow
✅ **Support for all product states** (active, archived, premium)

## Success Criteria

- [ ] All product details load correctly
- [ ] Inventory calculations are accurate
- [ ] Error cases return appropriate status codes
- [ ] Response format matches TypeScript interfaces
- [ ] Integration with purchase flow works seamlessly