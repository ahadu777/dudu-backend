# Product Architecture

## Overview

DeepTravel 旅游票务平台采用单一产品、模块化架构设计。本文档定义产品架构分层和 PRD 分类标准。

## Architecture Layers (Category Tag)

产品架构分为 5 个能力层，每个 PRD 必须归属到其中一个 category：

```
┌─────────────────────────────────────────────────────────────┐
│                    用户触达层 (customer)                    │
│  小程序、Web 预约、用户订单管理、用户体验优化               │
│  PRD-008                                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    渠道接入层 (channel)                     │
│  OTA API 对接、分销商管理、批量票券操作、渠道计费           │
│  PRD-002, PRD-005                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    核心业务层 (core)                        │
│  票务生命周期：购买 → 激活 → 预约 → 核销                   │
│  库存管理、价格引擎、订单处理                               │
│  PRD-001, PRD-006                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    运营支撑层 (operation)                   │
│  场馆管理、操作员核销、报表分析、审计日志                   │
│  PRD-003                                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    平台能力层 (platform)                    │
│  用户认证、多租户支持、基础设施、通用服务                   │
│  PRD-004, PRD-009                                           │
└─────────────────────────────────────────────────────────────┘
```

## Category Definitions

| Category | 中文名 | 职责 | 典型功能 |
|----------|--------|------|----------|
| `core` | 核心业务 | 票务生命周期管理 | 购买、激活、预约、核销、库存、定价 |
| `customer` | 用户端 | 面向终端用户的体验 | 小程序、Web 预约、订单查询、支付 |
| `channel` | 渠道 | 外部渠道对接 | OTA API、分销商、批量操作、渠道计费 |
| `operation` | 运营 | 内部运营支撑 | 场馆管理、操作员工具、报表、审计 |
| `platform` | 平台 | 基础能力支撑 | 认证、多租户、通知、文件存储 |

## Current PRD Classification

| PRD | Title | Category | Status |
|-----|-------|----------|--------|
| PRD-001 | Cruise Package Ticketing Platform | `core` | Done |
| PRD-002 | OTA Platform Integration | `channel` | Done |
| PRD-003 | Event Venue Operations | `operation` | Draft |
| PRD-004 | WeChat MiniProgram Auth | `platform` | Done |
| PRD-005 | Reseller Billing & Analytics | `channel` | Done |
| PRD-006 | Ticket Activation and Reservation | `core` | Draft |
| PRD-007 | ~~Ticket Reservation & Validation~~ | ~~`core`~~ | **Deprecated** → `_deprecated/` (merged into PRD-006) |
| PRD-008 | DeepTravel MiniProgram Platform | `customer` | In Progress |
| PRD-009 | Multi-Tenant E-Commerce Platform | `platform` | Draft |

## New Feature Assignment Flow

当有新功能需求时，按以下流程确定归属：

```
新功能需求
    │
    ▼
┌─────────────────────────────────────┐
│ 1. 确定主要服务的能力层              │
│    - 面向用户？→ customer           │
│    - 对接外部？→ channel            │
│    - 票务流程？→ core               │
│    - 内部运营？→ operation          │
│    - 基础能力？→ platform           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. 查找该 category 下的现有 PRD     │
│    - 有匹配？→ 扩展该 PRD 的 Story  │
│    - 无匹配？→ 新建 PRD             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. 如需新建 PRD                     │
│    - 必须指定 category              │
│    - 确认与同 category PRD 无重叠   │
│    - 填写 PRD 边界检查清单          │
└─────────────────────────────────────┘
```

## Cross-Layer Dependencies

```
customer ──depends on──> core ──depends on──> platform
                │
channel ────────┘
                │
operation ──────┘
```

**依赖规则**：
- 上层可以依赖下层，下层不应依赖上层
- 同层之间避免强依赖，使用事件/接口解耦
- `platform` 是最底层，不依赖其他 category

## Example: Assigning "Group Purchase" Feature

假设新需求：支持团购订单

**分析**：
1. 团购涉及：下单流程、价格计算、库存扣减
2. 主要影响 `core`（订单处理）和 `customer`（用户界面）
3. 查找现有 PRD：PRD-001 已有订单逻辑，PRD-008 已有用户界面

**结论**：
- PRD-001 新增 Story：团购订单处理逻辑
- PRD-008 新增 Story：团购页面 UI

**不应该**：新建 PRD-010 "团购系统"（会与现有 PRD 重叠）

---

## Related Documents

- [DOCUMENT-SPEC.md](./DOCUMENT-SPEC.md) - PRD/Story/Card 规范
- [DOCUMENT-LAYER-DECISION.md](./DOCUMENT-LAYER-DECISION.md) - 文档层级决策树
