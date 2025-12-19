---
id: US-005
title: Business user views redemption events for reporting
owner: Product
status: "Done"
priority: Medium
last_update: 2025-10-19T23:44:00+0800
business_requirement: "PRD-003"
cards:
  - reports-redemptions
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
- When the analyst queries redemption events for a specific time window
- Then only events within that time window are returned

**Story B — Filter by function and location**
- Given the analyst wants to filter by specific criteria
- When they filter by function (e.g., ferry) and location
- Then only matching events are returned

## Non-functional constraints
- Stable pagination or capped result size (MVP can return all within window)

## Links
- Cards: reports-redemptions