---
id: US-012
title: OTA Platform Integration for Bulk Ticket Reservation
owner: Product
status: "Done"
priority: High
created_date: "2025-11-03"
completed_date: "2025-11-06"
business_requirement: "PRD-002"
enhances:
  - US-001  # Extends ticket system to OTA channel
depends_on:
  - US-001  # Core ticketing foundation required
cards:
  - ota-channel-management
  - ota-reseller-management
  - ota-order-retrieval
  - ota-premade-tickets
  - ota-reservation-management
---

# US-012: OTA Platform Integration for Bulk Ticket Reservation

## Story Analysis

### 1. Story Understanding

#### Core Story
**As an** external OTA (Online Travel Agency) platform
**I want** to reserve 5000 ticket package units from the cruise ticketing system
**So that** I can sell packages to my customers and distribute batches to sub-resellers for expanded market reach

#### B2B2C Enhancement Story *(NEW)*
**As an** OTA platform operator
**I want** to generate batches of 100+ tickets for distribution to other sellers
**So that** I can expand my distribution network without direct partnership management overhead

#### Business Context
- **Business Driver**: PRD-001 cruise package expansion through external sales channels
- **Market Opportunity**: OTA platforms need guaranteed inventory for bulk sales
- **Revenue Impact**: Expand market reach while maintaining current business model
- **Timeline Constraint**: Nov 15, 2025 deadline for 5000 ticket availability

#### Acceptance Criteria
- [x] OTA 平台可预订指定数量的套餐库存（产品 106-108）
- [x] 预订的库存在激活或过期前不会被直销渠道售出
- [x] OTA 平台可实时查询库存可用状态
- [x] OTA 支付通知触发自动出票
- [x] OTA 渠道票券的二维码核销流程与直销票券一致
- [x] 系统确保 OTA 接口需要身份验证才能访问
- [x] 系统分渠道追踪库存，确保销售渠道之间相互隔离
- [x] OTA 平台可按条件查询已生成票券（状态、批次、日期范围、分页）
- [x] 系统确保 OTA 合作伙伴只能访问自己的票券

#### B2B2C Enhancement Acceptance Criteria *(NEW)*
- [x] OTA 可批量生成 100+ 张票券，并追踪分销商元数据
- [x] 批次票券包含目标分销商信息以便审计追溯
- [x] 分销商批次有延长的暂定销售期（直销 7 天，分销批次 30 天，当前未强制执行）
- [x] 票券激活时记录分销商到客户的链路追踪
- [x] 批次分发不影响 OTA 直销库存分配

#### Reseller Master Data Management *(NEW - 2025-11-14)*
- [x] OTA 平台可管理其分销商（增删改查）
- [x] 系统确保分销商数据隔离（只能访问自己的分销商）
- [x] 账单汇总支持跨所有分销商聚合查询

> 技术实现详见 Card: [ota-reseller-management](../cards/ota-reseller-management.md)

#### Ticket Lifecycle Enhancement Acceptance Criteria *(NEW - 2025-11-14)*
- [x] OTA 票券支持"已使用"状态
- [x] 当票券所有权益全部核销后，系统自动将票券标记为"已使用"
- [x] OTA 平台和普通用户均可查询票券状态和剩余权益（无需生成二维码）
- [x] 场馆核销流程中 session_code 为可选参数
- [x] 权益全部使用完毕时自动触发状态更新
- [x] "已使用"票券正确反映在库存对账和结算报表中

### 2. Business Rules Extraction

#### Inventory Allocation Rules
1. **Channel Separation**: OTA inventory pool separate from direct sales
   - Product 106 (Premium): 2000 units allocated to OTA
   - Product 107 (Pet Plan): 1500 units allocated to OTA
   - Product 108 (Deluxe): 1500 units allocated to OTA
   - Total: 5000 package units reserved for OTA sales

2. **Reservation Rules**:
   - OTA can reserve inventory without immediate payment
   - Reserved inventory expires after 24 hours if not activated
   - Activation occurs when OTA payment webhook received

3. **Pricing Rules**:
   - OTA uses same complex pricing engine (weekend/weekday, customer types)
   - Package compositions remain identical (function codes unchanged)
   - Customer discount information exposed via inventory API for dynamic pricing
   - Customer pricing scenarios:
     * Product 106 (Premium): Adult $288/$318, Child $188/$218 (saves $100), Elderly $238/$268 (saves $50), Student $238/$268 (saves $50)
     * Product 107 (Standard): Adult $188/$228, Child $38/$78 (saves $150), Family $88/$128 (saves $100), Elderly $113/$153 (saves $75)
     * Product 108 (Luxury): Adult $788/$868, VIP $588/$668 (saves $200), Elderly $688/$768 (saves $100)
   - OTA partners receive complete discount matrix for implementing their own pricing logic

#### Authentication & Security Rules
1. **API Access**: OTA endpoints require API key authentication
2. **Rate Limiting**: Maximum 100 requests/minute per OTA partner
3. **Audit Requirements**: All OTA transactions logged for reconciliation

#### Integration Rules
1. **Payment Flow**: OTA payment notifications use existing `/payments/notify` webhook
2. **Ticket Generation**: Same ticket issuance service creates tickets with entitlements
3. **QR System**: Identical QR generation and redemption for OTA tickets

### 3. API Endpoints

> 详细 API 契约见关联 Cards，此处仅列出端点清单：

| 端点 | 用途 | Card |
|------|------|------|
| `GET /api/ota/inventory` | 查询库存 | ota-channel-management |
| `POST /api/ota/tickets/bulk-generate` | 批量生成票券 | ota-premade-tickets |
| `GET /api/ota/tickets` | 查询票券 | ota-order-retrieval |
| `GET /qr/{ticket_code}/info` | 票券状态查询 | qr-generation-api |
| `GET /api/ota/resellers` | 分销商管理 | ota-reseller-management |

### 4. 数据影响

> 详细数据库设计见各 Card 的 Data Impact 部分

**核心数据变更**：
- 库存按渠道隔离（OTA / 直销）
- 新增票券批次表（ota_ticket_batches）
- 票券状态：PRE_GENERATED → ACTIVE → USED

**票据有效期**：当前票据永久有效，二维码 30 分钟过期后可重新生成

## 关联 Cards

| Card | 状态 | 描述 |
|------|------|------|
| [ota-channel-management](../cards/ota-channel-management.md) | Deprecated | 库存管理（Reserve API 已移除）|
| [ota-reseller-management](../cards/ota-reseller-management.md) | Unused | 分销商主数据（表已建，未使用）|
| [ota-order-retrieval](../cards/ota-order-retrieval.md) | Done | 票券查询 |
| [ota-premade-tickets](../cards/ota-premade-tickets.md) | Done | 批量生成票券 |
| [ota-reservation-management](../cards/ota-reservation-management.md) | Done | 预订管理 |

## 成功指标

| 指标 | 目标 | 状态 |
|------|------|------|
| OTA 库存分配 | 5000 套餐 | ✅ 已完成 |
| 渠道库存隔离 | 零冲突 | ✅ 已验证 |
| API 响应时间 | < 2秒 | ✅ 已达标 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 库存并发竞争 | 数据库行锁 |
| 渠道冲突 | 库存物理隔离 |
| 认证安全 | API Key + 速率限制 |

---

**依赖**: US-001 (票务基础), US-011 (复杂定价)