# Project-Specific Review Checklist

本项目特定的代码审查规则。

## 1. 项目架构

### 模块结构

```
src/modules/{name}/
├── router.ts           # Express 路由
├── service.ts          # 业务逻辑
├── types.ts            # DTO、接口定义
└── domain/             # 可选
    ├── *.entity.ts     # TypeORM 实体
    └── *.repository.ts # 复杂查询封装
```

**检查点：**
- [ ] 新模块遵循现有目录结构
- [ ] 分层正确：Router → Service → Repository
- [ ] 路由注册到 `src/modules/index.ts`

### Entity 放置

| 场景 | 位置 | 示例 |
|------|------|------|
| 多模块共享 | `src/models/` | User, Order |
| 模块专属 | `src/modules/{name}/domain/` | TicketActivation |

**检查点：**
- [ ] Entity 放置位置正确
- [ ] 跨模块引用使用 `src/models/`
- [ ] 模块内部 Entity 不被其他模块直接引用

---

## 2. TypeORM 使用

### 推荐模式

```typescript
// ✅ 推荐：Repository 模式
const user = await userRepository.findOne({ where: { id } });

// ✅ 推荐：QueryBuilder（复杂查询）
const result = await userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.orders', 'order')
  .where('user.status = :status', { status: 'active' })
  .getMany();

// ⚠️ 谨慎使用：原生 SQL
// 仅用于：Migration、复杂聚合、性能关键路径
await dataSource.query('SELECT COUNT(*) FROM users WHERE status = ?', ['active']);
```

**检查点：**
- [ ] 优先使用 Repository/QueryBuilder
- [ ] 原生 SQL 有明确理由
- [ ] 参数化查询（无 SQL 拼接）

### Migration 规范

```typescript
// ✅ GOOD: Migration 文件
export class AddUserStatus1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN status VARCHAR(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN status`);
  }
}
```

**检查点：**
- [ ] Migration 有 up 和 down
- [ ] 命名包含时间戳
- [ ] 不破坏现有数据

---

## 3. 路由规范

### 路由定义

```typescript
// ✅ GOOD: 标准路由结构
const router = Router();

router.get('/', listItems);           // 列表
router.get('/:id', getItem);          // 详情
router.post('/', createItem);         // 创建
router.put('/:id', updateItem);       // 更新
router.delete('/:id', deleteItem);    // 删除

export default router;
```

### 中间件使用

```typescript
// ✅ GOOD: 认证 + 验证
router.post(
  '/',
  authMiddleware,                     // 认证
  validateBody(CreateItemDto),        // 请求验证
  createItem                          // 业务处理
);
```

**检查点：**
- [ ] RESTful 风格
- [ ] 敏感接口有 authMiddleware
- [ ] 请求有 validateBody/validateQuery

---

## 4. Service 规范

### 业务逻辑封装

```typescript
// ✅ GOOD: Service 封装业务逻辑
@Injectable()
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private userService: UserService
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string): Promise<Order> {
    // 业务验证
    const user = await this.userService.getById(userId);
    if (!user.isActive) {
      throw new BusinessError('User is not active');
    }

    // 创建订单
    const order = this.orderRepository.create({
      ...dto,
      userId,
      status: OrderStatus.Pending
    });

    return this.orderRepository.save(order);
  }
}
```

**检查点：**
- [ ] 业务逻辑在 Service 层
- [ ] Router 只做请求/响应处理
- [ ] Service 之间可以互相调用

---

## 5. 错误处理

### 自定义错误

```typescript
// 使用项目定义的错误类型
import { NotFoundError, BusinessError, ValidationError } from '@/core/errors';

// ✅ GOOD: 使用标准错误
throw new NotFoundError('Order', orderId);
throw new BusinessError('Insufficient balance');
throw new ValidationError('Invalid email format');

// ❌ BAD: 直接抛出 Error
throw new Error('Something went wrong');
```

**检查点：**
- [ ] 使用项目标准错误类型
- [ ] 错误信息清晰
- [ ] HTTP 状态码正确映射

---

## 6. 文档一致性

### Card Spec 对照

| Card 字段 | 代码对应 | 检查方法 |
|-----------|----------|----------|
| API Path | router.ts 路由定义 | 路径完全匹配 |
| HTTP Method | get/post/put/delete | 方法匹配 |
| Request Body | DTO 类定义 | 字段一致 |
| Response | Service 返回类型 | 结构一致 |
| Error Codes | 抛出的异常 | 错误码覆盖 |

```bash
# 查找相关 Card
grep -l "关键词" docs/cards/*.md

# 查看 Card API 定义
grep -A 30 "## API Contract" docs/cards/CARD-XXX.md
```

**检查点：**
- [ ] 代码实现与 Card spec 一致
- [ ] 所有 Card 中定义的字段都实现
- [ ] 错误码与 Card 定义匹配

---

## 7. 测试覆盖

### 测试文件命名

```
postman/auto-generated/
├── prd-{NNN}-{description}.postman_collection.json
└── us-{NNN}-{description}.postman_collection.json
```

### 测试验证

```bash
# 运行相关测试
npm run test:prd 006
npm run test:story 014

# 全量测试
npm test
```

**检查点：**
- [ ] 新功能有对应测试
- [ ] 测试能通过
- [ ] 不影响现有测试

---

## 8. 禁止事项

### 代码禁止

| 禁止 | 原因 |
|------|------|
| `console.log` | 使用 logger |
| `any` 类型（无理由） | 类型不安全 |
| SQL 字符串拼接 | SQL 注入风险 |
| 硬编码密钥 | 安全风险 |
| `debugger` 语句 | 调试代码残留 |

### 提交禁止

| 禁止 | 原因 |
|------|------|
| `.env` 文件 | 包含密钥 |
| `node_modules/` | 依赖目录 |
| 大文件 (> 1MB) | 仓库膨胀 |
| 编译产物 | 应由 CI 生成 |

---

## Quick Project Checklist

| 检查项 | 通过 |
|--------|------|
| 模块结构正确 | [ ] |
| Entity 位置正确 | [ ] |
| 使用 TypeORM Repository | [ ] |
| 路由已注册 | [ ] |
| 有 auth 中间件（如需要） | [ ] |
| 与 Card spec 一致 | [ ] |
| 测试通过 | [ ] |
| 无禁止项 | [ ] |
