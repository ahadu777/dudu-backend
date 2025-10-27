# Story Analysis: Complex Pricing System (US-011)

## Story: Dynamic Multi-Variable Pricing
**As a** cruise/tour operator
**I want** to offer dynamic pricing based on multiple variables (date types, customer types, package tiers, special events)
**So that** I can maximize revenue while providing transparent pricing that matches market demand and customer segments

**Acceptance Criteria:**
- [ ] Pricing varies by time period (weekdays vs weekends/holidays vs special dates)
- [ ] Different rates for customer types (adults, children, elderly)
- [ ] Multiple package tiers with different inclusions (Premium, Pet, Deluxe Tea Set)
- [ ] Add-on products available (token packages with different quantities/prices)
- [ ] Special date pricing for holidays and events (31/12/2025, 18/02/2026)
- [ ] Clear pricing display showing all variables and calculations
- [ ] Order system can handle complex pricing calculations

## Business Rules

### 1. Timing Rules
- **Regular periods**: Weekdays (星期一至五) have base pricing
- **Peak periods**: Weekends and holidays (星期六至日及公眾假期) have premium pricing (+$30 for adults)
- **Special events**: Specific dates (31/12/2025, 18/02/2026) have custom pricing ("待定")
- **Booking windows**: Different prices may apply based on advance booking

### 2. Customer Type Rules
- **Adults**: Full pricing for weekdays/weekends
- **Children & Elderly**: Fixed reduced pricing ($188) regardless of day type
- **Age verification**: System must validate customer type during booking
- **Mixed bookings**: Orders can contain multiple customer types

### 3. Package Tier Rules
- **Premium Plan**: Base package with standard inclusions
- **Pet Plan**: Specialized package for pet travelers ($188 flat rate)
- **Deluxe Tea Set**: Premium experience with enhanced amenities (+$500-700)
- **Package switching**: Customers can upgrade during booking process

### 4. Add-on Product Rules
- **Token packages**: Optional add-ons with different value propositions
  - Plan A: $100 for 10 tokens (游樂場代幣)
  - Plan B: $180 for 20 tokens
  - Plan C: $400 for 50 tokens
- **Bundle discounts**: Better value for larger token packages
- **Usage restrictions**: Tokens may have validity periods or location restrictions

### 5. Pricing Calculation Rules
- Base price determined by package tier and customer type
- Time-based adjustments applied (weekday/weekend/special)
- Add-ons calculated separately and summed
- Final total includes all components with clear breakdown

## API Endpoints Needed

### Core Pricing Engine
- **POST** /pricing/calculate - Calculate total price for booking request
  - Request: { product_id, quantity, customer_breakdown[], booking_dates[], addons[] }
  - Response: { base_price, adjustments[], addons_total, final_total, breakdown }
  - Errors: 400, 422 (invalid dates/customer types)

### Enhanced Product Information
- **GET** /catalog/products/{id}/pricing-rules - Get all pricing rules for product
  - Response: { base_prices, time_rules[], customer_rules[], special_dates[] }

### Package Configuration
- **GET** /catalog/packages/{package_tier} - Get package tier details and inclusions
  - Response: { tier_name, base_price, inclusions[], upgrade_options[] }

### Add-on Management
- **GET** /catalog/addons - List available add-on products
  - Response: { addons[{id, name, price, quantity, description}] }

## Data Changes

### Existing Tables Modified:
- **products**: Add complex_pricing_enabled flag, pricing_rules JSON field
- **orders**: Add pricing_breakdown JSON field to store calculation details
- **order_items**: Add customer_type, booking_dates, selected_addons fields

### New Tables Required:
- **pricing_rules**: Store time-based, customer-type, and special event pricing rules
- **package_tiers**: Define different package levels and their inclusions
- **addon_products**: Catalog of available add-on items with pricing
- **special_dates**: Calendar of special events with custom pricing rules

### Migration Requirements:
- Backfill existing data? Yes - migrate simple products to complex pricing structure
- Breaking changes? No - maintain backward compatibility for simple pricing
- Performance impact? Medium - pricing calculations will be more complex

## Integration Impact

### Existing Cards Affected:
- **catalog-endpoint**: Must return pricing rule indicators
- **promotion-detail**: Enhanced to show pricing matrix and package options
- **order-creation**: Must handle complex pricing calculations
- **payment-processing**: Must validate calculated totals match pricing rules

### New Integration Points:
- Pricing calculation service (internal)
- Calendar service for date type determination (weekday/weekend/holiday)
- Customer verification for age-based pricing
- Package configuration management
- Add-on inventory tracking

## Proposed Cards

### 1. **complex-pricing-engine**: Core pricing calculation logic
   - **Team**: A - Commerce
   - **Endpoints**: POST /pricing/calculate, GET /pricing/rules
   - **Dependencies**: catalog-endpoint

### 2. **package-tier-management**: Package configuration and tiers
   - **Team**: B - Fulfillment
   - **Endpoints**: GET /catalog/packages/{tier}, GET /catalog/packages
   - **Dependencies**: promotion-detail

### 3. **addon-products-catalog**: Add-on products and token packages
   - **Team**: A - Commerce
   - **Endpoints**: GET /catalog/addons, POST /addons/reserve
   - **Dependencies**: None

### 4. **special-date-pricing**: Calendar-based and event pricing
   - **Team**: B - Fulfillment
   - **Endpoints**: GET /calendar/pricing-dates, GET /calendar/special-events
   - **Dependencies**: complex-pricing-engine

### 5. **order-create**: Enhanced order processing with complex pricing support
   - **Team**: A - Commerce
   - **Endpoints**: POST /orders (enhanced for complex pricing)
   - **Dependencies**: complex-pricing-engine

## Implementation Priority

**Phase 1**: Complex pricing engine foundation
**Phase 2**: Package tiers and customer type handling
**Phase 3**: Add-on products integration
**Phase 4**: Special date and event pricing
**Phase 5**: Enhanced order creation with full pricing support

This systematic approach ensures we can handle the sophisticated pricing model shown in your screenshot while maintaining system performance and user experience.