# Refactoring Impact Analysis

## When to Use

**Use before any significant code changes:**
- Changing core business logic or data models
- Modifying shared utilities or common patterns
- Updating API contracts or database schemas
- Partner-specific customizations affecting multiple areas

---

## The Refactoring Impact Analysis Tool

```bash
# Run comprehensive impact analysis
node scripts/refactoring-impact-analysis.mjs

# Output includes:
# - Technical dependencies and affected files
# - Business impact: Stories, Cards, PRD features affected
# - User impact: B2B Partners, End Users, Operations teams
# - Stakeholder notification requirements
```

---

## Impact Classification

### High-Impact Changes (Requires Careful Analysis)
- Database operations (`repository`, `entity`, `migration`)
- Authentication/authorization (`middleware`, `auth`)
- Core business logic (`service`, `domain`)
- API contracts (`router`, `controller`)

### Medium-Impact Changes (Review Dependencies)
- Fallback behaviors (`|| 'default'`)
- Configuration patterns (`config`, `env`)
- Data transformation (`mapper`, `transformer`)

### Low-Impact Changes (Minimal Validation)
- Logging and comments
- Mock data and test fixtures
- Development utilities

---

## Systematic Refactoring Process

1. **Run Impact Analysis**: `node scripts/refactoring-impact-analysis.mjs`
2. **Prioritize by Severity**: Start with HIGH severity items
3. **Test Each Change**: Verify functionality after each modification
4. **Update Integration Tests**: Ensure cross-module compatibility
5. **Validate Partner Isolation**: Test with different API keys

---

## Channel ID Mapping Patterns

### Correct Pattern
```typescript
// Use partnerId with fallback
const channelId = partnerId || 'ota';
inventory.activateReservation(channelId, quantity);
```

### Incorrect Pattern
```typescript
// Hardcoded channel - breaks partner isolation
inventory.activateReservation('ota', quantity);
```

### Partner-to-Channel Mapping
- `ota_full_access_partner` → partner-specific channel
- `ota251103_partner` → partner-specific channel
- `dudu_partner` → partner-specific channel
- Fallback: `'ota'` (legacy default)

---

## Proven Success Example: OTA Channel Fix

**Issue Found:**
```typescript
inventory.activateReservation('ota', 1)  // hardcoded
```

**Impact Analysis Results:**
- Technical: 30 findings across 6 files
- Business: 8 stories, 26 cards, 4 PRD features
- Users: B2B Partners (API integration), Finance team

**Solution:**
```typescript
inventory.activateReservation(partnerId, 1)  // partner-specific
```

**Validation:** Tested with multiple API keys, confirmed partner-specific inventory tracking

---

## Related

- [CLAUDE.md - Reality Check](../../CLAUDE.md#reality-check)
- [Case Studies](../cases/)
