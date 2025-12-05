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

**Story B — Scan with operator auth**
- Given a valid operator_token (JWT)
- When POST /venue/scan with Authorization header
- Then scan proceeds with operator context from JWT

**Story C — Invalid auth**
- When POST /venue/scan with expired/invalid operator token
- Then 401 Unauthorized

## Links
- Cards: operators-login, venue-enhanced-scanning

> **Deprecated**: `/validators/sessions` has been replaced by operator JWT authentication. Session context is now embedded in the JWT token.