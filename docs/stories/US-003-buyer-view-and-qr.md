---
id: US-003
title: Buyer views tickets and generates a short-lived QR token
owner: Product
status: "Done"
priority: Medium
last_update: 2025-10-19T23:44:00+0800
business_requirement: "PRD-001"
cards:
  - my-tickets
  - qr-generation-api
---

## Business goal
Let buyers see their tickets and generate a rotating QR token for entry, without exposing static codes.

## Actors
- Buyer (end-user)
- Tickets API

## Scope (in)
- List tickets with entitlements → Generate short-lived QR token per ticket

## Acceptance (Given/When/Then)
**Story A — List tickets**
- Given the buyer has at least one assigned ticket
- When GET /my/tickets
- Then 200 with tickets[] and entitlements[] including remaining_uses

**Story B — Generate QR token**
- Given the buyer owns ticket CODE and it is valid
- When POST /tickets/{code}/qr-token
- Then 200 with { token, expires_in } (TTL ≤ 60s)

## Non-functional constraints
- Token must include ticket id/hash and jti (nonce) and be signed (HS256)

## Links
- Cards: my-tickets, qr-token