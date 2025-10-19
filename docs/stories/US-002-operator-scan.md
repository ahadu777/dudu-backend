---
id: US-002
title: Operator scan with session + atomic redemption
owner: Product
status: Approved
priority: High
last_update: 2025-10-19T23:36:45+0800
---

## Business goal
Allow an operator to validate and redeem a buyer’s ticket **safely and traceably** at a gate/device, with replay prevention and clear audit (who/where/when/what).

## Actors
- Operator (gate staff)
- Validator device/app (bound to a location)
- Buyer (indirect)
- System (redeem API)

## Scope (in)
- Operator login → Start validator session → Scan QR (or code) → Atomic validation + redemption → Store audit event → Return clear decision.

## Out of scope (now)
- Full offline queue and conflict resolution (only basic replay prevention)
- Manual overrides/force-entry
- Refunds or reversals
- Partner revenue-share

## Acceptance (Given/When/Then)
**Story A — Operator login**  
- Given an operator account exists  
- When POST /operators/login { username, password }  
- Then 200 { operator_token } (invalid creds → 401)

**Story B — Start validator session**  
- Given a valid operator_token  
- When POST /validators/sessions { device_id, location_id? }  
- Then 200 { session_id, expires_in } and subsequent scans require this session_id

**Story C — Scan success (atomic decrement)**  
- Given a valid QR token for ticket T and entitlement F with remaining_uses > 0  
- When POST /tickets/scan { qr_token, function_code: F, session_id, location_id }  
- Then 200 { result: "success", ticket_status, entitlements[] }  
- And remaining_uses(F) decrements by 1 atomically; ticket status updates if needed  
- And an audit row is stored: { ticket_id, function_code, operator_id, session_id, location_id, jti, result: "success", ts }

**Story D — Replay prevention**  
- Given the same QR token (same jti) is reused  
- When scanning again  
- Then reject with 409 REPLAY (or result:"reject", reason:"REPLAY" per API contract)

**Story E — Wrong function**  
- When function_code not on the ticket  
- Then reject with WRONG_FUNCTION

**Story F — No remaining**  
- When remaining_uses == 0 for function_code  
- Then reject with NO_REMAINING

**Story G — Token expired**  
- When the QR token exp < now()  
- Then reject with TOKEN_EXPIRED

**Story H — Code fallback (optional)**  
- When a static code is provided instead of qr_token  
- Then the same validations apply (ownership/status/remaining_uses), but no replay via jti; gate MAY require manual confirmation

## Non-functional constraints
- QR token TTL ≤ 60s; include jti (unique nonce)  
- Idempotency at scan via unique jti (exactly-once decrement)  
- Transactional lock (SELECT … FOR UPDATE) on entitlement row  
- P99 scan latency ≤ 300ms (mock is fine for MVP)

## Data notes
- redemption_events must include jti with UNIQUE (jti) to block replays  
- Ticket status transitions: assigned → active → partially_redeemed → redeemed (one-way)  
- validator_sessions binds operator_id + device_id (+ optional location_id)

## Links
- OAS paths: /operators/login, /validators/sessions, /tickets/scan  
- Related cards: operators-login, validators-sessions, tickets-scan