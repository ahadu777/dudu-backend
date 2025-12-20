---
id: US-006
title: Operator authentication and validator session lifecycle
owner: Product
status: "Done"
priority: Medium
last_update: 2025-10-19T23:44:00+0800
business_requirement: "PRD-003"
cards:
  - operators-login
---

## Business goal
Authenticate operators and bind scans to a device/location via short-lived sessions for auditability.

## Actors
- Operator
- Operator API

## Scope (in)
- Operator login → Session binding → Authenticated scans → Session expiry

## Acceptance (Given/When/Then)
**Story A — Login**
- Given the operator has valid credentials
- When the operator logs in
- Then they receive an authentication token

**Story B — Scan with operator auth**
- Given the operator has a valid session
- When the operator scans a ticket
- Then the scan is recorded with the operator's context

**Story C — Invalid auth**
- Given the operator's session has expired or is invalid
- When the operator attempts to scan a ticket
- Then access is denied

## Links
- Cards: operators-login, venue-enhanced-scanning

> **Deprecated**: `/validators/sessions` has been replaced by operator JWT authentication. Session context is now embedded in the JWT token.