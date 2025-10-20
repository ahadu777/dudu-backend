# Error Catalog — v0.1
_Last updated: 2025-10-20T09:47:38+0800_

Uniform error shape across endpoints:
```json
{ "code": "WRONG_FUNCTION", "message": "Function not present on this ticket" }
```

| HTTP | code | meaning |
|--:|--|--|
| 409 | IDEMPOTENCY_CONFLICT | Same idempotency key maps to conflicting payload |
| 422 | TOKEN_EXPIRED | QR token expired |
| 422 | WRONG_FUNCTION | function_code not on the ticket |
| 422 | NO_REMAINING | entitlement has no remaining uses |
| 422 | TICKET_INVALID | ticket void/expired/not owned |
| 401 | UNAUTHORIZED | missing/invalid token |
| 403 | FORBIDDEN | not permitted |
| 404 | NOT_FOUND | not found |
