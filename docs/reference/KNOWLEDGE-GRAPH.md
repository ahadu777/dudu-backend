# Knowledge Graph Patterns

## When to Use

**After completing Reality Check**, use systematic analysis for:
- Cross-story integration points
- Complex dependency chains
- Performance/constraint discovery
- Multi-team coordination

**Important:** Never use without first verifying current reality.

---

## Relationship Discovery

```bash
# Check story relationships
grep -A 10 "card-name" docs/stories/_index.yaml

# Check card dependencies
grep -A 5 "relationships:" docs/cards/card-name.md

# Find integration points
grep "integration_points" docs/cards/card-name.md
```

---

## Constraint Discovery Patterns

**Key relationships to analyze:**

| Pattern | Description |
|---------|-------------|
| Entity flows | `Product.functions -> Ticket.entitlements -> RedemptionEvent.function_code` |
| Shared cards | Multiple stories using same card = integration point |
| Domain dependencies | Commerce <-> Fulfillment <-> Operations coordination |
| Type constraints | TypeScript interfaces encode business rules |

---

## Proven Success Examples

### Complex Pricing (US-011)
- **Query:** "Why 3 products not tiers?"
- **Discovery:** `Product.functions -> Ticket.entitlements` constraint
- **Solution:** Distinct function sets require distinct products

### Venue Operations (US-013)
- **Query:** "How does fraud detection work?"
- **Discovery:** JTI tracking across all venues required
- **Solution:** Database indexing for sub-second lookups

### OTA Integration (US-012)
- **Query:** "What are the integration dependencies?"
- **Discovery:** Channel inventory separation required
- **Solution:** Dual allocation system with reservation management

---

## Architectural Patterns

### Dual-Mode Service Pattern
```typescript
if (dataSourceConfig.useDatabase && await this.isDatabaseAvailable()) {
  // Database mode: production persistence
} else {
  // Mock mode: rapid development
}
```

### Knowledge Graph Relationship Query
```yaml
# From docs/stories/_index.yaml
US-011: [complex-pricing-engine, order-create]
US-001: [catalog-endpoint, order-create, ...]    # Shared dependency!
```

### Pattern Reuse Discovery
```bash
# Before implementing pagination, search for existing patterns
grep -r "page.*limit" src/modules/*/router.ts
grep -A 10 "page.*limit" src/modules/ota/router.ts
```

### Two-Step Query Strategy
```typescript
// For complex data relationships:
// Step 1: Get aggregated summary with pagination
const summary = await repo.getSummary(partnerId, { page, limit });

// Step 2: For each result, fetch detailed data
const withDetails = await Promise.all(
  summary.map(async (item) => {
    const details = await repo.getDetails(item.id);
    return { ...item, details };
  })
);
```

---

## What Actually Works (Validated)

1. **Mock-First Development**: 1-3ms response times
2. **Dual-Mode Architecture**: Automatic fallback, identical API contracts
3. **Knowledge Graph Queries**: Relationship discovery prevents duplicate work
4. **Card-Based Implementation**: Clear specs -> predictable outcomes
5. **Integration Proof**: Runbooks + Newman tests + TypeScript examples
6. **Database Schema Validation**: ENUM verification prevents silent failures
7. **Pattern Reuse & Discovery**: Search before creating
8. **Two-Step Query Strategy**: Aggregation + Detail queries
9. **User Choice Over Assumptions**: Provide options, let user decide
10. **AI Auto-Translation**: Chinese<->English for similarity detection

---

## Related

- [CLAUDE.md - Reality Check](../../CLAUDE.md#reality-check)
- [Case Studies](../cases/)
