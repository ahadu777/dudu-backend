# US-005 — Reporting — redemptions list

Administrative reporting: View redemption events and usage analytics

## Prerequisites
- **Base URL**: `http://localhost:8080`
- **Admin/operator access**: Required for reporting endpoints
- **Existing redemptions**: Run US-001 complete flow to generate test data
- **Server running**: `npm run build && PORT=8080 npm start`

## Step-by-Step Flow

### 1. Basic Redemptions Report
Get all redemption events within date range:
```bash
curl -s -X GET "http://localhost:8080/reports/redemptions?from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'
```

**Expected**: List of redemption events with timestamps and details

### 2. Filter by Location
Get redemptions for specific location:
```bash
curl -s -X GET "http://localhost:8080/reports/redemptions?location_id=52&from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'
```

**Expected**: Only redemptions from location 52

### 3. Filter by Function Code
Get redemptions for specific transport type:
```bash
curl -s -X GET "http://localhost:8080/reports/redemptions?function_code=ferry&from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'
```

**Expected**: Only ferry redemptions

### 4. Filter by Product
Get redemptions for specific product:
```bash
curl -s -X GET "http://localhost:8080/reports/redemptions?product_id=101&from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'
```

**Expected**: Only redemptions for product 101

### 5. Pagination
Handle large result sets:
```bash
# First page
curl -s -X GET "http://localhost:8080/reports/redemptions?from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00&limit=10&offset=0" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'

# Second page
curl -s -X GET "http://localhost:8080/reports/redemptions?from=2025-10-19T00:00:00%2B08:00&to=2025-10-20T23:59:59%2B08:00&limit=10&offset=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq '.'
```

## Complete Reporting Flow
```bash
export BASE=http://localhost:8080
export FROM="2025-10-19T00:00:00+08:00"
export TO="2025-10-20T23:59:59+08:00"

# Note: Replace with actual admin token or operator token
export ADMIN_TOKEN="admin_or_operator_token"

# Step 1: Generate test data (run redemptions first)
echo "=== Ensure test data exists ==="
echo "Run US-001 complete flow to generate redemption events"

# Step 2: Basic report
echo "=== All Redemptions Report ==="
ALL_REDEMPTIONS=$(curl -s -X GET "$BASE/reports/redemptions?from=${FROM}&to=${TO}" -H "Authorization: Bearer $ADMIN_TOKEN")
echo $ALL_REDEMPTIONS | jq '.redemptions[] | {timestamp, function_code, location_id, ticket_code, product_name}'

# Step 3: Summary statistics
echo "=== Redemption Summary ==="
echo "Total redemptions: $(echo $ALL_REDEMPTIONS | jq '.redemptions | length')"
echo "By function:"
echo $ALL_REDEMPTIONS | jq '.redemptions | group_by(.function_code) | map({function_code: .[0].function_code, count: length})'

# Step 4: Location-specific report
echo "=== Location 52 Report ==="
curl -s -X GET "$BASE/reports/redemptions?location_id=52&from=${FROM}&to=${TO}" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.redemptions | length'

# Step 5: Function-specific report
echo "=== Ferry Usage Report ==="
curl -s -X GET "$BASE/reports/redemptions?function_code=ferry&from=${FROM}&to=${TO}" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.redemptions[] | {timestamp, ticket_code, location_id}'

# Step 6: Product performance
echo "=== Product 101 Performance ==="
curl -s -X GET "$BASE/reports/redemptions?product_id=101&from=${FROM}&to=${TO}" -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.redemptions | group_by(.function_code) | map({function: .[0].function_code, usage: length})'
```

## Business Intelligence Queries

### Daily Usage Pattern
```bash
# Get hourly breakdown for today
TODAY=$(date +%Y-%m-%d)
curl -s -X GET "http://localhost:8080/reports/redemptions?from=${TODAY}T00:00:00%2B08:00&to=${TODAY}T23:59:59%2B08:00" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq '.redemptions | group_by(.timestamp[:13]) | map({hour: .[0].timestamp[:13], count: length})'
```

### Location Performance
```bash
# Compare all locations
curl -s -X GET "http://localhost:8080/reports/redemptions?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq '.redemptions | group_by(.location_id) | map({location_id: .[0].location_id, total_scans: length, unique_tickets: [.[].ticket_code] | unique | length})'
```

### Product Utilization
```bash
# Product utilization by function
curl -s -X GET "http://localhost:8080/reports/redemptions?from=${FROM}&to=${TO}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  jq '.redemptions | group_by(.product_id) | map({product_id: .[0].product_id, product_name: .[0].product_name, functions: group_by(.function_code) | map({function: .[0].function_code, count: length})})'
```

## Expected Response Format

### Redemptions Report Response
```json
{
  "redemptions": [
    {
      "redemption_id": "red_12345",
      "timestamp": "2025-10-20T10:30:15+08:00",
      "ticket_code": "TKT-ABC123",
      "product_id": 101,
      "product_name": "3-in-1 Transport Pass",
      "function_code": "ferry",
      "function_name": "Ferry Service",
      "location_id": 52,
      "location_name": "Marina Bay Terminal",
      "operator_id": "alice",
      "device_id": "gate-01",
      "user_id": "user123",
      "remaining_uses": 7
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "filters": {
    "from": "2025-10-19T00:00:00+08:00",
    "to": "2025-10-20T23:59:59+08:00",
    "location_id": null,
    "function_code": null,
    "product_id": null
  }
}
```

## Expected Results
- ✅ **Date filtering**: Accurate time range queries
- ✅ **Multi-dimensional filtering**: Location, function, product
- ✅ **Pagination**: Large datasets handled efficiently
- ✅ **Real-time data**: Recently redeemed tickets appear immediately
- ✅ **Analytics ready**: Data suitable for BI tools

## Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| from | ISO datetime | Start time (required) | 2025-10-19T00:00:00+08:00 |
| to | ISO datetime | End time (required) | 2025-10-20T23:59:59+08:00 |
| location_id | number | Filter by location | 52 |
| function_code | string | Filter by function | ferry |
| product_id | number | Filter by product | 101 |
| limit | number | Results per page | 50 |
| offset | number | Results offset | 0 |

## Error Scenarios
| Scenario | Expected Response |
|----------|-------------------|
| No authorization | `401 Unauthorized` |
| Invalid date format | `400 Bad Request` |
| Date range > 1 year | `400 Bad Request` |
| Invalid filter values | `400 Bad Request` |

## Integration Notes
- **Real-time**: Redemptions appear immediately after scanning
- **Time zones**: All timestamps in Asia/Singapore (+08:00)
- **Data retention**: Historical data available per retention policy
- **Export formats**: JSON (API), CSV/Excel (via additional endpoints)
- **Access control**: Admin/operator permissions required
- **Performance**: Indexes optimized for date range queries