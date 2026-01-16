---
id: US-LMS-020
title: "Secondary Market & Loan Trading"
owner: Product
status: "Draft"
priority: Low
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: ["US-LMS-009", "US-LMS-010"]
enhances: ["US-LMS-010"]
cards: []
---

# US-LMS-020: Secondary Market & Loan Trading

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As an** Investor
**I want to** sell my loan participations on a secondary market
**So that** I can access liquidity before loan maturity and manage my portfolio allocation actively

---

## Scope

### In Scope
- Loan listing for sale (ask orders)
- Bid placement for available loans
- Bid/Ask pricing mechanism
- Trade matching and execution
- Settlement processing (T+1)
- Transfer of ownership records
- Trading history and P&L tracking
- Tax lot tracking for cost basis

### Out of Scope
- Market maker / liquidity provision (Phase 2)
- Automated trading / APIs (Phase 2)
- Whole loan sales (participations only)
- Cross-platform trading (Phase 2)
- Options or derivatives (Phase 2)

---

## Acceptance Criteria

### A. List Loan for Sale
- **Given** investor wants to liquidate a loan position
- **When** creating sell order
- **Then** system:
  - Displays current loan details (balance, rate, remaining term)
  - Shows current market price (if available from recent trades)
  - Allows setting ask price (premium/discount to par value)
  - Sets expiration date for listing (default: 30 days)
- **And** position is listed on marketplace
- **And** seller receives confirmation

### B. Browse Available Loans
- **Given** buyer wants to find loans to purchase
- **When** accessing marketplace
- **Then** system shows:
  - List of available positions with key metrics
  - Filters: credit grade, yield, term, price
  - Sort: price, yield, time listed
- **And** each listing shows: loan ID (anonymized), ask price, original terms, current status

### C. Place Bid
- **Given** buyer searches available loans
- **When** buyer places bid on listed loan
- **Then** system:
  - Validates buyer has sufficient funds in account
  - Records bid with price and timestamp
  - Notifies seller of offer
  - Bid remains valid until: accepted, rejected, expired, or canceled

### D. Trade Execution
- **Given** bid meets or exceeds ask price
- **When** trade is matched
- **Then** system:
  - Locks both positions (no modification)
  - Initiates settlement process (T+1)
  - Transfers ownership in loan records
  - Moves funds from buyer to seller account
  - Deducts trading fee (if applicable)
- **And** both parties receive trade confirmation

### E. Settlement
- **Given** trade is executed
- **When** T+1 settlement date arrives
- **Then** system:
  - Finalizes ownership transfer
  - Updates buyer's portfolio with new loan
  - Removes loan from seller's portfolio
  - Credits seller's cash account
  - Debits buyer's cash account
- **And** settlement confirmation sent to both parties

### F. P&L Tracking
- **Given** investor has completed trades
- **When** accessing trading history
- **Then** system shows for each trade:
  - Original purchase price (or origination par)
  - Sale price
  - Realized gain/loss
  - Holding period
  - Interest received during holding
- **And** provides YTD and lifetime P&L summary

### G. Tax Lot Tracking
- **Given** investor sells a loan position
- **When** calculating gain/loss
- **Then** system:
  - Uses FIFO method by default
  - Tracks original cost basis
  - Accounts for any prior adjustments (losses allocated)
  - Generates tax lot detail for 1099 reporting

### H. Order Management
- **Given** investor has open orders (bids or asks)
- **When** managing orders
- **Then** investor can:
  - View all open orders
  - Modify ask price (before match)
  - Cancel order (before match)
  - View order history
- **And** modifications/cancellations are immediate

---

## Business Rules

1. **Trading Eligibility**
   - Both buyer and seller must be accredited investors
   - Loan must be current (no 30+ DPD loans tradeable)
   - Minimum holding period: 30 days from purchase
   - No trading during payment processing window

2. **Pricing Rules**
   - Price expressed as % of par (e.g., 98.5 = 98.5% of remaining principal)
   - Minimum price increment: 0.1%
   - Premium limit: 110% of par
   - Discount limit: 50% of par

3. **Trading Fees**
   - Platform fee: 0.5% of trade value (split 50/50)
   - Minimum fee: $5 per trade
   - No fee for order placement or cancellation

4. **Settlement**
   - T+1 settlement (next business day)
   - Interest accrued through trade date goes to seller
   - Interest from settlement date forward goes to buyer

5. **Order Validity**
   - Ask orders: Valid until canceled or 30 days
   - Bid orders: Valid until canceled or 7 days
   - Orders auto-cancel if loan becomes delinquent

6. **Trade Matching**
   - Exact match only (no partial fills)
   - First bid at or above ask wins
   - Timestamp priority for equal bids

7. **Tax Implications**
   - Gain/loss reported on 1099-B
   - Short-term: Held <1 year
   - Long-term: Held >1 year
   - Platform provides tax lot reports

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Trading engine |
| TBD | Draft | Settlement service |
| TBD | Draft | Marketplace UI |
| TBD | Draft | Order book management |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-010 | Investor can exit positions before maturity |

---

## Non-Functional Requirements

- Trade execution <5 seconds
- Settlement T+1 (next business day)
- Price updates every 15 minutes during market hours (9AM-5PM ET)
- Minimum trade size: $1,000
- Maximum single position: $1,000,000
- Trading hours: 9AM - 5PM ET, business days
- Support for 1,000+ concurrent orders
