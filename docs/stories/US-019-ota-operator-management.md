---
id: US-019
title: OTA Operator Management for Ticket Redemption
owner: Product
status: "Done"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-002"
enhances:
  - US-012  # Extends OTA platform with operator management
depends_on:
  - US-012  # OTA platform integration required
  - US-014  # Miniprogram auth for operator login
cards:
  - ota-operator-management
---

## User Goal

**As** an OTA platform operator
**I want to** create and manage verification operators for my platform
**So that** my operators can scan and redeem tickets belonging to my OTA channel

---

## Scope

### In Scope
- OTA creates/manages operators via API
- Operator login via existing miniprogram
- Venue visibility filtered by OTA
- Redemption scope limited to OTA tickets

### Out of Scope
- Operator self-registration
- Cross-OTA operator sharing
- Operator mobile app (uses existing miniprogram)

---

## Acceptance Criteria

### A. OTA Creates Operator
- **Given** OTA platform has `operators` permission
- **When** OTA calls `POST /api/ota/operators` with account, password, real_name
- **Then** System creates operator with `operator_type=OTA` and `partner_id` linked to OTA

### B. OTA Lists Operators
- **Given** OTA has created multiple operators
- **When** OTA calls `GET /api/ota/operators`
- **Then** System returns only operators belonging to this OTA (filtered by partner_id)

### C. OTA Disables Operator
- **Given** OTA needs to revoke operator access
- **When** OTA calls `DELETE /api/ota/operators/:id`
- **Then** Operator status changes to DISABLED, cannot login

### D. Operator Login
- **Given** OTA operator with valid credentials
- **When** Operator calls `POST /operators/login`
- **Then** System returns JWT with `partner_id` embedded

### E. Venue Filtering
- **Given** OTA operator is logged in
- **When** Operator calls `GET /venue`
- **Then** System returns only venues associated with operator's OTA

### F. QR Decode Scope Check
- **Given** OTA operator scans a ticket QR code
- **When** Operator calls `POST /qr/decrypt`
- **Then** System validates ticket `partner_id` matches operator's `partner_id`
- **And** Returns error if mismatch

### G. Redemption Scope Check
- **Given** OTA operator attempts to redeem a ticket
- **When** Operator calls `POST /venue/scan`
- **Then** System validates ticket `partner_id` matches operator's `partner_id`
- **And** Returns RED status if mismatch (unauthorized)

---

## Business Rules

### Operator Types
| Type | Created By | Can See | Can Redeem |
|------|------------|---------|------------|
| INTERNAL | System Admin | All venues | All tickets |
| OTA | OTA Platform | OTA venues | OTA tickets |

### Permission Model
- Single `operators` permission for all operator CRUD operations
- OTA can only manage operators with matching `partner_id`

### Security Rules
- OTA operators cannot access other OTA's operators
- Redemption blocked for mismatched partner_id

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| ota-operator-management | Draft | OTA operator CRUD API |

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| OTA operator creation | API available | Pending |
| Scope isolation | Zero cross-OTA access | Pending |
| Login compatibility | Works with existing miniprogram | Pending |
