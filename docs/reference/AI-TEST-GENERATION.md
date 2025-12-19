# AI Automated Test Generation Workflow

## Core Principle

```
PRD Acceptance Criteria → Test Suite → Coverage Tracking
```

---

## Step 1: Extract Test Scenarios from PRD

```bash
# Find Acceptance Criteria in PRD
grep -B 3 -A 8 "Acceptance Criteria" docs/prd/PRD-XXX-*.md
```

**Example output:**
```
**OTA API Gateway**
- **Acceptance Criteria**:
  - API key authentication prevents unauthorized access  → Test Case 1
  - Rate limiting (100-1000 req/min per partner)         → Test Case 2
  - Real-time inventory queries return availability      → Test Case 3
```

---

## Step 2: Generate Postman Collection

AI generates collection based on Acceptance Criteria:
- Output: `postman/auto-generated/prd-xxx-validation.postman_collection.json`

**Collection structure:**
```json
{
  "name": "PRD-XXX Validation",
  "item": [
    { "name": "Test Case 1: API Key Auth", "request": {...}, "event": [tests] },
    { "name": "Test Case 2: Rate Limiting", "request": {...}, "event": [tests] }
  ]
}
```

---

## Step 3: Update Coverage Registry

After generating tests, update: `docs/test-coverage/_index.yaml`

```yaml
coverage_registry:
  - prd_id: PRD-XXX
    status: "Complete (100%)"
    primary_collection: "postman/auto-generated/prd-xxx-validation.postman_collection.json"
    coverage_analysis:
      total_requirements: 10
      tested_requirements: 10
      coverage_by_requirements: "10/10 = 100%"
```

---

## Step 4: Run and Validate

```bash
# Run generated tests
npx newman run postman/auto-generated/prd-xxx-validation.postman_collection.json

# Save report
npx newman run postman/auto-generated/prd-xxx-validation.postman_collection.json \
  --reporters cli,json \
  --reporter-json-export reports/newman/prd-xxx-results.json
```

---

## Coverage Calculation

```
Coverage % = (Tested Requirements / Total PRD Acceptance Criteria) x 100
```

**Important distinctions:**
- Coverage = ACs with tests / Total ACs
- NOT: Tests passing / Tests written
- NOT: Endpoints tested / Endpoints defined

---

## Test Generation Triggers

| Trigger | Action |
|---------|--------|
| New PRD created | Generate full test suite from Acceptance Criteria |
| New Story (US-XXX) | Generate E2E workflow tests |
| New Card | Generate endpoint-level tests |
| API change | Update existing tests + add regression tests |

---

## Directory Structure

```
postman/
├── COMPLETE-PLATFORM-TESTS.postman_collection.json  # Unified suite
├── QUICK-SMOKE-TESTS.postman_collection.json        # Fast validation
├── auto-generated/                                   # AI-generated tests
│   ├── prd-xxx-validation.postman_collection.json
│   └── us-xxx-complete-coverage.postman_collection.json
└── reports/                                          # Test reports

docs/test-coverage/
└── _index.yaml                                       # Coverage registry
```

---

## AI Self-Check Before Marking Coverage Complete

1. Does every Acceptance Criteria have a test?
2. Are assertions checking the right conditions?
3. Is the coverage registry updated?
4. Did Newman run pass?

---

## Correct Workflow (from CASE-006)

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

## Key Learnings

1. **Read PRD first, always** - Extract ACs before evaluating any tests
2. **Map AC -> Test explicitly** - Create table showing coverage
3. **Report gaps honestly** - "Not tested" is better than false 100%
4. **Check endpoint specifications** - Test paths must match PRD definitions
5. **Passing tests != Complete coverage** - A test can pass but cover wrong thing

---

## Related

- [CASE-006: Test Coverage Workflow](../cases/CASE-006-TEST-COVERAGE.md)
- [Test Coverage Registry](../test-coverage/_index.yaml)
