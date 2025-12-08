---
card: "OTA Reseller Master Data Management"
slug: ota-reseller-management
team: "A - Commerce"
oas_paths: ["/api/ota/resellers", "/api/ota/resellers/:id"]
migrations: ["src/migrations/011-create-ota-resellers-table.ts"]
status: "Done"
readiness: "complete"
branch: "init-ai"
pr: ""
newman_report: ""
integration_runbook: ""
last_update: "2025-11-14T15:20:00+08:00"
related_stories: ["US-012"]
relationships:
  depends_on: ["ota-channel-management"]
  triggers: ["ota-premade-tickets"]
  data_dependencies: ["OTAResellerEntity", "OTATicketBatchEntity"]
  integration_points:
    data_stores: ["ota.repository.ts"]
    external_apis: []
    downstream_services: ["ota-billing-summary"]
---

# OTA Reseller Management — Dev Notes

## Status & Telemetry
- Status: Done
- Readiness: complete
- Spec Paths: /api/ota/resellers, /api/ota/resellers/:id
- Migrations: src/migrations/011-create-ota-resellers-table.ts
- Newman: TBD
- Last Update: 2025-11-14T15:20:00+08:00

## 0) Prerequisites
- ota-channel-management card implemented (OTA partner authentication)
- Database supports foreign key constraints (InnoDB)
- TypeORM configured with entity scanning

## 1) Business Context

### Problem Statement
Currently, reseller information is stored as JSON metadata in `ota_ticket_batches.reseller_metadata`, leading to:
- **Data redundancy**: Same reseller name repeated across multiple batches
- **No centralized management**: Cannot list all resellers or configure commission rates
- **Billing complexity**: `GET /api/ota/billing/summary?reseller=all` cannot be implemented
- **Scalability issues**: As reseller count grows, JSON-based management becomes unmaintainable

### Solution
Create `ota_resellers` table as single source of truth for reseller master data:
- Normalized data structure with auto-increment primary key
- Foreign key relationship from `ota_ticket_batches.reseller_id` to `ota_resellers.id`
- Centralized commission rates, contract terms, and settlement configuration
- Enables systematic reseller management and automated billing

### Success Metrics
- Zero data redundancy (reseller names stored once)
- Billing summary API supports 'all' resellers aggregation
- Sub-second query performance for reseller listing
- Audit trail for reseller modifications

## 2) Data Model

### Database Schema

```sql
CREATE TABLE ota_resellers (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- OTA Partner Association
  partner_id VARCHAR(50) NOT NULL COMMENT 'OTA platform ID (e.g., ctrip, klook)',

  -- Reseller Identification
  reseller_code VARCHAR(50) NOT NULL COMMENT 'Unique code within partner (e.g., GD-TRAVEL-001)',
  reseller_name VARCHAR(200) NOT NULL COMMENT 'Display name (e.g., "广州国旅")',
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),

  -- Business Configuration
  commission_rate DECIMAL(5,4) DEFAULT 0.10 COMMENT '佣金比例 (e.g., 0.10 = 10%)',
  contract_start_date DATE,
  contract_end_date DATE,
  status ENUM('active', 'suspended', 'terminated') DEFAULT 'active',

  -- Settlement Configuration
  settlement_cycle ENUM('weekly', 'monthly', 'quarterly') DEFAULT 'monthly',
  payment_terms VARCHAR(100) COMMENT 'e.g., Net 30, Net 60',

  -- Categorization
  region VARCHAR(100) COMMENT 'e.g., "华南地区", "华北地区"',
  tier ENUM('platinum', 'gold', 'silver', 'bronze') DEFAULT 'bronze',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  UNIQUE KEY unique_partner_code (partner_id, reseller_code),
  INDEX idx_partner_id (partner_id),
  INDEX idx_status (status),
  INDEX idx_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OTA经销商主数据表';
```

### Modified Table: ota_ticket_batches

```sql
ALTER TABLE ota_ticket_batches
  ADD COLUMN reseller_id INT NULL COMMENT '经销商ID',
  ADD CONSTRAINT fk_batch_reseller
    FOREIGN KEY (reseller_id) REFERENCES ota_resellers(id);

CREATE INDEX idx_reseller_id ON ota_ticket_batches(reseller_id);
```

### Entity Relationships

```
OTA Partner (partner_id from middleware)
  └── ota_resellers (1:N)
        └── ota_ticket_batches (1:N)
              └── tickets (1:N, channel='ota')
```

## 3) Technical Specifications

### TypeScript Types

```typescript
export type ResellerStatus = 'active' | 'suspended' | 'terminated';
export type SettlementCycle = 'weekly' | 'monthly' | 'quarterly';
export type ResellerTier = 'platinum' | 'gold' | 'silver' | 'bronze';

// Entity placed in src/models/ota-reseller.entity.ts
export class OTAResellerEntity {
  id: number;
  partner_id: string;
  reseller_code: string;
  reseller_name: string;
  contact_email?: string;
  contact_phone?: string;
  commission_rate: number;
  contract_start_date?: Date;
  contract_end_date?: Date;
  status: ResellerStatus;
  settlement_cycle: SettlementCycle;
  payment_terms?: string;
  region?: string;
  tier: ResellerTier;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Simplified RessellerMetadata (no longer stores reseller_name)
interface ResellerMetadata {
  batch_purpose: string;           // "春季促销批次"
  distribution_notes?: string;     // "优先发放给VIP客户"
  special_instructions?: string;   // 批次特定说明
}
```

### API Endpoints (Implemented ✅)

**Implementation Status**: All CRUD endpoints completed and tested in mock mode.

#### GET /api/ota/resellers
- **Description**: List all resellers for authenticated OTA partner
- **Authentication**: X-API-Key header (OTA partner)
- **Response**: Array of reseller objects with basic info
- **Mock Mode**: ✅ Returns 2 mock resellers
- **Database Mode**: Requires migration 011

#### GET /api/ota/resellers/:id
- **Description**: Get detailed information for a specific reseller
- **Authentication**: X-API-Key header (OTA partner)
- **Partner Isolation**: Only returns reseller if owned by authenticated partner
- **Response**: Single reseller object with full details
- **Mock Mode**: ✅ Working
- **Database Mode**: Requires migration 011

#### POST /api/ota/resellers
- **Description**: Create new reseller for authenticated OTA partner
- **Authentication**: X-API-Key header (OTA partner)
- **Required Fields**: reseller_code, reseller_name
- **Optional Fields**: commission_rate, region, tier, contact_email, etc.
- **Response**: Created reseller object
- **Mock Mode**: ✅ Working
- **Database Mode**: Requires migration 011

#### PUT /api/ota/resellers/:id
- **Description**: Update existing reseller information
- **Authentication**: X-API-Key header (OTA partner)
- **Partner Isolation**: Only allows update if reseller owned by authenticated partner
- **Response**: Updated reseller object
- **Mock Mode**: ✅ Working
- **Database Mode**: Requires migration 011

#### DELETE /api/ota/resellers/:id
- **Description**: Deactivate reseller (soft delete - sets status to 'terminated')
- **Authentication**: X-API-Key header (OTA partner)
- **Partner Isolation**: Only allows deactivation if reseller owned by authenticated partner
- **Response**: Confirmation message
- **Mock Mode**: ✅ Working
- **Database Mode**: Requires migration 011

## 4) Implementation Tasks

### Phase 1: Database Schema (This Card)
- [x] Create migration file `011-create-ota-resellers-table.ts`
- [x] Add `ota_resellers` table creation SQL
- [x] Add `ota_ticket_batches.reseller_id` foreign key column
- [x] Create data migration script to extract existing resellers from JSON
- [x] Create indexes for performance optimization

### Phase 2: Entity & Repository
- [x] Create `src/models/ota-reseller.entity.ts`
- [x] Update `src/modules/ota/domain/ota-ticket-batch.entity.ts` with reseller_id field
- [x] Add reseller queries to `ota.repository.ts`:
  - `findResellersByPartner(partnerId: string): Promise<OTAResellerEntity[]>`
  - `findResellerById(id: number, partnerId: string): Promise<OTAResellerEntity | null>`
  - `createReseller(data: CreateResellerDTO): Promise<OTAResellerEntity>`
  - `updateReseller(reseller: OTAResellerEntity): Promise<OTAResellerEntity>`

### Phase 3: Billing Integration
- [x] Update `getResellerBillingSummary()` to support dynamic partner ID
- [x] Fixed hardcoded 'ctrip' to use authenticated partner from middleware
- [x] Update billing queries to JOIN with ota_resellers table

### Phase 4: CRUD API Implementation (Completed ✅)
- [x] Implement `listResellers(partnerId)` service method
- [x] Implement `getResellerById(id, partnerId)` service method
- [x] Implement `createReseller(partnerId, data)` service method
- [x] Implement `updateReseller(id, partnerId, data)` service method
- [x] Implement `deactivateReseller(id, partnerId)` service method (soft delete)
- [x] Add GET /api/ota/resellers router endpoint
- [x] Add GET /api/ota/resellers/:id router endpoint
- [x] Add POST /api/ota/resellers router endpoint
- [x] Add PUT /api/ota/resellers/:id router endpoint
- [x] Add DELETE /api/ota/resellers/:id router endpoint
- [x] Test all endpoints in mock mode
- [x] Implement partner isolation for all endpoints

## 5) Data Migration Strategy

### Extract Existing Resellers from JSON

```sql
-- Step 1: Insert unique resellers from existing batches
INSERT INTO ota_resellers (partner_id, reseller_code, reseller_name, status)
SELECT DISTINCT
  b.partner_id,
  CONCAT(
    b.partner_id, '-',
    SUBSTRING(MD5(JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller'))), 1, 8)
  ) as reseller_code,
  JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller')) as reseller_name,
  'active' as status
FROM ota_ticket_batches b
WHERE b.reseller_metadata IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller')) IS NOT NULL;

-- Step 2: Update batch table with reseller_id foreign key
UPDATE ota_ticket_batches b
INNER JOIN ota_resellers r
  ON r.partner_id = b.partner_id
  AND r.reseller_name = JSON_UNQUOTE(JSON_EXTRACT(b.reseller_metadata, '$.intended_reseller'))
SET b.reseller_id = r.id
WHERE b.reseller_metadata IS NOT NULL;

-- Step 3: Verify migration (count should match)
SELECT
  'Unique resellers in JSON' as source,
  COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(reseller_metadata, '$.intended_reseller'))) as count
FROM ota_ticket_batches
WHERE reseller_metadata IS NOT NULL
UNION ALL
SELECT
  'Resellers in table' as source,
  COUNT(*) as count
FROM ota_resellers;
```

## 6) Testing Checklist

### Database Tests
- [ ] Migration runs successfully without errors
- [ ] Foreign key constraint enforces referential integrity
- [ ] Unique constraint prevents duplicate (partner_id + reseller_code)
- [ ] Data migration extracts all unique resellers correctly
- [ ] Batch records correctly linked to reseller_id

### API Tests (Mock Mode ✅)
- [x] List resellers filtered by partner_id (isolation) - Tested with ota_full_access_key_99999
- [x] Create reseller returns new reseller object - Tested with TEST-001 code
- [x] Get single reseller returns full details - Tested with id=1
- [x] Update reseller modifies fields correctly - Tested with commission_rate and tier updates
- [x] Delete reseller performs soft delete (status='terminated') - Tested with id=1
- [ ] Create reseller with duplicate code returns error (requires database mode)
- [ ] Update reseller commission rate reflected in billing
- [ ] Billing summary with reseller='all' aggregates correctly

### Performance Tests
- [ ] Index on (partner_id, reseller_code) enables fast lookups
- [ ] JOIN between batches and resellers completes < 100ms
- [ ] Reseller listing query < 50ms for 1000+ resellers

## 7) Rollback Plan

```sql
-- Remove foreign key and column if migration fails
ALTER TABLE ota_ticket_batches
  DROP FOREIGN KEY fk_batch_reseller;

ALTER TABLE ota_ticket_batches
  DROP COLUMN reseller_id;

-- Drop resellers table
DROP TABLE IF EXISTS ota_resellers;
```

## 8) Future Enhancements

- [ ] Reseller portal API for self-service management
- [ ] Multi-level commission tiers based on volume
- [ ] Automated contract expiry notifications
- [ ] Reseller performance analytics dashboard
- [ ] Batch-level commission override capability

## 9) Related Documentation

- PRD-002: OTA Platform Integration (Reseller Master Data Management section)
- US-012: OTA Platform Integration (Reseller Master Data Management criteria)
- Migration Guide: `src/migrations/011-create-ota-resellers-table.ts`
- Entity Definition: `src/models/ota-reseller.entity.ts`

## 10) Notes

- **reseller_metadata JSON field retained**: Still used for batch-specific metadata (batch_purpose, distribution_notes), but no longer stores reseller_name
- **Backward compatibility**: Existing batches without reseller_id can still function (nullable foreign key)
- **Partner isolation**: All queries MUST filter by partner_id from authenticated OTA partner
- **Commission rate**: Stored at reseller level (can be overridden at batch level in future)
