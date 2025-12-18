---
id: US-LMS-006
title: Compliance & Audit Trail
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
enhances:
  - US-LMS-001
  - US-LMS-002
  - US-LMS-003
cards:
  - lms-audit-trail
  - lms-rbac
---

## Business goal
Maintain immutable audit trails for all system actions and enforce role-based access control to meet regulatory examination requirements.

## Actors
- Compliance Officer (audit reviewer)
- Security Administrator (access control)
- System (audit logger)
- Regulator (examination)

## Scope (in)
- Immutable audit logging for all actions
- Audit log query by entity
- Role-based access control
- Audit log immutability enforcement

## Out of scope (now)
- Regulatory report generation (HMDA)
- Fair lending analysis
- Examination data package export

## Acceptance (Given/When/Then)

**Scenario A — Audit Log Creation**
- Given any action is taken in the system (create, update, delete)
- When the action is executed
- Then an audit log entry is created with timestamp, actor, action, entity, before/after values
- And entry includes IP address and session ID

**Scenario B — Audit Log Query**
- Given compliance officer needs to investigate an application
- When officer queries audit logs by entity_type and entity_id
- Then system returns chronological list of all actions on that entity
- And entries include who, what, when, and changes

**Scenario C — Audit Log Immutability**
- Given an audit log entry exists
- When any attempt is made to DELETE or UPDATE the entry
- Then system returns 405 Method Not Allowed
- And the attempted modification is itself logged

**Scenario D — Role-Based Access**
- Given user has role "credit_officer"
- When user attempts to access borrower credit reports
- Then access is granted
- When user attempts to access system configuration
- Then access is denied with 403 Forbidden

**Scenario E — Date Range Filtering**
- Given compliance officer needs logs for specific period
- When officer queries with from/to date parameters
- Then only logs within that date range are returned
- And results are paginated for large datasets

## Non-functional constraints
- Audit logs retained for 7 years minimum
- Logs written synchronously (before response)
- No DELETE or UPDATE operations on audit_logs table
- Log storage separate from operational database

## Data notes
- Audit log fields: log_id, entity_type, entity_id, action, actor, timestamp, changes (JSON), ip_address
- Actor format: "user:{id}", "system:{service}", "api:{client_id}"
- Changes format: {"field": {"old": value, "new": value}}

## Links
- Related cards: lms-audit-trail, lms-rbac
