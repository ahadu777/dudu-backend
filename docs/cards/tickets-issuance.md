---
card: "Tickets issuance (sync)"
slug: tickets-issuance
team: "B - Tickets"
oas_paths: []
migrations: []
status: "Done"
branch: ""
pr: ""
newman_report: ""
last_update: "2025-10-19T22:40:00+0800"
---

# Tickets issuance (sync) — Dev Notes

## Purpose
Internal module that creates tickets when called synchronously by payment webhook.

## Interface
```typescript
// Called directly by payment webhook
ticketService.issueTicketsForPaidOrder(orderId: number): Promise<Ticket[]>
```

## Rules
1) Load order and its items
2) For each order item:
   a) Create N tickets based on quantity
   b) Generate unique ticket code (format: `TKT-{orderId}-{itemIndex}-{ticketIndex}`)
   c) Set valid_from and valid_until based on product
   d) Create entitlements based on product functions
3) Store tickets in mock data
4) Return created tickets

## Ticket Structure
```typescript
{
  id: number,
  code: string,           // Unique ticket code
  order_id: number,
  product_id: number,
  user_id: number,
  status: 'VALID',
  valid_from: Date,
  valid_until: Date,
  entitlements: [{
    function_code: string,
    remaining_uses: number
  }]
}
```

## Invariants
- Idempotent: Calling with same orderId returns same tickets
- Ticket codes must be globally unique
- Each product function becomes an entitlement

## Error Handling
- Order not found → throw error
- Order not PAID → throw error  
- Product not found → throw error

## Observability
- Log `tickets.issuance.started` with orderId
- Log `tickets.issuance.completed` with count
- Metric `tickets.issued.count`