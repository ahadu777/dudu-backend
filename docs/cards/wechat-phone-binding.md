---
card: "WeChat Mini-Program Authentication - Phone Number Binding"
slug: wechat-phone-binding
team: "C - Identity & Access"
oas_paths: ["/auth/wechat/phone"]
migrations: []  # Reuses wechat_openid migration from wechat-auth-login
status: "Done"
readiness: "mvp"
branch: ""
pr: ""
newman_report: "reports/newman/wechat-phone-binding.json"
last_update: "2025-01-06T10:30:00+08:00"
related_stories: ["US-014"]
relationships:
  depends_on: ["wechat-auth-login"]  # User must be logged in first
  enhanced_by: []
  triggers: []
  data_dependencies: ["users"]
  integration_points:
    external_apis: ["WeChat getPhoneNumber API", "WeChat access_token API"]
    middlewares: ["JWT authentication (existing)"]
---

# WeChat Mini-Program Authentication - Phone Number Binding — Dev Notes

## Status & Telemetry
- Status: Ready
- Readiness: mvp (optional enhancement feature)
- Spec Paths: /auth/wechat/phone
- Migrations: None (reuses columns from wechat-auth-login migration)
- Newman: Ready for implementation • reports/newman/wechat-phone-binding.json
- Last Update: 2025-01-06T10:30:00+08:00

## 0) Prerequisites
- wechat-auth-login card completed (user can log in)
- JWT authentication middleware exists (src/middlewares/auth.ts)
- `authenticate` middleware available for protected endpoints
- users table has phone column (VARCHAR(32))
- users table has wechat_extra JSON column (from wechat-auth-login migration)
- Environment variables configured:
  - `WECHAT_APP_ID`: WeChat mini-program AppID
  - `WECHAT_APP_SECRET`: WeChat mini-program AppSecret
  - `JWT_SECRET`: Existing JWT signing secret
- WeChat mini-program enterprise certified (phone number API requires certification)

## 1) API Sequence (Context)
```mermaid
sequenceDiagram
  actor USER as WeChat User
  participant MP as Mini-Program
  participant BACKEND as Backend API
  participant WECHAT as WeChat API
  participant CACHE as Access Token Cache
  participant DB as Database

  Note over USER,MP: User already logged in (has JWT token)

  USER->>+MP: Tap "Bind Phone Number" button
  MP->>MP: <button open-type="getPhoneNumber" />
  MP->>MP: WeChat authorization dialog
  USER->>MP: Confirm authorization
  MP-->>MP: Returns: code (phone authorization code)

  MP->>+BACKEND: POST /auth/wechat/phone {code}
  Note over MP,BACKEND: JWT token in Authorization header

  BACKEND->>BACKEND: Validate JWT token (authenticate middleware)
  BACKEND->>BACKEND: Extract user_id from token

  BACKEND->>+CACHE: Get access_token
  alt Access token cached
    CACHE-->>BACKEND: Valid access_token
  else Access token expired/missing
    BACKEND->>+WECHAT: GET /cgi-bin/token (appid, secret)
    WECHAT-->>-BACKEND: {access_token, expires_in: 7200}
    BACKEND->>CACHE: Cache access_token (TTL: 7200s)
  end

  BACKEND->>+WECHAT: POST /wxa/business/getuserphonenumber
  Note over BACKEND,WECHAT: Body: {code}, Query: ?access_token=XXX
  WECHAT-->>-BACKEND: {phone_info: {phoneNumber, countryCode}}

  BACKEND->>+DB: UPDATE users SET phone = ? WHERE id = user_id
  DB-->>-BACKEND: Update successful

  BACKEND-->>-MP: 200 {phone: "+8613800138000", user: {...}}
  MP->>MP: Show success: "Phone number bound"
  MP-->>-USER: Phone binding complete
```

## 2) Contract (OAS 3.0.3)
```yaml
paths:
  /auth/wechat/phone:
    post:
      tags: [Authentication]
      summary: Bind user's phone number via WeChat authorization
      description: |
        Binds user's phone number using WeChat's new getPhoneNumber API (2021+).
        No session_key decryption needed - WeChat API returns plaintext phone number.

        Security: Requires JWT token (user must be logged in)
      operationId: bindWeChatPhone
      security:
        - BearerAuth: []  # JWT token required

      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - code
              properties:
                code:
                  type: string
                  description: Phone authorization code from WeChat getPhoneNumber button
                  example: "021XyZaBcDeF3GH4jI5KLmN6OP7XyZaBc18"
                  minLength: 1
                  maxLength: 128

      responses:
        "200":
          description: Phone number bound successfully
          content:
            application/json:
              schema:
                type: object
                required:
                  - phone
                  - user
                properties:
                  phone:
                    type: string
                    description: Bound phone number (E.164 format)
                    example: "+8613800138000"
                  user:
                    type: object
                    description: Updated user profile
                    required:
                      - user_id
                      - name
                      - phone
                      - auth_type
                    properties:
                      user_id:
                        type: integer
                        example: 123
                      name:
                        type: string
                        example: "WeChat User ABC123"
                      phone:
                        type: string
                        example: "+8613800138000"
                      avatar_url:
                        type: string
                        nullable: true
                        example: null
                      auth_type:
                        type: string
                        example: "wechat"
                      updated_at:
                        type: string
                        format: date-time
                        example: "2025-01-06T10:45:00Z"

        "401":
          description: Unauthorized (no JWT token or invalid token)
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    example: "UNAUTHORIZED"
                  message:
                    type: string
                    example: "Please log in first"

        "422":
          description: Invalid phone authorization code
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    example: "INVALID_PHONE_CODE"
                  message:
                    type: string
                    example: "Phone authorization code is invalid or expired"
                  details:
                    type: string
                    example: "WeChat API error: errcode 40001 (invalid access_token)"

        "500":
          description: Internal server error
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: string
                    example: "PHONE_BINDING_FAILED"
                  message:
                    type: string
                    example: "Failed to bind phone number"

      x-code-samples:
        - lang: 'curl'
          source: |
            curl -X POST http://localhost:8080/auth/wechat/phone \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
              -d '{"code":"021XyZaBcDeF3GH4jI5KLmN6OP7XyZaBc18"}'

        - lang: 'JavaScript (Mini-Program)'
          source: |
            // In WXML
            <button open-type="getPhoneNumber" bindgetphonenumber="getPhoneNumber">
              Bind Phone Number
            </button>

            // In JS
            getPhoneNumber(e) {
              if (e.detail.code) {
                const token = wx.getStorageSync('token');
                wx.request({
                  url: 'https://your-api.com/auth/wechat/phone',
                  method: 'POST',
                  data: { code: e.detail.code },
                  header: { 'Authorization': `Bearer ${token}` },
                  success: (res) => {
                    console.log('Phone bound:', res.data.phone);
                    wx.showToast({ title: 'Phone number bound' });
                  },
                  fail: () => {
                    wx.showToast({ title: 'Binding failed', icon: 'error' });
                  }
                });
              } else {
                console.log('User refused phone authorization');
              }
            }
```

## 3) Invariants
- User MUST be logged in (valid JWT token required)
- Phone number binding is OPTIONAL (user can skip)
- One phone number can be bound to multiple WeChat users (no unique constraint)
- Phone number is stored as plaintext E.164 format (e.g., "+8613800138000")
- WeChat access_token MUST be cached (2-hour validity, 2000 daily requests limit)
- Phone authorization code is single-use (expires immediately after use)
- WeChat API returns already-decrypted phone number (no session_key needed)

## 4) Validations, Idempotency & Concurrency

### Input Validation
- **code** (required):
  - Non-empty string
  - Length: 1-128 characters
  - Format: Alphanumeric string from WeChat getPhoneNumber
  - Validity: Must be unused and not expired

- **JWT token** (required in Authorization header):
  - Format: "Bearer {token}"
  - Validation: Handled by authenticate middleware
  - Expiry: Checked by JWT library

### WeChat API Response Validation
- **access_token**:
  - Format: String (varies in length)
  - Validity: 7200 seconds (2 hours)
  - Caching: Required to avoid hitting daily 2000 request limit
  - Error handling: errcode 40001 (invalid/expired token) → refresh and retry

- **phone_info**:
  - Structure: `{phoneNumber, purePhoneNumber, countryCode, watermark}`
  - phoneNumber: Full number with country code (e.g., "+8613800138000")
  - countryCode: Country code only (e.g., "86")
  - Format validation: E.164 standard

### Idempotency
- **Multiple phone binding attempts**:
  - Updates phone field each time (replaces previous value)
  - Safe to call multiple times
  - No duplicate phone constraint (different users can have same phone)

- **Binding same phone twice**:
  - Updates users.phone with same value (no-op in database)
  - Returns 200 with current phone number
  - Idempotent operation

### Concurrency Handling
- **Access token cache**:
  - Thread-safe cache implementation (in-memory Map with mutex OR Redis)
  - Multiple concurrent requests can share same cached token
  - Atomic cache update on token refresh

- **User update concurrency**:
  - Last write wins (if multiple concurrent bindings for same user)
  - UPDATE query is atomic (database handles concurrency)

## 5) Rules & Writes (TX)

### Phone Binding Flow
```typescript
1. Validate JWT token (authenticate middleware)
   - Extract: user_id from token payload
   - Throw 401 if token invalid/expired

2. Validate request body
   - Check: code is non-empty string
   - Throw 400 if invalid

3. Get WeChat access_token (with caching)
   - Check cache: access_token exists and not expired?

   IF cached token exists:
     - Use cached access_token
     - Skip WeChat API call

   ELSE (no cache or expired):
     - Request: GET /cgi-bin/token
     - Params: grant_type=client_credential, appid, secret
     - Response: {access_token, expires_in: 7200}
     - Cache: Store access_token with TTL = 7200 seconds
     - Use: New access_token

4. Call WeChat getPhoneNumber API
   - Request: POST /wxa/business/getuserphonenumber?access_token={token}
   - Body: {code: phone_authorization_code}
   - Timeout: 5 seconds
   - Response: {
       errcode: 0,  // Success
       errmsg: "ok",
       phone_info: {
         phoneNumber: "+8613800138000",
         purePhoneNumber: "13800138000",
         countryCode: "86",
         watermark: {...}  // Ignore
       }
     }
   - Check: errcode === 0
   - Throw 422 if errcode !== 0

5. Extract phone number from response
   - Use: phone_info.phoneNumber (E.164 format with country code)
   - Optional: Store phone_info.countryCode in wechat_extra JSON

6. Update user phone number
   BEGIN TRANSACTION

   UPDATE users
   SET
     phone = phone_info.phoneNumber,
     wechat_extra = JSON_SET(
       COALESCE(wechat_extra, '{}'),
       '$.phone_country_code', phone_info.countryCode
     ),
     updated_at = NOW()
   WHERE id = user_id

   COMMIT TRANSACTION

7. Fetch updated user profile
   - SELECT * FROM users WHERE id = user_id

8. Return 200 with {phone, user}
```

### Error Handling
```typescript
// JWT authentication errors (handled by middleware)
- No Authorization header
  → Return 401 UNAUTHORIZED

- Invalid JWT token
  → Return 401 "Invalid token"

- Expired JWT token
  → Return 401 "Token expired"

// WeChat access_token errors
- errcode 40013: Invalid appid
  → Return 500 (configuration error)

- errcode 40001: Invalid or expired access_token
  → Clear cache, retry with new token
  → If retry fails, return 500

// WeChat getPhoneNumber errors
- errcode 40029: Invalid phone authorization code
  → Return 422 INVALID_PHONE_CODE

- errcode 48001: API unauthorized (mini-program not certified)
  → Return 422 with message "Phone API not available"

- Network timeout/error
  → Retry once, then return 500

// Database errors
- Connection error
  → Return 500 with generic error message
  → Log detailed error for debugging
```

## 6) Data Impact & Transactions

### Database Schema (No New Migration)
```sql
-- Reuses columns from wechat-auth-login migration (0014)

-- users.phone (already exists)
-- Type: VARCHAR(32) UNIQUE NULL
-- Stores: E.164 format phone number (e.g., "+8613800138000")

-- users.wechat_extra (from migration 0014)
-- Type: JSON NULL
-- Stores: Extended WeChat info including phone_country_code
-- Example:
-- {
--   "nickname": "张三",
--   "gender": 1,
--   "city": "深圳",
--   "phone_country_code": "86"  ← Added by phone binding
-- }
```

### Mock Data Store Changes
```typescript
// File: src/core/mock/data.ts

// Add helper method:
updateUserPhone(userId: number, phone: string, countryCode: string): void {
  const user = this.users.get(userId);
  if (!user) throw new Error('User not found');

  user.phone = phone;
  user.wechat_extra = {
    ...user.wechat_extra,
    phone_country_code: countryCode
  };
  user.updated_at = new Date();
}
```

### WeChat Access Token Cache
```typescript
// In-memory cache implementation (for single-instance deployments)
class WeChatAccessTokenCache {
  private token: string | null = null;
  private expiresAt: Date | null = null;

  get(): string | null {
    if (!this.token || !this.expiresAt) return null;
    if (new Date() >= this.expiresAt) {
      this.token = null;
      return null;
    }
    return this.token;
  }

  set(token: string, expiresIn: number): void {
    this.token = token;
    // Set expiry 5 minutes before actual expiry (buffer)
    this.expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000);
  }

  clear(): void {
    this.token = null;
    this.expiresAt = null;
  }
}

// For multi-instance deployments, use Redis:
// await redis.setex('wechat:access_token', 7200, token);
```

### Transaction Scope
- **Transaction Start**: Before UPDATE users query
- **Transaction End**: After UPDATE completes
- **Atomic Operations**: phone update + wechat_extra JSON update + updated_at timestamp
- **No Rollback Needed**: Single UPDATE operation, database handles atomicity

## 7) Observability

### Logging Events
```typescript
// Success events
logger.info('wechat.phone.binding.started', { user_id });
logger.info('wechat.access_token.cache_hit', { expires_in_seconds: number });
logger.info('wechat.access_token.cache_miss', { refreshing: true });
logger.info('wechat.access_token.refreshed', { expires_in: 7200 });
logger.info('wechat.phone.retrieved', {
  user_id,
  country_code: string,
  phone_masked: "+86138****8000"
});
logger.info('wechat.phone.bound', { user_id, duration_ms: number });

// Error events
logger.error('wechat.access_token.failed', {
  errcode: number,
  errmsg: string
});
logger.error('wechat.phone.api.failed', {
  errcode: number,
  errmsg: string,
  user_id
});
logger.error('wechat.phone.binding.failed', {
  user_id,
  reason: string
});

// Security events
logger.warn('wechat.phone.unauthorized', { user_id: 'unknown' });
logger.warn('wechat.phone.invalid_code', { user_id });
```

### Metrics
```typescript
// Performance metrics
metrics.histogram('wechat.phone.binding.duration', duration_ms);
metrics.histogram('wechat.phone.api.duration', api_duration_ms);
metrics.histogram('wechat.access_token.refresh.duration', refresh_duration_ms);

// Business metrics
metrics.increment('wechat.phone.bound');
metrics.increment('wechat.phone.binding.failed', { error_code });
metrics.increment('wechat.access_token.cache_hit');
metrics.increment('wechat.access_token.cache_miss');

// API health metrics
metrics.increment('wechat.api.call', { endpoint: 'getuserphonenumber' });
metrics.increment('wechat.api.error', { errcode });

// Cache metrics
metrics.gauge('wechat.access_token.ttl', ttl_seconds);
metrics.increment('wechat.access_token.expired');
```

### Monitoring Alerts
- **Access token quota**: Alert if daily API calls approaching 2000 limit
- **High error rate**: Alert if phone binding error rate >10% over 5 minutes
- **Slow WeChat API**: Alert if P95 getPhoneNumber latency >3 seconds
- **Cache issues**: Alert on frequent cache misses (>50% miss rate)

## 8) Acceptance — Given / When / Then

### Scenario 1: First Phone Binding
**Given** User is logged in (has JWT token) and phone is null
**When** User taps "Bind Phone Number" and authorizes
**Then**:
- WeChat getPhoneNumber API called successfully
- Phone number retrieved and stored in users.phone
- Country code stored in wechat_extra.phone_country_code
- Response 200 with {phone: "+8613800138000", user: {...}}
- User can now use phone for notifications/support

### Scenario 2: Update Phone Number (Rebind)
**Given** User already has phone number bound
**When** User binds new phone number
**Then**:
- Old phone number replaced with new phone number
- wechat_extra.phone_country_code updated
- updated_at timestamp refreshed
- Response 200 with new phone number

### Scenario 3: Unauthorized Request
**Given** User is not logged in (no JWT token)
**When** User attempts to bind phone
**Then**:
- authenticate middleware rejects request
- Response 401 "No token provided"
- No WeChat API call made

### Scenario 4: Invalid Phone Code
**Given** User provides expired or invalid phone authorization code
**When** Backend calls getPhoneNumber API
**Then**:
- WeChat API returns errcode 40029 (invalid code)
- Response 422 INVALID_PHONE_CODE
- Phone not updated in database

### Scenario 5: Access Token Cached
**Given** Access token exists in cache and not expired
**When** User binds phone number
**Then**:
- Cached access_token used (no token refresh API call)
- getPhoneNumber API called with cached token
- Phone binding completes successfully
- Faster response time (<300ms vs >500ms with refresh)

### Scenario 6: Access Token Expired
**Given** Access token in cache has expired
**When** User binds phone number
**Then**:
- Cache returns null (token expired)
- New access_token requested from WeChat
- Token cached with 2-hour TTL
- getPhoneNumber API called with fresh token
- Phone binding completes successfully

## 9) Postman Coverage

### Test Collection: wechat-phone-binding
```json
{
  "name": "WeChat Phone Binding",
  "tests": [
    {
      "name": "1. Bind Phone - Mock Success",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/wechat/phone",
        "headers": {
          "Authorization": "Bearer {{valid_token}}"
        },
        "body": {
          "code": "mock-phone-code-{{$randomUUID}}"
        }
      },
      "assertions": [
        "status === 200",
        "response.phone exists",
        "response.phone matches /^\\+\\d{11,15}$/",
        "response.user.phone === response.phone"
      ]
    },
    {
      "name": "2. Unauthorized - No Token",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/wechat/phone",
        "body": {
          "code": "mock-phone-code-12345"
        }
      },
      "assertions": [
        "status === 401",
        "response.code === 'UNAUTHORIZED'"
      ]
    },
    {
      "name": "3. Invalid Phone Code",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/wechat/phone",
        "headers": {
          "Authorization": "Bearer {{valid_token}}"
        },
        "body": {
          "code": "invalid-phone-code"
        }
      },
      "assertions": [
        "status === 422",
        "response.code === 'INVALID_PHONE_CODE'"
      ]
    },
    {
      "name": "4. Verify Phone Bound in Profile",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/profile",
        "headers": {
          "Authorization": "Bearer {{valid_token}}"
        }
      },
      "assertions": [
        "status === 200",
        "response.phone === {{phone_from_test_1}}"
      ]
    }
  ]
}
```

### Newman Command
```bash
# Run tests in Mock mode
newman run reports/collections/wechat-phone-binding.json \
  --environment test-env.json \
  --global-var valid_token={{token_from_login_test}} \
  --reporters cli,json \
  --reporter-json-export reports/newman/wechat-phone-binding.json

# Expected: All tests pass (4/4)
```

---

## Implementation Notes

### Mock-First Development Strategy
1. **Phase 1 (Day 1): Mock WeChat APIs**
   - Mock access_token response: `{"access_token":"mock-token-123","expires_in":7200}`
   - Mock getPhoneNumber response: `{"phone_info":{"phoneNumber":"+8613800138000","countryCode":"86"}}`
   - Skip real WeChat API calls

2. **Phase 2 (Day 2): Real WeChat API Integration**
   - Implement access_token caching (in-memory for dev)
   - Implement real getPhoneNumber API call
   - Handle WeChat error codes (40001, 40029, 48001)
   - Add retry logic for expired access_token

3. **Phase 3 (Day 3): Production Readiness**
   - Upgrade cache to Redis (for multi-instance deployments)
   - Add monitoring for access_token quota
   - Performance testing (P95 latency <500ms)

### Security Considerations
- ✅ **JWT token validation** (authenticate middleware ensures user is logged in)
- ✅ **Phone number privacy** (mask in logs, show only last 4 digits)
- ✅ **Access token security** (never log or expose in API responses)
- ✅ **Rate limiting** (50 requests/user/hour to prevent abuse)

### Performance Optimization
- **Access token caching**: Reduces API calls by 99% (7200s / 300s avg binding interval)
- **Cache hit rate target**: >95%
- **P95 latency with cache hit**: <300ms
- **P95 latency with cache miss**: <800ms (includes token refresh)
- **Optimization**: Proactive token refresh 5 minutes before expiry

### WeChat API Quota Management
- **Daily limit**: 2000 access_token requests/day
- **With caching**: ~12 refreshes/day (every 2 hours)
- **Headroom**: 166x safety margin
- **Monitoring**: Alert if daily refreshes >100 (indicates cache issues)

---

## Validation Evidence
- ✅ Card spec complete and approved
- ✅ No migration needed (reuses wechat-auth-login schema)
- ✅ Mock implementation tested
- [ ] Real WeChat API tested (requires enterprise-certified mini-program)
- [ ] Newman E2E tests passing (Mock mode)
- [ ] Access token caching validated (hit rate >95%)
- [ ] Performance benchmarks met (P95 <500ms)
