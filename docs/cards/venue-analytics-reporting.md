---
card: "Real-time venue analytics and reporting"
slug: venue-analytics-reporting
team: "C - Gate"
oas_paths: ["/venue/{venue_code}/analytics"]
migrations: []
status: "Done"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: "reports/newman/venue-analytics-reporting-result.json"
last_update: "2025-12-11T17:00:00+08:00"
related_stories: ["US-013"]
relationships:
  enhances: ["venue-enhanced-scanning"]
  depends_on: ["venue-enhanced-scanning"]
  triggers: []
  data_dependencies: ["RedemptionEvent", "Venue"]
  integration_points:
    data_stores: ["venue.service.ts", "venue.repository.ts"]
notes: "Hybrid architecture implemented: Venue-based primary grouping with optional terminal-level breakdown for cross-terminal fraud detection."
---

## Architecture Decision (2025-12-11)

**Decision: Hybrid Analytics Architecture**

After review, the following architecture was adopted:
- **Primary grouping**: `venue_code` (preserved - simpler, aligns with business operations)
- **Optional drill-down**: `terminal_device_id` breakdown (for cross-terminal fraud detection)
- **Venue entity**: **Preserved** - Required for partner_id association and multi-tenant isolation

**Resolved Questions:**
- Q: "Should analytics group by venue_code or terminal_device_id?" → **Both** (hybrid approach)
- Q: "Is Venue entity necessary?" → **Yes** (partner_id, supported_functions require entity)

---

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /venue/{venue_code}/analytics
- Migrations: None (uses existing redemption_events)

## Business Logic

**Real-time analytics and reporting for venue operations with performance monitoring.**

### Key Features
- **Real-time metrics**: Live venue performance data
- **Cross-venue comparison**: Multi-location analytics
- **Fraud attempt tracking**: Security incident monitoring
- **Function breakdown**: Per-function usage statistics
- **Performance monitoring**: Response time and success rate tracking

### Core Operations

#### Get Venue Analytics
```http
GET /venue/{venue_code}/analytics?hours=24&include_terminals=true
```

**Query Parameters:**
- `hours`: Time window for analytics (default: 24, max: 168 for 7 days)
- `include_terminals`: Include per-terminal breakdown for cross-terminal fraud detection (default: false)

**Response:**
```json
{
  "venue_id": 1,
  "period": {
    "start": "2025-12-10T17:00:00.000Z",
    "end": "2025-12-11T17:00:00.000Z"
  },
  "metrics": {
    "total_scans": 92,
    "successful_scans": 78,
    "fraud_attempts": 2,
    "success_rate": 84.78,
    "fraud_rate": 2.17,
    "function_breakdown": {
      "ferry": 28,
      "gift": 19,
      "tokens": 21,
      "park_admission": 10,
      "pet_area": 8,
      "vip": 5,
      "exclusive": 3
    },
    "package_breakdown": {
      "premium_plan": 68,
      "pet_package": 18,
      "deluxe": 94
    },
    "terminal_breakdown": [
      {
        "terminal_id": "terminal-A1",
        "total_scans": 45,
        "successful_scans": 40,
        "fraud_attempts": 1,
        "success_rate": 88.89,
        "fraud_rate": 2.22
      },
      {
        "terminal_id": "terminal-B2",
        "total_scans": 47,
        "successful_scans": 38,
        "fraud_attempts": 1,
        "success_rate": 80.85,
        "fraud_rate": 2.13
      }
    ]
  }
}
```

**Package Definitions (PRD-003):**
- `premium_plan`: ferry + gift + tokens
- `pet_package`: park_admission + pet_area
- `deluxe`: All functions combined

### Analytics Categories

#### 1. Volume Metrics
- **Total scans**: All scan attempts in time period
- **Successful scans**: Completed redemptions
- **Failed scans**: Rejected attempts (business rules)
- **Fraud attempts**: Detected duplicate JTI attempts

#### 2. Success Rate Analysis
- **Overall success rate**: successful_scans / total_scans
- **Function-specific success rates**: Per function type
- **Hourly trending**: Success rate trends over time
- **Venue comparison**: Cross-venue performance

#### 3. Function Breakdown
All supported function codes (aligned with product entitlements):
- **ferry**: Ferry boarding (unlimited use)
- **gift**: Gift redemption (single use)
- **tokens**: Playground tokens (counted use)
- **park_admission**: Park entry (single use)
- **pet_area**: Pet zone access (single use)
- **vip**: VIP lounge access (single use)
- **exclusive**: Exclusive experience (single use)

#### 4. Performance Monitoring
- **Response times**: Average, max, percentiles
- **Fraud detection latency**: JTI lookup performance
- **Database query performance**: Venue-specific optimization
- **Concurrent load handling**: Multi-terminal capacity

#### 5. Security Metrics
- **Fraud attempt patterns**: Time-based analysis
- **Cross-terminal attempts**: Multi-venue fraud detection
- **Token expiration rates**: QR token lifecycle analysis
- **Suspicious activity alerts**: Anomaly detection

### Venue-Specific Analytics

**Central Pier (Ferry Terminal):**
- Primary function: Ferry boarding (unlimited)
- Peak hours: 7-9 AM, 5-7 PM
- Key metric: Passenger throughput rate

**Cheung Chau (Multi-Function):**
- All functions: Ferry + gifts + playground
- Complex usage patterns
- Key metrics: Function distribution, cross-selling rates

**Gift Shops:**
- Primary function: Gift redemption (single use)
- Peak hours: Weekend afternoons
- Key metric: Redemption conversion rate

**Playgrounds:**
- Primary function: Playground tokens (counted)
- Peak hours: Weekends, holidays
- Key metric: Token consumption rate

### Database Queries

**Analytics Query Optimization:**
```sql
SELECT
  COUNT(*) as total_scans,
  SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) as successful_scans,
  SUM(CASE WHEN reason IN ('ALREADY_REDEEMED', 'DUPLICATE_JTI') THEN 1 ELSE 0 END) as fraud_attempts,
  function_code,
  AVG(response_time_ms) as avg_response_time
FROM redemption_events
WHERE venue_id = ?
  AND redeemed_at >= ?
  AND redeemed_at <= ?
GROUP BY function_code
ORDER BY total_scans DESC;
```

**Indexes Used:**
- `idx_redemption_venue_time` for fast venue+time filtering
- `idx_redemption_jti` for fraud detection analysis

### Error Handling

- `400` - Invalid time window (hours > 168)
- `404` - Venue code not found
- `422` - Invalid analytics parameters

### Performance Requirements

- Analytics response: < 500ms for 24-hour window
- Real-time updates: Data available within 1 minute
- Historical data: Support 30+ days of retention
- Concurrent analytics: Support 100+ simultaneous queries

### Mock Mode Analytics

**Development Features:**
- Simulated realistic data patterns
- Configurable fraud attempt rates
- Performance testing with mock metrics
- Cross-venue comparison capabilities

**Mock Response Example:**
```json
{
  "venue_id": 2,
  "period": {
    "start": "2025-12-11T16:00:00.000Z",
    "end": "2025-12-11T17:00:00.000Z"
  },
  "metrics": {
    "total_scans": 21,
    "successful_scans": 18,
    "fraud_attempts": 1,
    "success_rate": 85.71,
    "fraud_rate": 4.76,
    "function_breakdown": {
      "ferry": 3,
      "gift": 8,
      "tokens": 4,
      "park_admission": 2,
      "pet_area": 1,
      "vip": 0,
      "exclusive": 0
    },
    "package_breakdown": {
      "premium_plan": 15,
      "pet_package": 3,
      "deluxe": 18
    }
  }
}
```

### Integration Points

**Dashboards:**
- Venue manager operational dashboards
- Security team fraud monitoring
- Executive summary reports

**Alerting:**
- High fraud attempt rates
- Performance degradation alerts
- Unusual usage pattern detection

**Reporting:**
- Daily/weekly venue performance reports
- Monthly security incident summaries
- Quarterly business analytics