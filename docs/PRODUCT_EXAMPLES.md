# Product Catalog Reference

## Real Business Examples vs Mock Data

This document distinguishes between **real business products** (based on actual requirements) and **mock data products** (for development/testing) to provide proper context for AI-driven development.

## Real Business Examples (Products 106-108)

### Source & Context
- **Origin**: Real business requirement from cruise package pricing table (2025-10-27)
- **Business Context**: Multi-variable pricing system for ferry + entertainment packages
- **Market Segment**: Tourism/leisure travel with family-oriented packages
- **Implementation Story**: US-011 Complex multi-variable pricing system

### Product 106: Premium Plan ($288/$318)
**Business Function**: Standard family package with entertainment
```yaml
Real Business Features:
  - 中環長洲來回船票 (Central-Cheung Chau ferry round trip)
  - Monchhichi首盒禮品 (Monchhichi gift set)
  - 遊樂場代幣10個 (10 playground tokens)

Technical Implementation:
  functions:
    - ferry: Round-trip ferry transportation
    - monchhichi_gift: Premium branded merchandise
    - playground_tokens: Entertainment credits (quantity: 10)

Pricing Logic:
  - $288 weekday / $318 weekend (adults)
  - $188 child/elderly discount across all days
```

### Product 107: Pet Plan ($188)
**Business Function**: Pet-friendly transportation package
```yaml
Real Business Features:
  - Pet-friendly ferry transport
  - Basic playground access for families with pets

Technical Implementation:
  functions:
    - pet_ferry: Pet-accommodating transportation
    - pet_playground: Pet-friendly entertainment areas

Pricing Logic:
  - $188 flat rate (no time-based variations)
  - Simplified pricing for specialized market segment
```

### Product 108: Deluxe Tea Set ($788/$888)
**Business Function**: Premium experience with luxury amenities
```yaml
Real Business Features:
  - VIP ferry service
  - Premium Monchhichi gift collection
  - Traditional tea ceremony set
  - Enhanced playground token allocation

Technical Implementation:
  functions:
    - vip_ferry: Premium transportation service
    - monchhichi_gift_x2: Enhanced gift package
    - tea_set: Cultural experience component
    - playground_tokens: Entertainment credits (increased quantity)

Pricing Logic:
  - $788 weekday / $888 weekend (premium pricing)
  - Targets high-value customer segment
```

## Business Rules Derived from Real Requirements

### 1. **Customer Type Pricing**
- **Adults**: Full pricing with time-based variations
- **Child/Elderly**: Fixed discount pricing ($188) regardless of package tier
- **Business Rationale**: Accessibility and family-friendly positioning

### 2. **Time-Based Pricing**
- **Weekday**: Lower base prices
- **Weekend/Holiday**: Premium surcharge
- **Business Rationale**: Demand-based pricing optimization

### 3. **Package Tier Strategy**
- **Entry Level (Pet)**: Specialized market, simplified pricing
- **Standard (Premium)**: Core family market, moderate pricing
- **Luxury (Deluxe)**: High-value segment, premium pricing
- **Business Rationale**: Market segmentation and revenue optimization

### 4. **Function Code Business Meaning**
Each function code represents a **real business capability**:
- `ferry` / `pet_ferry` / `vip_ferry`: Transportation service levels
- `monchhichi_gift*`: Branded merchandise partnerships
- `playground_tokens`: Entertainment credit system
- `tea_set`: Cultural experience differentiation

## Mock/Demo Products (Products 101-105)

### Purpose
- **Development**: System validation and testing
- **Documentation**: API examples and integration guides
- **Training**: Developer onboarding and learning

### Product 101-105: Simple Examples
```yaml
Characteristics:
  - Single function per product
  - Fixed pricing ($50-$200)
  - No complex business rules
  - Generic naming (Basic Pass, Premium Pass, etc.)

Technical Purpose:
  - Test basic order creation
  - Validate simple pricing logic
  - Demonstrate API functionality
  - Support integration examples
```

## Impact on AI-Driven Development

### For New AI Sessions
**Understanding Product Context:**
1. **Products 106-108**: Base implementation decisions on real business requirements
2. **Products 101-105**: Use for system testing and API examples only
3. **Pricing Logic**: Complex pricing reflects actual market strategies, not arbitrary rules

### Knowledge Graph Enhancement
**Business Traceability:**
```
Real Business Need → User Story → Technical Implementation
Ferry + Entertainment → US-011 → Product 106 with ferry + playground functions
Pet-Friendly Travel → US-011 → Product 107 with pet-specific functions
Premium Experience → US-011 → Product 108 with luxury functions
```

### Decision Validation
**When designing new features:**
- Reference real business patterns from products 106-108
- Understand that complex pricing reflects market research
- Validate that technical constraints serve business objectives

## Integration with Development Workflow

### Story Analysis
When analyzing new user stories, consider:
1. **Is this similar to existing real business patterns?** (Reference products 106-108)
2. **What real business constraints might apply?** (Customer types, pricing tiers)
3. **How do technical decisions impact business outcomes?** (Function mapping to capabilities)

### Implementation Decisions
Use real business examples to:
- Validate technical architecture choices
- Understand why certain patterns exist
- Ensure new features align with established business logic

---

**Document Purpose**: Distinguish real business requirements from development artifacts to improve AI reasoning and decision-making in product development.

**Last Updated**: 2025-11-03
**Related Documents**:
- `docs/stories/US-011-complex-pricing-system.md` (implementation story)
- `docs/cards/order-create.md` (technical specification)
- `src/core/mock/store.ts` (product data implementation)