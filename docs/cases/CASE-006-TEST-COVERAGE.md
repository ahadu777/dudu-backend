# CASE-006: Test Coverage Workflow Failure

**Date:** 2025-11-26

**Pattern Tested:** AI automated test coverage analysis for PRD-006/007

---

## What Went Wrong

1. **AI skipped workflow**: Jumped straight to "fix tests" instead of following PRD -> AC -> Test mapping
2. **Goal displacement**: Focused on "making tests pass" instead of "covering requirements"
3. **False confidence**: Claimed 100% coverage when actual coverage was ~50%
4. **Endpoint mismatch ignored**: Tests used `/validators/*` but PRD specified `/api/operator/*`

---

## Root Cause Analysis

- AI prioritized technical execution over workflow compliance
- "Tests passing" != "Requirements covered"
- Missing systematic AC extraction step before test evaluation

---

## Correct Workflow

```
Step 1: Extract ALL Acceptance Criteria from PRD
        |
Step 2: Create AC -> Test mapping table
        |
Step 3: Calculate Coverage = Tested ACs / Total ACs
        |
Step 4: Identify gaps HONESTLY
        |
Step 5: Generate tests for gaps (if needed)
```

---

## Coverage Calculation Formula

```
Coverage % = (ACs with corresponding tests / Total PRD Acceptance Criteria) x 100

NOT: Tests passing / Tests written
NOT: Endpoints tested / Endpoints defined
```

---

## Honest Assessment Results

| PRD | Claimed | Actual | Gap |
|-----|---------|--------|-----|
| PRD-006 | 100% | 43% | -57% |
| PRD-007 | 100% | 57% | -43% | *(已合并到 PRD-006)*

---

## Key Learnings

1. **Read PRD first, always** - Extract ACs before evaluating any tests
2. **Map AC -> Test explicitly** - Create table showing coverage
3. **Report gaps honestly** - "Not tested" is better than "100% coverage" lie
4. **Check endpoint specifications** - Test paths must match PRD definitions
5. **Passing tests != Complete coverage** - A test can pass but cover wrong thing

---

## Prevention Pattern

When asked about test coverage, AI MUST:

```bash
# 1. Read PRD and extract ALL Acceptance Criteria
grep -A 5 "Acceptance Criteria" docs/prd/PRD-XXX.md

# 2. Read test collection
cat postman/auto-generated/prd-xxx.postman_collection.json

# 3. Create explicit mapping: AC_ID -> Test_ID or "NO TEST"

# 4. Calculate: Tested_ACs / Total_ACs x 100 = Real Coverage %
```

---

## Outcome

This failure led to:
- Updated `docs/test-coverage/_index.yaml` with honest coverage numbers
- PRD-006: 43% (was claimed 100%) - 现已含 PRD-007
- PRD-007: 已合并到 PRD-006
- Overall project coverage: ~85% (was claimed 98%)

---

## Related

- [AI Test Generation Guide](../reference/AI-TEST-GENERATION.md)
- [Test Coverage Registry](../test-coverage/_index.yaml)
