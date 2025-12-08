---
id: US-007
title: Ticket Cancellation and Refund
owner: Product
status: "Done"
priority: Medium
business_requirement: "PRD-001"
cards:
  - ticket-cancellation
  - cancellation-policies
  - refund-processing
---

# US-007: Ticket Cancellation and Refund

## Story
**As a** ticket buyer
**I want** to cancel my unused tickets and receive a refund
**So that** I don't lose money when I can't use purchased tickets

## Business Context
Customers need the ability to cancel tickets they cannot use and receive appropriate refunds based on usage. This improves customer satisfaction and reduces support burden while maintaining fair business practices.

## Acceptance Criteria
- [ ] Users can cancel tickets that haven't been fully redeemed
- [ ] Refund amount is calculated based on ticket usage (redemptions)
- [ ] Cancelled tickets become unusable (VOID status)
- [ ] Payment is refunded through original payment method
- [ ] Users can view their cancellation and refund history
- [ ] Business policies are clearly communicated to users

## Business Rules
1. **Eligibility**: Only ACTIVE or PARTIALLY_REDEEMED tickets can be cancelled
2. **Refund Calculation**: Based on redemption percentage
   - 0% used: 100% refund
   - 1-50% used: 50% refund
   - 51-99% used: 25% refund
   - 100% used: 0% refund
3. **Status Changes**: Cancelled tickets transition to VOID
4. **Audit Trail**: All cancellations are logged with reason and refund amount

## Technical Implementation
This story is implemented through 3 cards:
- **ticket-cancellation**: Core cancellation logic and API
- **refund-processing**: Payment refund handling
- **cancellation-policies**: Business rules and policy endpoint

## Definition of Done
- [ ] All 3 cards implemented and tested
- [ ] Integration tests validate end-to-end cancellation flow
- [ ] Refund processing connects to payment gateway
- [ ] Error handling covers all edge cases
- [ ] Audit logging captures all cancellation events

## Priority
High - Customer-requested feature affecting retention