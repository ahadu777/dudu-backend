# 票券表合并 - 代码改动清单

> 本文档列出合并 `pre_generated_tickets` 到 `tickets` 表后需要修改的代码

## 实施状态

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1. TicketEntity 更新 | ✅ 完成 | 已迁移到 `src/models/ticket.entity.ts` |
| 2. Status Mapper 创建 | ✅ 完成 | `src/modules/ota/status-mapper.ts` |
| 3. Repository 改动 | ✅ 完成 | 统一使用 TicketEntity |
| 4. Service 改动 | ✅ 完成 | 移除 dual-source lookup |
| 5. 删除 PreGeneratedTicketEntity | ✅ 完成 | 已删除 |
| 6. Migration 执行 | ⏳ 待执行 | `scripts/run-migration-023.ts` |

## OTA API 契约不变

**内部状态变化，但 API 响应保持不变：**

| 内部状态 | OTA API 状态 | 说明 |
|---------|-------------|------|
| `ACTIVATED` | `ACTIVE` | API 响应映射 |
| `VERIFIED` | `USED` | API 响应映射 |
| 其他 | 不变 | 直接透传 |

使用 `src/modules/ota/status-mapper.ts` 进行转换。

## 已完成的改动

### 1. Entity 迁移到 models/

| 原路径 | 新路径 |
|--------|--------|
| `src/modules/ticket-reservation/domain/ticket.entity.ts` | `src/models/ticket.entity.ts` |
| `src/modules/ticket-reservation/domain/ticket-reservation.entity.ts` | `src/models/ticket-reservation.entity.ts` |
| `src/modules/ticket-reservation/domain/reservation-slot.entity.ts` | `src/models/reservation-slot.entity.ts` |
| `src/modules/ota/domain/product.entity.ts` | `src/models/product.entity.ts` |
| `src/modules/ota/domain/product-inventory.entity.ts` | `src/models/product-inventory.entity.ts` |
| `src/modules/ota/domain/pre-generated-ticket.entity.ts` | **已删除** |

### 2. Repository 改动

**`src/modules/ota/domain/ota.repository.ts`**
```typescript
// 类型别名保持向后兼容
type PreGeneratedTicketEntity = TicketEntity;

// 实际使用统一的 tickets 表
private ticketRepo: Repository<TicketEntity>;
```

**`src/modules/venue/domain/venue.repository.ts`**
```typescript
import { TicketEntity, TicketStatus, ... } from '../../../models';
```

### 3. Service 改动

**`src/modules/customerReservation/service.directus.ts`**
- 移除 `otaTicketRepo`
- 移除 dual-source lookup
- 统一使用 `ticketRepo` 通过 `channel` 字段区分来源

**`src/modules/ticket-reservation/service.ts`**
- 移除 `otaTicketRepo`
- 统一从 `tickets` 表查询

### 4. Entity 关联更新

**`src/modules/ota/domain/ota-order.entity.ts`**
```typescript
import { TicketEntity } from '../../../models';

@OneToMany(() => TicketEntity, ticket => ticket.ota_order_id)
tickets?: TicketEntity[];
```

## 状态映射速查表

| 场景 | Before | After |
|------|--------|-------|
| OTA 票券激活 | `status = 'ACTIVE'` | `status = 'ACTIVATED'` |
| 票券核销 | `status = 'USED'` | `status = 'VERIFIED'` |
| 状态检查 | `status === 'ACTIVE'` | `status === 'ACTIVATED'` |
| 统计 USED | `WHERE status = 'USED'` | `WHERE status = 'VERIFIED'` |

## 待执行：数据迁移

```bash
# 执行数据迁移
npx ts-node scripts/run-migration-023.ts

# 验证迁移结果
npx ts-node scripts/verify-ticket-merge.ts
```

迁移会：
1. 扩展 `tickets` 表结构（添加 OTA 字段）
2. 将 `pre_generated_tickets` 数据复制到 `tickets` 表
3. 状态映射：`ACTIVE` → `ACTIVATED`, `USED` → `VERIFIED`
4. 保留 `pre_generated_tickets` 表作为历史备份

## 测试验证

以下测试需要验证：
- [ ] `npm run test:prd 006` - 票券激活
- [ ] `npm run test:story 012` - OTA 集成
- [ ] OTA 相关的所有 API 测试
