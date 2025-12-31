# Bug Template

Use this template when creating a new bug report. Choose the format that fits your needs:
- **Full Format**: For complex bugs affecting multiple cards/stories
- **Medium Format**: For standard bugs with clear scope
- **Lightweight Format**: For simple, quick fixes

---

## Full Format

```yaml
---
id: BUG-XXX
title: "[Concise bug description]"
slug: kebab-case-title
severity: "[Critical | High | Medium | Low]"
status: "[Open | In Progress | PR | Resolved | Closed]"
affected_cards: ["card-slug-1", "card-slug-2"]
affected_stories: ["US-XXX", "US-YYY"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
reporter: "[name/email]"
reported_at: "YYYY-MM-DDTHH:mm:ss+TZ"
discovered_in_readiness: "[prototype | mvp | production]"
discovered_in_mode: "[mock | database | both]"
pr: "[PR-URL or null]"
resolved_at: "[ISO timestamp or null]"
root_cause: "[category: null-check-missing | logic-error | race-condition | config-error | etc]"
---

# [Bug Title] — Dev Notes

## 1) Summary
[One paragraph describing what went wrong, who it affects, business impact]

## 2) Reproduction Steps
- Step 1
- Step 2
- Step 3

**Expected**: [What should happen]
**Actual**: [What actually happens]

## 3) Root Cause Analysis
[Technical explanation of why this happened]

**File**: `path/to/file.ts`
**Line**: XX
**Code**:
```typescript
// Problematic code
```

## 4) Affected Components
- **Card**: card-slug (path, module)
- **Entity**: EntityName (related domain types)
- **Services**: service-name.ts
- **Tests**: which tests should catch this

## 5) Impact Assessment
- **Scope**: What breaks? (e.g., "Order creation fails when pricing_context is empty")
- **Severity**: Why? (e.g., "Blocks US-011 implementation")
- **Data Risk**: Any data corruption? Workarounds?

## 6) Fix Implementation
**Change 1**: File path
- What changed
- Why this fixes the issue

**Change 2**: File path
- What changed
- Why this fixes the issue

**Test Coverage**: What tests were added/updated

## 7) Verification
**Manual Test**:
```bash
curl http://localhost:8080/endpoint -d '...'
# Expected: ...
```

**Newman Test**: [Link to test scenario if applicable]

## 8) Relationships
- **Blocks**: [US-XXX, BUG-YYY]
- **Blocked By**: [BUG-ZZZ, Card ABC]
- **Related**: [Similar issues or affected features]

## 9) Post-Incident
- **Resolution Date**: YYYY-MM-DD
- **Time to Fix**: X hours
- **Prevention**: How to prevent similar issues?
```

---

## Medium Format

```yaml
---
id: BUG-XXX
title: "[Bug description]"
severity: "[Critical | High | Medium | Low]"
status: "[Open | In Progress | PR | Resolved | Closed]"
affected_cards: ["card-slug"]
affected_stories: ["US-XXX"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
reported_at: "YYYY-MM-DDTHH:mm:ss+TZ"
discovered_in_mode: "[mock | database | both]"
pr: null
---

# [Bug Title]

## Issue
[Clear description of the problem]

## Reproduction
[How to trigger the bug]

**Expected**: [What should happen]
**Actual**: [What happens]

## Root Cause
[Technical explanation]

**File**: `path/to/file.ts:line`
**Problem**: [What's wrong in the code]

## Fix
[How to fix it]

## Verification
```bash
# Test command
curl http://localhost:8080/endpoint
```

## Impact
- **Blocks**: [US-XXX]
- **Severity**: [Why this severity level]
```

---

## Lightweight Format

```yaml
---
id: BUG-XXX
title: "[Bug description]"
severity: "[High | Medium | Low]"
status: "[Open | In Progress | Resolved]"
affected_cards: ["card-slug"]
team: "[A - Commerce | B - Fulfillment | C - Gate]"
---

# [Bug Title]

## Issue
[What's broken]

## Reproduction
[How to see the bug]

## Root Cause
[Why it happens - file:line]

## Fix
[How to fix it]
```

---

## Severity Guidelines

### Critical
- System is down or unusable
- Data loss or corruption
- Security vulnerability
- Blocks deployment to production

### High
- Feature completely broken
- Blocks user story implementation
- Affects multiple teams
- No reasonable workaround

### Medium
- Functional issue with workaround
- Affects single team/feature
- Performance degradation
- Poor error messages

### Low
- Minor UI issues
- Documentation errors
- Code quality improvements
- Nice-to-have enhancements

---

## Status Lifecycle

1. **Open**: Bug reported, not yet being worked on
2. **In Progress**: Developer assigned, work started, PR created
3. **PR**: Pull request submitted, awaiting review
4. **Resolved**: Fix merged to main branch
5. **Closed**: Fix verified in production, bug archived to RESOLVED/

---

## Naming Convention

**File name**: `BUG-[ID]-[kebab-case-title].md`

**Examples**:
- `BUG-001-inventory-filter-null-check.md`
- `BUG-042-wallyt-payment-timeout.md`
- `BUG-103-typescript-build-error.md`

**Location**:
- Active bugs: `docs/bugs/ACTIVE/`
- Resolved bugs: `docs/bugs/RESOLVED/`

---

## Quick Start

1. Copy the appropriate format above
2. Fill in the frontmatter fields
3. Save to `docs/bugs/ACTIVE/BUG-[ID]-[title].md`
4. Add entry to `docs/bugs/_index.yaml`
5. Link from affected cards/stories if needed
6. Update status as work progresses
7. Move to `RESOLVED/` when fixed and verified
