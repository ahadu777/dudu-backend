---
card: "QR token — short-lived token for ticket scanning"
slug: qr-token
team: "B - Tickets"
oas_paths: ["/tickets/{code}/qr-token"]
migrations: []
status: "Ready"
readiness: "prototype"
branch: ""
pr: ""
newman_report: "reports/newman/qr-token.json"
last_update: "2025-10-20T09:56:51+0800"
related_stories: ["US-001","US-003"]
---

## Status & Telemetry
- Status: Ready
- Readiness: prototype
- Spec Paths: /tickets/{code}/qr-token
- Migrations: N/A
- Newman: 0/0 • reports/newman/qr-token.json
- Last Update: 2025-10-20T09:56:51+0800

## 0) Prerequisites
- Buyer can view tickets; ticket belongs to user.
- `QR_SIGNER_SECRET` available in env (HS256).

## 1) API Sequence (Context)
```mermaid
sequenceDiagram
  actor U as User
  participant T as Tickets API
  U->>T: POST /tickets/{code}/qr-token
  T-->>U: 200 {token, expires_in}
  loop refresh every ~45s while open
    U->>T: POST /tickets/{code}/qr-token
    T-->>U: 200 {new token}
  end
```

## 2) Contract (OAS 3.0.3)
```yaml
paths:
  /tickets/{code}/qr-token:
    post:
      tags: [Tickets]
      summary: Create a short-lived signed token for scanning
      security: [{ bearerAuth: [] }]
      parameters:
        - in: path
          name: code
          required: true
          schema: { type: string }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QRTokenResponse'
```

## 3) Invariants
- Token TTL ≤ 60s.  
- Payload includes `tid` or `ticket_code` hash and `jti` (nonce).

## 4) Validations
- Auth required; ticket must belong to user and not be `void/expired`.

## 5) Rules & Writes
1) Validate ownership and status.  
2) Build JWT payload: `{ tid, code_hash, exp: now+60, jti: random }` (HS256).  
3) Return `{ token, expires_in: 60 }`.

## 6) Data Impact
- None (read-only).

## 7) Observability
- Log `qr.issue {ticket_id}`; metric `qr.issue.count`.

## 8) Acceptance
**Given** user has a ticket. **When** POST `/tickets/{code}/qr-token`. **Then** `200` and a parseable JWT with `exp` within 60–120s.

## 9) Postman Coverage
```js
pm.test('200', ()=> pm.response.to.have.status(200));
const t = pm.response.json().token;
pm.expect(typeof t).to.eql('string');
```