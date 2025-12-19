---
card: "Venue Management CRUD API"
slug: venue-management-crud
team: "C - Gate"
oas_paths: ["/venue", "/venue/{venue_id}"]
migrations: []
status: "Done"
readiness: "production"
branch: "init-ai"
pr: ""
newman_report: ""
last_update: "2025-11-26T12:00:00+08:00"
related_stories: ["US-013"]
relationships:
  enhances: ["venue-enhanced-scanning", "venue-analytics-reporting"]
  depends_on: []
  triggers: []
  data_dependencies: ["Venue"]
  integration_points:
    data_stores: ["venue.repository.ts"]
---

## Summary

场馆管理CRUD API，提供场馆的创建、查询、更新、删除功能。

## Status & Telemetry
- Status: Done
- Readiness: production
- Spec Paths: /venue, /venue/{venue_id}

## API Endpoints

### 1. GET /venue - 获取场馆列表

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| include_inactive | boolean | 否 | 是否包含已停用场馆，默认false |

**Response 200:**
```json
{
  "venues": [
    {
      "venue_id": 1,
      "venue_code": "central-pier",
      "venue_name": "Central Pier Terminal",
      "venue_type": "ferry_terminal",
      "location_address": "Hong Kong Central Pier",
      "supported_functions": ["ferry_boarding", "gift_redemption"],
      "is_active": true,
      "created_at": "2025-11-25T11:24:11.594Z",
      "updated_at": "2025-11-25T11:24:11.594Z"
    }
  ]
}
```

### 2. POST /venue - 创建场馆

**Request Body:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| venue_code | string | 是 | 场馆唯一代码 |
| venue_name | string | 是 | 场馆名称 |
| venue_type | string | 是 | 场馆类型：ferry_terminal, gift_shop, playground |
| location_address | string | 否 | 场馆地址 |
| supported_functions | string[] | 否 | 支持的功能列表 |
| is_active | boolean | 否 | 是否启用，默认true |

**Request Example:**
```json
{
  "venue_code": "new-pier",
  "venue_name": "New Pier Terminal",
  "venue_type": "ferry_terminal",
  "location_address": "123 Harbor Road",
  "supported_functions": ["ferry_boarding", "gift_redemption"]
}
```

**Response 201:**
```json
{
  "venue_id": 3,
  "venue_code": "new-pier",
  "venue_name": "New Pier Terminal",
  "venue_type": "ferry_terminal",
  "location_address": "123 Harbor Road",
  "supported_functions": ["ferry_boarding", "gift_redemption"],
  "is_active": true,
  "created_at": "2025-11-26T03:53:28.780Z",
  "updated_at": "2025-11-26T03:53:28.780Z"
}
```

**Error 400 - Duplicate venue_code:**
```json
{
  "error": "DUPLICATE_VENUE_CODE",
  "message": "Venue code 'new-pier' already exists"
}
```

### 3. GET /venue/{venue_id} - 获取场馆详情

**Path Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| venue_id | integer | 是 | 场馆ID |

**Response 200:** 同创建响应格式

**Error 404:**
```json
{
  "error": "VENUE_NOT_FOUND",
  "message": "Venue with ID 999 not found"
}
```

### 4. PUT /venue/{venue_id} - 更新场馆

**Path Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| venue_id | integer | 是 | 场馆ID |

**Request Body:** 所有字段均为可选，只更新提供的字段
| 字段 | 类型 | 说明 |
|------|------|------|
| venue_code | string | 场馆唯一代码 |
| venue_name | string | 场馆名称 |
| venue_type | string | 场馆类型 |
| location_address | string | 场馆地址 |
| supported_functions | string[] | 支持的功能列表 |
| is_active | boolean | 是否启用 |

**Request Example (部分更新):**
```json
{
  "venue_name": "Updated Name"
}
```

**Response 200:** 返回完整的更新后对象

### 5. DELETE /venue/{venue_id} - 删除场馆

**Path Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| venue_id | integer | 是 | 场馆ID |

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| hard_delete | boolean | 否 | 是否物理删除，默认false（软删除） |

**Response 200 (软删除):**
```json
{
  "success": true,
  "message": "Venue deactivated successfully"
}
```

**Response 200 (物理删除):**
```json
{
  "success": true,
  "message": "Venue permanently deleted"
}
```

## Database Schema

**Table: venues**
| Column | Type | Constraints |
|--------|------|-------------|
| venue_id | INT | PRIMARY KEY, AUTO_INCREMENT |
| venue_code | VARCHAR(100) | UNIQUE, NOT NULL |
| venue_name | VARCHAR(200) | NOT NULL |
| venue_type | VARCHAR(50) | NOT NULL |
| location_address | VARCHAR(200) | NULLABLE |
| supported_functions | JSON | NULLABLE |
| is_active | BOOLEAN | DEFAULT true |
| created_at | DATETIME | AUTO |
| updated_at | DATETIME | AUTO |

## Implementation Files

- Router: `src/modules/venue/router.ts`
- Service: `src/modules/venue/service.ts`
- Repository: `src/modules/venue/domain/venue.repository.ts`
- Entity: `src/modules/venue/domain/venue.entity.ts`

## Test Commands

```bash
# List venues
curl http://localhost:8080/venue

# Create venue
curl -X POST http://localhost:8080/venue \
  -H "Content-Type: application/json" \
  -d '{"venue_code":"test","venue_name":"Test","venue_type":"playground"}'

# Get venue by ID
curl http://localhost:8080/venue/1

# Update venue
curl -X PUT http://localhost:8080/venue/1 \
  -H "Content-Type: application/json" \
  -d '{"venue_name":"Updated Name"}'

# Delete venue (soft)
curl -X DELETE http://localhost:8080/venue/1

# Delete venue (hard)
curl -X DELETE "http://localhost:8080/venue/1?hard_delete=true"
```
