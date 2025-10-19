---
id: US-006
title: Operator authentication and validator session lifecycle
owner: Product
status: Approved
priority: Medium
last_update: 2025-10-19T23:44:00+0800
---

## Business goal
Authenticate operators and bind scans to a device/location via short-lived sessions for auditability.

## Actors
- Operator
- Operator API

## Scope (in)
- POST /operators/login → POST /validators/sessions → use session_id on scans → session expiry

## Acceptance (Given/When/Then)
**Story A — Login**
- Given valid credentials
- When POST /operators/login
- Then 200 { operator_token }

**Story B — Start session**
- Given a valid operator_token
- When POST /validators/sessions { device_id, location_id? }
- Then 200 { session_id, expires_in }

**Story C — Invalid session**
- When POST /tickets/scan with an expired/unknown session_id
- Then 401

## Links
- Cards: operators-login, validators-sessions