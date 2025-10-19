---
id: US-005
title: Business user views redemption events for reporting
owner: Product
status: Approved
priority: Medium
last_update: 2025-10-19T23:44:00+0800
---

## Business goal
Provide basic reporting of redemption events filtered by time window, function, and location so analysts can measure usage.

## Actors
- Business analyst
- Reports API

## Scope (in)
- Query redemption_events with filters (from, to, function, location_id) and return normalized records

## Acceptance (Given/When/Then)
**Story A — Time window**
- Given redemption events exist for the last 24h
- When GET /reports/redemptions?from=...&to=...
- Then 200 with only events in the window

**Story B — Filter by function and location**
- When adding function=ferry&location_id=52
- Then only matching events are returned

## Non-functional constraints
- Stable pagination or capped result size (MVP can return all within window)

## Links
- Cards: reports-redemptions