# Testing Workflow

## Test Pyramid

```
PRD Tests (业务规则) → Newman + PRD Acceptance Criteria
    ↓
Story Tests (E2E流程) → Runbook + Newman Collection
    ↓
Card Tests (端点级) → curl + Newman
```

> **Runbook 规范**: 详见 `references/runbook.md`

## Test Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Main test suite (Smoke + PRD + Story) |
| `npm run test:prd` | All PRD tests |
| `npm run test:prd [N]` | Specific PRD (e.g., `npm run test:prd 008`) |
| `npm run test:story` | All Story tests |
| `npm run test:story [N]` | Specific Story (e.g., `npm run test:story 015`) |

## Test Execution Workflow

### Before Running Tests

```bash
# 1. Verify service is running
curl http://localhost:8080/healthz

# 2. Check test collection exists
ls postman/auto-generated/prd-*.json
ls postman/auto-generated/us-*.json
```

### Test Failed

```bash
# 1. Identify which assertions failed
npm run test:prd [N] 2>&1 | grep -A 5 "AssertionError"

# 2. Check if API response matches Card spec
curl http://localhost:8080/[endpoint] | jq .

# 3. Compare with Card contract
grep -A 20 "Response" docs/cards/[related-card].md

# 4. Determine root cause:
#    - Code bug → Fix code
#    - Spec mismatch → Update Card or Code
#    - Test outdated → Update test
```

### Test Passed

**Do NOT assume work is Done.** Verify:

| Check | Action |
|-------|--------|
| API matches Card spec? | Compare response with Card |
| OpenAPI updated? | If API changed, update `openapi/openapi.json` |
| Coverage updated? | Update `docs/test-coverage/_index.yaml` |
| Business verified? | Simple bug → can mark Done; Business logic → needs verification |

### Coverage Gap

```bash
# Check coverage registry
cat docs/test-coverage/_index.yaml

# Identify missing coverage
grep -L "test:" docs/cards/*.md
```

## API Contract Verification

After tests pass, verify contract consistency:

```bash
# 1. Card spec
grep -A 30 "endpoint" docs/cards/[card].md

# 2. Actual response
curl http://localhost:8080/[endpoint] | jq .

# 3. OpenAPI spec
grep -A 20 "[endpoint]" openapi/openapi.json
```

**All three must match.** If mismatch:
- Code wrong → Fix code
- Card outdated → Update Card
- OpenAPI outdated → Update OpenAPI

## When to Update OpenAPI

| Scenario | Update OpenAPI? |
|----------|-----------------|
| Test passed, no API change | ❌ No |
| Test passed, added field | ✅ Yes |
| Test passed, changed response | ✅ Yes |
| Test passed, new endpoint | ✅ Yes |
| Test passed, internal fix only | ❌ No |

## Test File Naming

```
postman/auto-generated/
├── prd-{NNN}-{description}.postman_collection.json
├── us-{NNN}-{description}.postman_collection.json
└── _archived/    # Obsolete tests
```

## Definition of Done (Testing)

- [ ] Newman collection created/updated
- [ ] `npm run test:prd [N]` or `npm run test:story [N]` passes
- [ ] `npm test` passes (no regression)
- [ ] Coverage updated in `docs/test-coverage/_index.yaml`
- [ ] API contract verified (Card = Code = OpenAPI)
- [ ] Runbook created/updated for Story (see `references/runbook.md`)
- [ ] Runbook TC status updated (pending → passed/failed)
