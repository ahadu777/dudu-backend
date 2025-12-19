# 票券表合并方案

> 将 `pre_generated_tickets` 合并到 `tickets` 表，统一票券管理

## 实施状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 代码重构 | ✅ 完成 | Entity 迁移、Service 改动、删除旧实体 |
| 数据迁移 | ⏳ 待执行 | 运行 `scripts/run-migration-023.ts` |
| 测试验证 | ⏳ 待执行 | 运行测试套件验证 |

## 1. 背景

当前系统存在两个票券表：
- `tickets` - 小程序直购票券
- `pre_generated_tickets` - OTA 预生成票券

两表功能重复，需要合并以：
- 统一核销入口
- 简化统计报表
- 减少维护成本

## 2. 合并原则

1. **API 契约不变** - OTA 接口请求/响应格式保持不变
2. **状态映射** - OTA 的 `ACTIVE` → `ACTIVATED`，`USED` → `VERIFIED`
3. **字段扩展** - tickets 表新增 OTA 专用字段
4. **渠道区分** - 通过 `channel` 字段区分来源

## 3. 状态枚举统一

```typescript
export type TicketStatus =
  | 'PRE_GENERATED'   // OTA 预生成，未售出
  | 'PENDING_PAYMENT' // 小程序下单，待支付
  | 'ACTIVATED'       // 已激活/已售出（可用）
  | 'RESERVED'        // 已预约时段
  | 'VERIFIED'        // 已核销
  | 'EXPIRED'         // 已过期
  | 'CANCELLED';      // 已取消
```

### 状态映射表

| 原 `pre_generated_tickets` | → | 合并后 `tickets` |
|---------------------------|---|------------------|
| `PRE_GENERATED` | → | `PRE_GENERATED` |
| `ACTIVE` | → | `ACTIVATED` |
| `USED` | → | `VERIFIED` |
| `EXPIRED` | → | `EXPIRED` |
| `CANCELLED` | → | `CANCELLED` |

## 4. 字段合并

### 4.1 新增字段（从 pre_generated_tickets 迁移）

| 字段 | 类型 | 说明 |
|------|------|------|
| `batch_id` | VARCHAR(100) | OTA 批次 ID |
| `partner_id` | VARCHAR(50) | OTA 合作伙伴 ID |
| `payment_reference` | VARCHAR(100) | 支付引用号 |
| `distribution_mode` | ENUM | 销售模式 |
| `reseller_name` | VARCHAR(200) | 分销商名称 |
| `raw` | JSON | QR 码审计元数据 |

### 4.2 字段调整

| 字段 | 变更 | 说明 |
|------|------|------|
| `order_id` | INT → VARCHAR(50) | 兼容 OTA 订单号格式 |
| `orq` | NOT NULL → NULL | OTA 票券无此字段 |
| `ticket_code` | VARCHAR(50) → VARCHAR(100) | 兼容 OTA 编码长度 |

## 5. 实施步骤

### Step 1: Entity 迁移 ✅ 完成

Entity 文件已迁移到 `src/models/`：
- `ticket.entity.ts` - 统一票券实体
- `ticket-reservation.entity.ts` - 票券预约
- `reservation-slot.entity.ts` - 预约时段
- `product.entity.ts` - 产品
- `product-inventory.entity.ts` - 库存

### Step 2: 代码重构 ✅ 完成

- 移除 `PreGeneratedTicketEntity`
- Service 层移除 dual-source lookup
- 统一使用 `TicketEntity` + `channel` 字段区分来源

### Step 3: 数据迁移 ⏳ 待执行

```bash
# 执行数据迁移
npx ts-node scripts/run-migration-023.ts

# 验证迁移结果
npx ts-node scripts/verify-ticket-merge.ts
```

Migration 会：
1. 扩展 `tickets` 表结构
2. 迁移 `pre_generated_tickets` 数据
3. 状态映射：`ACTIVE` → `ACTIVATED`, `USED` → `VERIFIED`
4. 保留 `pre_generated_tickets` 表（历史备份）

### Step 4: 测试验证 ⏳ 待执行

```bash
npm run test:prd 006    # 票券激活
npm run test:story 012  # OTA 集成
npm test                # 完整测试套件
```

## 6. 代码结构（最终状态）

```
src/models/                           # 共享 Entity
├── ticket.entity.ts                  # 统一票券（小程序 + OTA）
├── ticket-reservation.entity.ts
├── reservation-slot.entity.ts
├── product.entity.ts
├── product-inventory.entity.ts
└── index.ts

src/modules/ota/domain/               # OTA 模块专属
├── ota-order.entity.ts
├── ota-ticket-batch.entity.ts
├── channel-reservation.entity.ts
└── ota.repository.ts                 # 使用 TicketEntity

src/modules/venue/domain/             # 场馆模块专属
├── venue.entity.ts
├── venue-session.entity.ts
├── redemption-event.entity.ts
└── venue.repository.ts               # 使用 TicketEntity
```

## 7. 数据库表结构（最终状态）

```
tickets 表（统一票券）
├── channel = 'direct'  → 小程序票券
└── channel = 'ota'     → OTA 票券

pre_generated_tickets 表
└── 保留作为历史备份，代码不再引用
```

## 8. 回滚方案

Migration 包含 `down()` 方法：
1. 从 `tickets` 表删除 OTA 数据
2. 删除新增字段
3. 恢复原状态枚举

## 9. 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 数据迁移丢失 | 中 | 保留旧表，验证行数 |
| API 兼容性 | 低 | status-mapper 做状态映射 |
| 状态混淆 | 低 | 统一状态枚举 + channel 区分 |
