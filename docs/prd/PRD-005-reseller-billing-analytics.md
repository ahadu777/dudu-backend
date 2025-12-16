# PRD-005: B2B Reseller Billing & Analytics Platform

## Document Metadata
```yaml
prd_id: "PRD-005"
product_area: "Finance & Analytics"
owner: "Finance Team"
status: "Done"
created_date: "2025-11-15"
last_updated: "2025-12-11"
related_stories: []
implementation_cards: []  # ota-reseller-management deprecated, moved to _deprecated/
depends_on: "PRD-002"
deadline: "2026-02-28"
phase_status:
  phase_1_reseller_master_data: "Done"      # 分销商主数据管理 - 已完成
  phase_2_usage_billing_engine: "Deferred"  # 自动账单生成 - 暂缓
  phase_3_audit_compliance: "Deferred"      # 审计合规系统 - 暂缓
```

## Implementation Status (2025-12-11)

| Phase | 功能 | 状态 | 说明 |
|-------|------|------|------|
| **Phase 1** | 分销商数据管理 | ✅ Done | 通过批次元数据管理，非独立表 |
| **Phase 2** | 自动账单生成 | ⏸️ Deferred | 当前手动查询 API 足够，暂不需要自动化 |
| **Phase 3** | 7年审计系统 | ⏸️ Deferred | 无合规强制要求，暂缓 |
| **Phase 3** | 争议管理 | ⏸️ Deferred | 线下处理即可，暂缓 |

### 实际实现方式

**分销商数据存储在批次元数据中**（非独立 `ota_resellers` 表）：
- 创建批次时传入分销商信息（reseller_metadata）
- 账单查询时从批次 JSON 字段聚合分销商数据
- 佣金率和结算周期从批次元数据读取

**注意**: `ota_resellers` 表已创建但**当前未使用**，分销商数据直接嵌入批次元数据。

**暂缓原因**: 当前业务规模下，手动查询 API 数据足以满足对账需求，高级自动化功能待业务增长后再开发。

> 技术实现细节见 Card: [ota-reseller-management](../cards/ota-reseller-management.md)

## Executive Summary
**Problem Statement**: OTA partners distributing tickets through reseller networks need sophisticated billing reconciliation based on actual ticket redemption, not purchase events, with full audit trail compliance for B2B2C revenue recognition.

**Solution Overview**: Usage-based billing platform that charges resellers when end customers redeem tickets, providing automated billing reconciliation, 7-year audit retention, and comprehensive analytics for B2B2C revenue streams.

**Success Metrics**:
- 100% billing accuracy with redemption-based revenue recognition
- 7-year audit retention compliance (regulatory requirement)
- <24h billing reconciliation cycle time
- Automated billing process reducing manual intervention by 95%

**Timeline**:
- Phase 1 (Reseller Master Data): Jan 15, 2026
- Phase 2 (Usage Billing Engine): Feb 15, 2026
- Phase 3 (Audit & Compliance): Feb 28, 2026

## Business Context

### Market Opportunity
- **Business Model**: B2B2C reseller distribution with usage-based revenue sharing
- **Customer Segments**:
  - **Primary**: OTA platforms with downstream reseller networks
  - **Secondary**: Regional travel agencies seeking inventory distribution
  - **Tertiary**: Corporate travel management platforms
- **Revenue Model**: Commission-based billing on actual ticket redemption events
- **Competitive Advantage**: Pay-on-use model reduces reseller inventory risk

### Business Requirements
- **Revenue Recognition**:
  - Usage-based billing (charge on redemption, not purchase)
  - Automated commission calculation per reseller tier
  - Real-time redemption tracking for accurate billing
  - Multi-currency settlement support
- **Compliance Requirements**:
  - 7-year audit trail retention (regulatory mandate)
  - Complete transaction lineage (OTA → Reseller → Customer → Redemption)
  - Financial audit support with exportable reports
  - Data protection for financial records
- **Operational Requirements**:
  - Monthly billing cycle automation
  - Dispute resolution with transaction evidence
  - Performance analytics per reseller and campaign
  - Integration with existing accounting systems

## Product Specification

### Core Features

**Reseller Master Data Management**
- **Description**: Centralized reseller registry with business information, commission settings, and contract lifecycle management
- **Business Value**: Enables systematic reseller management, automated billing, and scalable B2B2C operations
- **User Value**: OTA partners can manage multiple resellers with different commission rates, regions, and contract terms
- **Acceptance Criteria**:
  - Reseller registry with unique identifiers per OTA partner (partner_id + reseller_code)
  - Commission rate configuration per reseller (default 10%, customizable)
  - Contract lifecycle tracking (start date, end date, status: active/suspended/terminated)
  - Settlement cycle configuration (weekly/monthly/quarterly)
  - Regional assignment and tier-based categorization (platinum/gold/silver/bronze)
  - Contact information storage (email, phone)
  - Payment terms and settlement details
  - Audit trail for reseller creation and modifications
- **Priority**: High

**Usage-Based Billing Engine**
- **Description**: Charge resellers based on actual ticket redemption events, not purchase events
- **Business Value**: Revenue recognition aligned with actual value delivery, reduces reseller risk
- **User Value**: Resellers only pay for tickets that customers actually use
- **Acceptance Criteria**:
  - Track redemption events back to originating batch and reseller
  - Generate billing summaries per reseller per billing period
  - Real-time redemption counts per batch for reseller analytics
  - Automated billing event generation when tickets are redeemed at venues
  - Support for custom pricing from batch pricing_snapshot
  - Handle partial redemptions (multi-entitlement tickets)
  - Commission calculation based on wholesale prices
- **Priority**: High

**7-Year Audit Retention System**
- **Description**: Complete audit trail storage for regulatory compliance and dispute resolution
- **Business Value**: Ensures regulatory compliance and provides evidence for financial audits
- **User Value**: Partners have complete transaction history for business analysis and compliance
- **Acceptance Criteria**:
  - Store complete transaction lineage for 7+ years
  - Immutable audit records with cryptographic integrity
  - Export capabilities for regulatory audits
  - Transaction search and filtering across time ranges
  - Data archival with retrieval capabilities
  - Compliance reporting templates
- **Priority**: Medium

**Billing Reconciliation Dashboard**
- **Description**: Real-time analytics and billing management for OTA partners and resellers
- **Business Value**: Reduces billing disputes and provides transparency in revenue sharing
- **User Value**: Clear visibility into redemption patterns, commission earnings, and payment schedules
- **Acceptance Criteria**:
  - Real-time redemption tracking per batch and reseller
  - Commission calculation preview before billing cycles
  - Dispute management workflow with evidence attachment
  - Automated payment notifications and reminders
  - Performance analytics (redemption rates, revenue trends)
  - Export capabilities for accounting integration
- **Priority**: Medium

### Technical Requirements
- **Performance**:
  - Real-time redemption event processing (<5s latency)
  - Monthly billing generation for 1000+ resellers within 4 hours
  - 7-year data retention without query performance degradation
- **Security**:
  - Financial data encryption at rest and in transit
  - Multi-level access controls (OTA admin, reseller view-only)
  - Audit log immutability with digital signatures
- **Integration**:
  - Integration with existing OTA ticket redemption flow (PRD-002)
  - Webhook notifications for billing events
  - API access for accounting system integration
- **Compliance**:
  - GDPR compliance for personal financial data
  - SOX compliance for financial audit trails
  - Data export for regulatory reporting

## Business Rules & Logic

### Billing Event Generation
- **Trigger**: Ticket redemption at venue (function entitlement consumed)
- **Data Required**: ticket_code, batch_id, reseller_id, redemption_timestamp, function_code, wholesale_price
- **Processing**: Create billing_event record linking redemption to reseller
- **Validation**: Ensure redemption maps to valid reseller batch

### Commission Calculation
- **Base Rate**: Reseller-specific commission percentage (default 10%)
- **Wholesale Price**: From batch pricing_snapshot (locked at generation time)
- **Formula**: `commission_amount = wholesale_price * commission_rate`
- **Currency**: Maintain currency from original batch pricing
- **Adjustments**: Support for tier-based commission multipliers

### Billing Cycle Management
- **Default Cycle**: Monthly (configurable per reseller)
- **Cut-off**: Last day of month at 23:59 UTC
- **Generation**: Automated billing summary creation on 1st of following month
- **Payment Terms**: Net 30 days (configurable per reseller contract)
- **Late Fees**: Configurable penalty rates for overdue payments

### Audit Trail Requirements
- **Immutable Records**: All financial transactions stored with hash-based integrity
- **Transaction Lineage**: Complete chain from batch generation → ticket activation → redemption → billing
- **Retention Policy**: 7 years minimum, with automated archival to cold storage
- **Access Logging**: All audit data access logged with user authentication

## Implementation Strategy

### Phase 1: Reseller Master Data (Jan 15, 2026)
- Reseller registry with CRUD operations
- Commission rate management
- Basic analytics dashboard
- Integration with existing OTA partner system

### Phase 2: Usage Billing Engine (Feb 15, 2026)
- Redemption event capture integration
- Automated billing cycle generation
- Commission calculation engine
- Payment tracking and reconciliation

### Phase 3: Audit & Compliance (Feb 28, 2026)
- 7-year audit trail implementation
- Compliance reporting capabilities
- Data archival automation
- Regulatory export functionality

### Resource Requirements
- **Engineering**: 1 full-stack developer, 1 database specialist
- **Finance**: Business requirements validation, compliance review
- **Legal**: Regulatory compliance verification
- **Operations**: System monitoring and financial reconciliation processes

## Success Metrics & KPIs

### Business Metrics
- **Revenue Accuracy**: 99.95% billing accuracy (target: zero billing disputes)
- **Process Automation**: 95% reduction in manual billing intervention
- **Compliance**: 100% audit trail completeness for 7-year retention
- **Partner Satisfaction**: <24h billing reconciliation cycle time

### Operational Metrics
- **Performance**: Real-time redemption processing (<5s latency)
- **Scalability**: Support 1000+ resellers with monthly billing
- **Reliability**: 99.9% uptime for billing system
- **Data Integrity**: Zero data corruption incidents

### Compliance Metrics
- **Audit Readiness**: 100% transaction traceability
- **Regulatory Response**: <4h response time for audit data requests
- **Data Retention**: 7+ year retention with <1% storage cost growth annually

## Dependencies & Integration

### PRD-002 Integration Points
- **Ticket Redemption Events**: Billing events triggered by venue scanning
- **Batch Metadata**: Commission calculation uses pricing_snapshot from batches
- **Reseller Identification**: Billing links to reseller_id from OTA ticket batches

### External Systems
- **Accounting Integration**: Export billing data to partner accounting systems
- **Payment Processing**: Integration with payment gateways for commission settlement
- **Compliance Tools**: Export capabilities for regulatory reporting tools

---

**Document Status**: Planning phase
**Next Review**: Monthly business requirements validation
**Related Documents**:
- `PRD-002-ota-platform-integration.md` (dependency - ticket generation and redemption)
- `docs/stories/US-015-reseller-billing-system.md` (implementation story)

**Business Impact Summary**: Enables sophisticated B2B2C revenue sharing model with usage-based billing, ensuring regulatory compliance while reducing reseller inventory risk and providing transparent commission management for OTA partner ecosystems.