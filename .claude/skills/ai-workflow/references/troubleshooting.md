# Troubleshooting Guide

## Quick Fixes

| Problem | Solution |
|---------|----------|
| Server not starting | `pkill -f "node dist/index.js"` then `npm run build && npm start` |
| Not seeing changes | Run `npm run build` first |
| Tests failing | Check mock data setup and existing patterns |
| Card status confusion | Always update status when starting/finishing work |

## Database Connection Issues

### "Access denied" Error

```bash
# Check .env file exists and has correct credentials

# Export environment variables explicitly:
export USE_DATABASE=true
export DB_HOST=your-host
export DB_USERNAME=your-username
export DB_PASSWORD='your-password'
export DB_DATABASE=your-database
npm start

# Verify connection:
curl -X POST http://localhost:8080/orders -H "Content-Type: application/json" \
-d '{"items":[{"product_id":101,"qty":1}],"channel_id":1,"out_trade_no":"test"}'
```

## SQL Field Errors

### ER_BAD_FIELD_ERROR

```bash
# 1. Check Entity Definition (what code thinks exists)
cat src/modules/[module]/domain/*.entity.ts | grep "@Column"

# 2. Check Actual Database Schema (ground truth)
SHOW COLUMNS FROM [table_name];

# 3. Find All SQL Queries Using This Field
grep -n "field.*=" src/modules/[module]/domain/*.repository.ts
```

### ENUM Value Mismatch

```sql
-- Wrong: Code uses value not in database ENUM
SUM(CASE WHEN t.status = 'REDEEMED' THEN 1 ELSE 0 END)

-- Correct: Use actual ENUM value
SUM(CASE WHEN t.status = 'USED' THEN 1 ELSE 0 END)
```

**Prevention:** Always verify with `SHOW COLUMNS FROM table LIKE 'field'`

## API Parameter Issues

```bash
# Always check router for correct parameter names
grep -A 5 "req.query" src/modules/[module]/router.ts
```

## Database Schema Validation Pattern

```bash
# Step 1: What code thinks exists
cat src/modules/[module]/domain/*.entity.ts | grep "@Column"

# Step 2: What actually exists (ground truth)
SHOW COLUMNS FROM [table_name];

# Step 3: Find mismatches
grep -n "status.*=" src/modules/[module]/domain/*.repository.ts
```

## Process Recovery Pattern

When things go wrong:

1. **Acknowledge** - What went wrong?
2. **Complete missing steps** - Fill gaps in process
3. **Update documentation** - Fix status, reports
4. **Verify completion** - Check all criteria met
5. **Continue** - Process back on track

## When to Ask for Help

- Unclear business requirements
- Complex domain constraints discovered
- Integration points not working
- Performance issues in database mode
