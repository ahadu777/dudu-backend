# Troubleshooting Guide

## Common Issues & Quick Fixes

| Problem | Solution |
|---------|----------|
| Server not starting | `pkill -f "node dist/index.js"` then `npm run build && npm start` |
| Not seeing changes | Run `npm run build` first |
| Tests failing | Check mock data setup and existing patterns |
| Card status confusion | Always update status when starting/finishing work |

---

## Database Connection Issues

### "Access denied" Error

**Symptoms:**
- Error: "Access denied for user 'xxx'@'xxx'"
- Server falls back to mock mode silently
- `USE_DATABASE=true npm start` fails

**Solution:**

1. Check `.env` file exists and has correct credentials

2. Export environment variables explicitly:
```bash
export USE_DATABASE=true
export DB_HOST=your-host
export DB_USERNAME=your-username
export DB_PASSWORD='your-password'
export DB_DATABASE=your-database
npm start
```

3. Verify connection with test endpoint:
```bash
curl -X POST http://localhost:8080/orders -H "Content-Type: application/json" \
-d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"test"}'
```

---

## SQL Field Errors

### ER_BAD_FIELD_ERROR

**When encountering SQL field errors:**

```bash
# 1. Check Entity Definition (what code thinks exists)
cat src/modules/[module]/domain/*.entity.ts | grep "@Column"
grep -A 3 "class.*Entity" src/modules/[module]/domain/*.entity.ts

# 2. Check Actual Database Schema (ground truth)
# For ENUM types - CRITICAL for status fields
SHOW COLUMNS FROM [table_name] LIKE 'status';
# Example result: enum('PRE_GENERATED','ACTIVE','USED','EXPIRED','CANCELLED')

# 3. Find All SQL Queries Using This Field
grep -n "status.*=" src/modules/[module]/domain/*.repository.ts
```

### ENUM Value Mismatch

**Common issue:**
```sql
-- Wrong: Code uses value not in database ENUM
SUM(CASE WHEN t.status = 'REDEEMED' THEN 1 ELSE 0 END)

-- Correct: Use actual ENUM value
SUM(CASE WHEN t.status = 'USED' THEN 1 ELSE 0 END)
```

**Prevention:** Always verify with `SHOW COLUMNS FROM table LIKE 'field'`

---

## API Parameter Issues

### Wrong Parameter Name

```bash
# Always check router for correct parameter names
grep -A 5 "req.query" src/modules/[module]/router.ts

# Test with correct parameter name
# Wrong: ?reseller_name=XXX
# Correct: ?reseller=XXX (as defined in router)
```

---

## Common SQL Field Issues Checklist

- [ ] Missing field: Check entity vs actual table columns
- [ ] Wrong ENUM value: Verify with `SHOW COLUMNS`
- [ ] Wrong column name: Check entity property names
- [ ] Case sensitivity: Use `LOWER()` for comparisons

---

## Process Recovery Pattern

When things go wrong:

1. **Acknowledge** - What went wrong?
2. **Complete missing steps** - Fill gaps in process
3. **Update documentation** - Fix status, reports
4. **Verify completion** - Check all criteria met
5. **Continue** - Process back on track

---

## When to Ask for Help

- Unclear business requirements
- Complex domain constraints discovered
- Integration points not working
- Performance issues in database mode

---

## Database Schema Validation Pattern

**Proven from CASE-003: OTA Analytics SQL Fix**

```bash
# Step 1: What code thinks exists
cat src/modules/[module]/domain/*.entity.ts | grep "@Column"

# Step 2: What actually exists (ground truth)
SHOW COLUMNS FROM [table_name];

# Step 3: Find mismatches
grep -n "status.*=" src/modules/[module]/domain/*.repository.ts
```

---

## Related

- [CASE-003: OTA Analytics SQL Fix](../cases/CASE-003.md)
- [Reality Check in CLAUDE.md](../CLAUDE.md#reality-check)
