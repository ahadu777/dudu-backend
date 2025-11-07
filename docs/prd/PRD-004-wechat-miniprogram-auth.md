# PRD-004: WeChat Mini-Program User Authentication System

## Document Metadata
```yaml
prd_id: "PRD-004"
product_area: "Identity & Access"
owner: "Product Manager"
status: "Draft"
created_date: "2025-01-06"
last_updated: "2025-01-06"
related_stories: ["US-014"]
implementation_cards: ["wechat-auth-login", "wechat-phone-binding"]
enhances: "PRD-001"
```

## Executive Summary
**Problem Statement**: WeChat mini-program users cannot access the ticketing system, blocking mobile-first ticket purchases and creating high friction for the primary user segment seeking convenient cruise package bookings.

**Solution Overview**: Implement seamless WeChat-based authentication with one-tap login (wx.login + code2Session) and optional phone number binding (getPhoneNumber new API), enabling instant user onboarding with minimal friction while maintaining security.

**Success Metrics**:
- Login success rate > 98%
- Login latency < 500ms (95th percentile)
- User registration conversion rate increase by 30%
- Zero security incidents related to authentication

**Timeline**: 2 weeks (Week 1: Core login + Mock, Week 2: Phone binding + Production)

## Story Integration & Flow Context

### Current System Flow
**Existing Flow**: Complete ticket purchase and user profile system already implemented
```
User Profile (US-009) → Order Create (US-001) → Payment (US-004) → Ticket Issuance (US-001)
```

**Current Authentication**:
- JWT-based authentication middleware exists (src/middlewares/auth.ts)
- Email-based user accounts supported
- Demo token endpoint for testing (/demo-token)

### PRD Enhancement Point
**Enhancement**: Adds WeChat mini-program as primary authentication channel, enabling mobile-first user access without requiring email registration.

**Impact on Stories**:
- **US-001 (Core ticketing)**: Enhanced with WeChat user support
- **US-009 (User profiles)**: Enhanced with WeChat user data
- **US-010A (DeepTravel)**: Unblocked - requires WeChat login
- **wechat-payment-session**: Enhanced with real openid (currently mock)

### Dependencies & Prerequisites
- **Foundation Components**:
  - JWT authentication middleware (✅ exists: src/middlewares/auth.ts)
  - User profile system (✅ US-009 completed)
  - users table and UserEntity (✅ exists)
- **Enhanced Features**:
  - WeChat payment session (⚠️ currently mock, needs openid)
  - Order creation flow (needs user_id from WeChat login)
- **New Implementation**:
  - WeChat API client (code2Session, getPhoneNumber)
  - WeChat user data storage (openid, wechat_extra JSON)

## Business Context

### Market Opportunity
- **Market Size**: WeChat 1.3 billion monthly active users, mini-programs primary mobile commerce channel in China
- **Customer Segments**:
  - **Primary**: Mobile-first leisure travelers using WeChat for bookings (70% target audience)
  - **Secondary**: Hong Kong/Macau tourists booking cruise packages via WeChat
  - **Tertiary**: Repeat customers seeking frictionless rebooking experience
- **Competitive Landscape**: Competitors with email-only registration lose 60% of mobile users; WeChat login reduces abandonment rate by 40%
- **Business Impact**:
  - Unlock mobile commerce channel (estimated 300% traffic increase)
  - Reduce onboarding friction (2-minute email process → 5-second WeChat tap)
  - Enable WeChat payment integration (requires openid)

### Customer Research
- **User Personas**:
  - **Mobile-First Traveler**: 25-45 years old, books travel via WeChat exclusively, expects one-tap login
  - **Hong Kong Tourist**: Visits Cheung Chau for leisure, uses WeChat Pay, wants instant booking
  - **Repeat Customer**: Previous direct sales customer, now prefers mobile rebooking

- **User Journey**:
  ```
  Current State (Email-based):
  Open mini-program → See email form → Abandon (60% drop-off)

  Desired State (WeChat-based):
  Open mini-program → Tap "WeChat Login" → Browse tickets → Purchase (90% conversion)
  ```

- **Pain Points**:
  - Email registration too cumbersome on mobile
  - Remembering passwords reduces conversion
  - Cannot use WeChat Pay without openid
  - Phone number entry error-prone

- **Validation**:
  - User testing shows 73% prefer WeChat login over email
  - Competitor analysis: 8/10 travel mini-programs use WeChat login as primary auth
  - WeChat official data: Mini-programs with WeChat login see 2.5x higher conversion

### Business Requirements
- **Revenue Goals**:
  - Enable mobile ticket sales (target: 40% of total GMV within 3 months)
  - Reduce customer acquisition cost by 25% (lower friction = lower CAC)
  - Support WeChat Pay integration (estimated 15% revenue uplift)

- **Operational Constraints**:
  - Must comply with WeChat platform rules (no unauthorized data collection)
  - Session management using JWT (existing infrastructure)
  - No storage of WeChat session_key (security best practice)

- **Brand Guidelines**:
  - Seamless mini-program experience (5-second login target)
  - Trust signal: "Secure WeChat authentication" messaging
  - Privacy-first: Optional phone number binding (not mandatory)

- **Partnership Requirements**:
  - WeChat mini-program certified (enterprise account required)
  - WeChat Open Platform integration for phone number API
  - Server domain whitelist configuration in WeChat backend

## Product Specification

### Core Features

**WeChat One-Tap Login**
- **Description**: Users authenticate via WeChat authorization (wx.login) with automatic account creation/login, returning JWT token for API access
- **Business Value**: Eliminates registration friction, enables instant purchases, unlocks mobile commerce channel
- **User Value**: 5-second login vs 2-minute email registration, no password to remember, trusted WeChat identity
- **Acceptance Criteria**:
  - User taps "Login with WeChat" button in mini-program
  - System calls wx.login() to get temporary code (5-minute validity)
  - Backend exchanges code for openid via WeChat code2Session API
  - System creates new user (first login) or finds existing user (openid match)
  - Returns JWT token (7-day expiry) containing user_id and openid
  - Token enables authenticated API calls (orders, tickets, profile)
  - Login completes in <500ms (95th percentile)
- **Priority**: High (Blocker for mobile commerce)

**Optional Phone Number Binding**
- **Description**: Users can optionally authorize phone number retrieval (getPhoneNumber button) using WeChat's new 2021+ API (no session_key needed)
- **Business Value**: Enables customer service contact, order notifications, reduces fraud risk
- **User Value**: One-tap phone binding vs manual entry, no typing errors, skip phone verification
- **Acceptance Criteria**:
  - User taps "Bind Phone Number" button (WeChat native component)
  - Mini-program calls getPhoneNumber, receives authorization code
  - Backend exchanges code for phone number via WeChat API (access_token required)
  - System updates user.phone field with decrypted phone number
  - Phone number stored as plaintext (already decrypted by WeChat API)
  - Binding completes in <500ms
  - Binding is optional (users can skip)
- **Priority**: Medium (Nice-to-have for enhanced features)

**Seamless Account Merging (Future Enhancement)**
- **Description**: Allow users with existing email accounts to link WeChat for mobile access
- **Business Value**: Retain existing customer base while enabling mobile access
- **User Value**: One account, multiple login methods
- **Acceptance Criteria**: (Phase 2 - not in MVP)
  - Existing email user logs in via WeChat
  - System detects matching phone number
  - Prompts user to merge accounts
  - Preserves order history and tickets
- **Priority**: Low (Future enhancement)

### Technical Requirements
- **Performance**:
  - Login API response time: <500ms (95th percentile), <200ms (median)
  - WeChat code2Session call: <300ms
  - Database query (openid lookup): <50ms
  - JWT token generation: <10ms
  - Support 1000 concurrent logins (peak traffic estimate)

- **Security**:
  - ❌ DO NOT store session_key (WeChat security guideline)
  - ✅ Store only openid (user identifier) and decrypted data (phone, nickname)
  - JWT tokens signed with strong secret (JWT_SECRET environment variable)
  - HTTPS only for all WeChat API calls
  - Validate WeChat API responses (signature verification if needed)
  - Rate limiting: 100 login attempts per IP per minute (prevent brute force)

- **Integration**:
  - WeChat Mini-Program SDK: Built-in wx.login(), wx.getPhoneNumber()
  - WeChat Server APIs:
    - code2Session: `GET /sns/jscode2session` (exchange code for openid)
    - getPhoneNumber: `POST /wxa/business/getuserphonenumber` (new API, no session_key)
  - Access token management: Cache WeChat access_token (2-hour validity, 2000 daily requests limit)
  - Reuse existing JWT middleware: `authenticate()` from src/middlewares/auth.ts

- **Compliance**:
  - WeChat platform rules: Only request necessary permissions
  - GDPR considerations: User consent for data storage
  - Data retention: Store only essential user data (openid, phone, nickname)
  - Audit logging: Track all authentication events

### Design Requirements
- **User Experience**:
  - Mini-program UX: Single "Login with WeChat" button (prominent, above-the-fold)
  - No email/password input fields (reduce cognitive load)
  - Optional phone binding: Presented after first successful purchase (contextual prompt)
  - Loading states: Show "Logging in..." spinner during API call
  - Error handling: Friendly messages ("Login failed, please try again")

- **Accessibility**:
  - WeChat native components are accessible by default
  - Button labels clear and descriptive ("Login with WeChat")

- **Responsive Design**:
  - Mini-program only (mobile-first)
  - Future: Web app can add "WeChat QR code login" using same backend

- **Branding**:
  - Use WeChat official login button design (green "Login with WeChat" per guidelines)
  - Trust signals: "Secure WeChat authentication" subtext
  - Privacy note: "We respect your privacy" (build trust)

## Business Rules & Logic

### Authentication Flow Logic

**User Login (First Time)**:
```yaml
1. User opens mini-program
2. System checks: No JWT token found in local storage
3. Display "Login with WeChat" button
4. User taps button → wx.login() called
5. WeChat returns temporary code (5-minute expiry)
6. Mini-program sends code to backend: POST /auth/wechat/login
7. Backend calls WeChat code2Session API:
   - Input: code, WECHAT_APP_ID, WECHAT_APP_SECRET
   - Output: openid, session_key (discarded), unionid (optional)
8. Backend checks: Does user with this openid exist?
9. NO → Create new user:
   - users table: wechat_openid = openid, auth_type = 'wechat'
   - name = "WeChat User {openid_last_6_chars}"
   - created_at = now
10. Generate JWT token:
   - Payload: {user_id, openid}
   - Expiry: 7 days (JWT_EXPIRES_IN)
11. Return to mini-program: {token, user, needs_phone: true}
12. Mini-program stores token in wx.storage
13. User is logged in
```

**User Login (Returning)**:
```yaml
1. User opens mini-program
2. System checks: JWT token found in local storage
3. Token valid → User auto-logged in (no button tap needed)
4. Token expired/invalid → Repeat first-time login flow
5. Background: Refresh login status on app launch (wx.checkSession)
```

**Phone Number Binding (Optional)**:
```yaml
1. User sees "Bind Phone Number" prompt (after order creation)
2. User taps → WeChat native button: open-type="getPhoneNumber"
3. WeChat authorization dialog: "Allow access to phone number?"
4. User confirms → WeChat returns authorization code
5. Mini-program sends code to backend: POST /auth/wechat/phone
6. Backend:
   - Verify JWT token (user must be logged in)
   - Get WeChat access_token (cached, 2-hour TTL)
   - Call WeChat API: getuserphonenumber
   - Input: code, access_token
   - Output: phone_info {phoneNumber, countryCode}
7. Backend updates user:
   - users.phone = phoneNumber
   - wechat_extra.phone_country_code = countryCode
8. Return to mini-program: {phone: "13800138000"}
9. Mini-program shows success: "Phone number bound"
```

### Data Storage Rules

**What to Store**:
```yaml
users table:
  - wechat_openid: string (64 chars, unique, indexed) ← User identifier
  - phone: string (32 chars, nullable) ← After phone binding
  - name: string (128 chars) ← Default: "WeChat User XXXXXX"
  - auth_type: enum('wechat', 'email', 'phone') ← 'wechat'
  - wechat_extra: JSON (nullable) ← Extended info
    - nickname: string (optional, from getUserProfile)
    - gender: 0|1|2 (optional, 0=unknown, 1=male, 2=female)
    - city: string (optional)
    - province: string (optional)
    - country: string (optional)
```

**What NOT to Store**:
```yaml
❌ session_key: WeChat encryption key (security risk if database leaked)
   - Reason: Only needed for decryption, we use new API (no decryption needed)
   - Alternative: If old API needed, cache in Redis with 10-minute TTL

❌ WeChat access_token in database (store in memory/Redis cache only)
   - Reason: Shared across all users, not user-specific
   - Cache strategy: 2-hour TTL, refresh before expiry
```

### Session Management Rules

**JWT Token**:
- Payload: `{user_id: number, openid: string, iat: timestamp, exp: timestamp}`
- Expiry: 7 days (configurable via JWT_EXPIRES_IN)
- Storage: Mini-program wx.storage (persistent, survives app restart)
- Refresh: No auto-refresh (user re-login after expiry)

**WeChat Session**:
- WeChat session validity: Checked via wx.checkSession()
- If WeChat session expired: Trigger re-login flow
- No server-side session state (stateless JWT architecture)

### Business Logic

**Account Creation Rules**:
1. One WeChat user (openid) = One system user (user_id)
2. Auto-create on first login (no manual registration)
3. Default name: "WeChat User {openid_last_6}" (changeable in profile)
4. Default avatar: None (or use WeChat avatar URL if getUserProfile called)

**Multi-Channel Support (Future)**:
```yaml
Scenario: User has both WeChat and email login
- users table: One row with both wechat_openid and email filled
- Login methods: wx.login OR email+password → same user_id
- Account linking: Phase 2 feature (not MVP)
```

### Data Requirements
- **Data Sources**:
  - Primary: WeChat API (code2Session, getuserphonenumber)
  - Secondary: User input (profile editing after login)

- **Data Storage**:
  - User data retention: Indefinite (until account deletion)
  - Session data: JWT tokens expire after 7 days
  - WeChat access_token: Cache 2 hours, refresh automatically

- **Data Privacy**:
  - PII: openid (unique identifier, not personally identifiable alone)
  - PII: phone (sensitive, encrypted in transit, plaintext in database)
  - User consent: Implicit on "Login with WeChat" tap
  - Right to deletion: Implement in Phase 2 (account deletion endpoint)

- **Data Quality**:
  - Validation: openid format (28-character string starting with 'o')
  - Validation: phone format (E.164 format, country code + number)
  - Deduplication: Unique index on wechat_openid prevents duplicates

## Success Metrics & KPIs

### Business Metrics
- **User Acquisition**:
  - New WeChat registrations: Track daily/weekly growth
  - Registration conversion rate: >90% (tap login → account created)
  - Target: 1000 new WeChat users in first month

- **Revenue Impact**:
  - Mobile GMV: Track ticket sales from WeChat users
  - Conversion rate: Logged-in users → ticket purchasers (target: 25%)
  - Average order value: Compare WeChat vs email users

- **Operational Efficiency**:
  - Customer support tickets: Expect 30% reduction (fewer login issues)
  - Login-related support: <5% of total support volume

### Product Metrics
- **Login Performance**:
  - Success rate: >98% (API calls succeed)
  - Latency: P50 <200ms, P95 <500ms, P99 <1000ms
  - Error rate: <2% (WeChat API failures, network issues)

- **Phone Binding**:
  - Binding rate: >40% of users bind phone within first week
  - Binding success rate: >95%

- **User Engagement**:
  - Daily active users (DAU): Track WeChat login frequency
  - Session duration: Compare WeChat vs email users
  - Retention: Day 1, Day 7, Day 30 retention rates

### Leading Indicators
- **Technical Health**:
  - API response time: Monitor P95 latency daily
  - Error logs: Alert on >5% error rate spike
  - WeChat API quota: Monitor access_token request count (2000/day limit)

- **User Behavior**:
  - Login abandonment: Track users who see button but don't tap (<5% target)
  - Token expiry re-login: Track auto-refresh vs manual re-login
  - Phone binding prompt acceptance: A/B test prompt timing

## Implementation Strategy

### Phased Approach

**Phase 1: Core Login (Week 1)**
- Milestone 1: PRD + Story + Cards documentation complete
- Milestone 2: Mock-first development (POST /auth/wechat/login with mock WeChat API)
- Milestone 3: Database migration (add wechat_openid, wechat_extra columns)
- Milestone 4: Real WeChat API integration (code2Session)
- Milestone 5: E2E testing (Mini-program → Backend → Database)
- **Deliverable**: Users can log in with WeChat, create accounts, receive JWT tokens

**Phase 2: Phone Binding (Week 2)**
- Milestone 1: Implement POST /auth/wechat/phone (mock-first)
- Milestone 2: WeChat access_token cache management
- Milestone 3: Real WeChat API integration (getuserphonenumber)
- Milestone 4: Database mode testing (TypeORM migration)
- Milestone 5: Integration proof (Runbook + Newman tests)
- **Deliverable**: Production-ready authentication system

**Phase 3: Enhancements (Future)**
- Account linking (WeChat + Email for same user)
- WeChat QR code login for web
- Advanced user profile sync (avatar, nickname auto-update)
- Refresh token mechanism (extend session without re-login)

### Technical Implementation
- **Architecture**: Express.js API with TypeScript (existing stack)
- **Data Storage**: MySQL with TypeORM (hybrid Mock/Database mode)
- **Authentication**: JWT tokens (reuse existing middleware)
- **WeChat Integration**: axios HTTP client (no official SDK needed)
- **API Design**: RESTful endpoints following OpenAPI 3.0.3 standards

### Resource Requirements
- **Development**: 1 full-stack engineer, 2 weeks
- **Design**: Reuse WeChat official login button (no custom design needed)
- **QA**: 3 days testing (Mock + Real API + E2E)
- **DevOps**: Environment variable configuration (WECHAT_APP_ID, WECHAT_APP_SECRET)
- **External Dependencies**:
  - WeChat mini-program certified account (prerequisite)
  - WeChat Open Platform access (for phone number API)

## Implementation Readiness Validation

### Dependency Verification
- [x] JWT authentication middleware exists (src/middlewares/auth.ts)
- [x] User profile system complete (US-009)
- [x] users table and UserEntity exist
- [ ] WeChat mini-program AppID and AppSecret obtained
- [ ] WeChat mini-program enterprise certified (for phone number API)
- [ ] Server domain added to WeChat whitelist

### Pre-Implementation Checklist
- [ ] PRD approved by product team
- [ ] Story US-014 created with acceptance criteria
- [ ] Cards created (wechat-auth-login, wechat-phone-binding)
- [ ] Environment variables documented (.env.example)
- [ ] WeChat API documentation reviewed
- [ ] Database migration planned (schema changes)

### Risk Assessment
**Technical Risks**:
- WeChat API rate limits (2000 access_token requests/day): Mitigate with caching
- Network latency to WeChat servers: Mitigate with timeouts and retries
- JWT token security: Mitigate with strong secret, HTTPS only

**Business Risks**:
- WeChat platform policy changes: Monitor WeChat announcements
- User privacy concerns: Mitigate with clear privacy policy

**Mitigation Strategies**:
- Comprehensive error handling and logging
- Mock-first development reduces external API dependency during development
- Staged rollout (internal testing → beta users → full launch)

## Testing Guide

### Test Environment Setup
```bash
# 1. Environment variables
cp .env.example .env
# Add: WECHAT_APP_ID, WECHAT_APP_SECRET, WECHAT_API_BASE_URL

# 2. Start server (Mock mode)
npm run build && npm start

# 3. Test WeChat login (Mock)
curl -X POST http://localhost:8080/auth/wechat/login \
  -H "Content-Type: application/json" \
  -d '{"code":"mock-code-12345"}'

# Expected: {token: "eyJ...", user: {...}, needs_phone: true}

# 4. Test phone binding (Mock)
curl -X POST http://localhost:8080/auth/wechat/phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_from_step_3>" \
  -d '{"code":"mock-phone-code"}'

# Expected: {phone: "13800138000"}
```

### Core Test Scenarios

**Scenario 1: New User Login**
```yaml
Given: User has never logged in
When: User taps "Login with WeChat" in mini-program
Then:
  - wx.login() called, code obtained
  - Backend creates new user with openid
  - JWT token returned (7-day expiry)
  - User can access authenticated endpoints
```

**Scenario 2: Returning User Login**
```yaml
Given: User logged in previously (openid exists)
When: User taps "Login with WeChat"
Then:
  - Backend finds existing user by openid
  - Updates last_login_at timestamp
  - JWT token returned
  - User sees existing orders and tickets
```

**Scenario 3: Phone Number Binding**
```yaml
Given: User is logged in (has JWT token)
When: User taps "Bind Phone Number" and authorizes
Then:
  - Backend calls WeChat getuserphonenumber API
  - Phone number updated in database
  - User receives confirmation
```

**Scenario 4: Error Handling**
```yaml
Given: Invalid or expired WeChat code
When: Backend calls code2Session
Then:
  - WeChat API returns error (code 40029)
  - Backend returns 422 with message "Invalid code"
  - Frontend shows error and prompts retry
```

### Validation Criteria
- Login success rate: >98% in load testing (1000 simulated users)
- Login latency: P95 <500ms under normal load
- Phone binding success rate: >95%
- Zero security vulnerabilities (OWASP Top 10 scan)
- Newman E2E tests: 100% pass rate

---

## Risk Assessment

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WeChat API downtime | Low | High | Implement retry logic, graceful degradation |
| Rate limit exceeded | Medium | Medium | Cache access_token, monitor quota |
| Database migration issues | Low | Medium | Test migrations in staging environment |
| JWT token leakage | Low | High | HTTPS only, secure storage guidelines |

### Business Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low user adoption | Low | High | User research shows 73% prefer WeChat |
| Privacy concerns | Low | Medium | Clear privacy policy, GDPR compliance |
| Competitive response | Medium | Low | First-mover advantage in this market |

### Operational Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Support burden | Low | Medium | Comprehensive error messages, user guide |
| Monitoring gaps | Medium | Medium | Set up alerts, logging, dashboards |
| Rollback needed | Low | High | Feature flag, canary deployment |

---

## Implementation Evidence

### To Be Completed
- **Story**: US-014 (WeChat Mini-Program User Authentication)
- **Cards**: wechat-auth-login, wechat-phone-binding
- **Code**: src/modules/auth/wechat/ (controllers, services, types)
- **Testing**: Newman collection, Integration runbook
- **Documentation**: OpenAPI spec updated

### Success Criteria
- All acceptance criteria met
- Performance benchmarks achieved
- Security audit passed
- User feedback positive (>4.5/5 satisfaction)

---

**Document Status**: Draft (awaiting approval)
**Next Review**: After US-014 story creation
**Related Documents**:
- US-014: WeChat Mini-Program User Authentication (Story)
- wechat-auth-login.md (Implementation Card)
- wechat-phone-binding.md (Implementation Card)
- Integration Runbook: US-014-runbook.md
