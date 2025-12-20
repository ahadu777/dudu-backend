---
id: US-003
title: Buyer views tickets and generates a short-lived QR token
owner: Product
status: "Done"
priority: Medium
last_update: 2025-10-19T23:44:00+0800
business_requirement: "PRD-001"
depends_on:
  - US-001  # Must have purchased ticket first
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
- When the buyer views their tickets
- Then they see a list of tickets with entitlements and remaining uses

**Story B — Generate QR token**
- Given the buyer owns a valid ticket
- When the buyer requests a QR code for entry
- Then they receive a temporary QR code (expires within 60 seconds)

## Non-functional constraints
- Token must include ticket id/hash and jti (nonce) and be signed (HS256)

## Links
- Cards: my-tickets, qr-token