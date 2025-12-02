# Technical Stack & Guidelines

## Tech Stack

- **Runtime**: Node.js 18+ / TypeScript 5.7
- **Framework**: Express 5.1
- **Database**: MySQL (TypeORM 0.3.20)
- **Docs**: OpenAPI 3.0.3 + Swagger UI
- **Validation**: class-validator, class-transformer
- **Security**: helmet, bcrypt, jsonwebtoken
- **Logging**: winston, morgan

## TypeORM 使用指南

**新代码推荐使用 TypeORM Repository/QueryBuilder：**

```typescript
// ✅ 推荐 - Repository
const user = await userRepository.findOne({ where: { id } });

// ✅ 推荐 - QueryBuilder (复杂查询)
const result = await userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.orders', 'order')
  .where('user.status = :status', { status: 'active' })
  .getMany();

// ⚠️ 尽量避免 - 原生 SQL (除非必要)
await dataSource.query('SELECT * FROM users WHERE id = ?', [id]);
```

**原生 SQL 适用场景：**
- `src/migrations/*.ts` - Migration 文件
- 复杂聚合/统计查询 (QueryBuilder 难以表达时)
- 性能关键路径 (经过验证确实更优时)

**现有代码风格：**
项目中存在两种风格，新代码建议遵循 Repository 模式，现有代码按需渐进重构

## Project Structure

```
docs/
  stories/        # Business requirements
  cards/          # Technical specs
  integration/    # Consumer runbooks
  reference/      # Detailed guides
  cases/          # Case studies
src/
  config/         # Database, app configuration
  core/           # Shared utilities (errors, events, mock)
  middlewares/    # Express middlewares (auth, validation)
  models/         # Shared TypeORM entities
  modules/        # Feature modules (see below)
  types/          # TypeScript type definitions
  utils/          # Helper functions (logger, crypto)
  migrations/     # Database migrations
```

## Module Structure (参考指南)

### 现有模式

项目中存在两种模块组织方式，都是有效的：

**模式 A: 扁平结构**
```
src/modules/{name}/
├── router.ts
├── service.ts
└── types.ts
```

**模式 B: Domain 子目录**
```
src/modules/{name}/
├── router.ts
├── service.ts
└── domain/
    ├── *.entity.ts
    └── *.repository.ts
```

### Entity 放置

两种方式都可以：
- `src/models/` - 共享 Entity，多模块使用
- `src/modules/{name}/domain/` - 模块专属 Entity

**建议**：新建 Entity 时，考虑是否会被其他模块使用来决定位置

### 分层参考

```
Router → Service → TypeORM
```

- **Router**: 路由、请求验证
- **Service**: 业务逻辑，可直接使用 TypeORM Repository
- **Repository**: 可选，复杂查询时抽取

### 常见文件

| 文件 | 用途 |
|------|------|
| `router.ts` | Express 路由定义 |
| `service.ts` | 业务逻辑 |
| `types.ts` | DTO、接口定义 |
| `*.entity.ts` | TypeORM 实体 |
| `*.repository.ts` | 复杂查询封装 (可选) |
| `*.client.ts` | 外部 API 调用 (可选) |

### 新模块参考流程

1. 创建 `src/modules/{name}/`
2. 参考相似模块的结构
3. 注册路由到 `src/modules/index.ts`

## 开发与测试模式

### 数据库优先

```bash
npm start                     # 连接 MySQL
USE_DATABASE=true npm start   # 显式指定
```

### Mock 策略

| 方式 | 推荐度 | 说明 |
|------|--------|------|
| **数据库 Mock** | ✅ 推荐 | 在数据库中插入测试数据 |
| **外部服务 Mock** | ✅ 推荐 | 模拟第三方 API 响应 |
| **代码 Mock** | ⚠️ 谨慎 | 优先考虑上述两种方式 |

**适用场景：**
- 外部 API 有调用限制 → Mock 外部服务响应
- 需要特定测试数据 → 数据库中准备 Mock 数据
- 支付/短信等敏感操作 → Mock 第三方回调

**示例：数据库 Mock**
```typescript
// 测试数据通过 TypeORM 入库
const mockOrder = orderRepo.create({
  id: 9999,
  status: 'MOCK_TEST',
  // ...
});
await orderRepo.save(mockOrder);
```

**示例：外部服务 Mock**
```typescript
// 环境变量控制
if (process.env.MOCK_WECHAT === 'true') {
  return { openid: 'mock_openid_123' };
}
return await wechatApi.getOpenId(code);
```

**现有代码：**
- `src/core/mock/` 保留
- 新功能优先使用数据库 Mock 或外部服务 Mock
