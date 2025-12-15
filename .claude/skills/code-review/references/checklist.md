# Code Review Checklist

通用代码审查检查清单，适用于所有代码改动。

## 1. Card Spec 一致性

### API Contract

| 检查项 | 验证方法 |
|--------|----------|
| HTTP Method 正确 | 对照 Card 的 `## API Contract` |
| Path 正确 | 对照 Card 定义的路径 |
| Path Params 完整 | 检查 `:id` 等参数 |
| Query Params 完整 | 检查可选/必填参数 |
| Request Body 结构正确 | 对照 Card 的 Request 定义 |
| Response 结构正确 | 对照 Card 的 Response 定义 |

### Error Handling

| 检查项 | 验证方法 |
|--------|----------|
| 错误码符合规范 | 对照 Card 的 Error Codes |
| 错误消息用户友好 | 不暴露内部实现 |
| 边界条件覆盖 | 空值、超限、无权限等 |

### 验证命令

```bash
# 查找对应的 Card
grep -l "关键词" docs/cards/*.md

# 对比 Card 定义
cat docs/cards/CARD-XXX.md | grep -A 20 "## API Contract"
```

---

## 2. 代码质量

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getUserById`, `isActive` |
| 类 | PascalCase | `UserService`, `OrderEntity` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件 | kebab-case 或 camelCase | `user-service.ts` |

**命名原则：**
- 名字要能表达意图
- 避免缩写（除非是通用缩写如 `id`, `url`）
- 布尔变量用 `is`, `has`, `can` 前缀
- 函数名用动词开头

### 函数设计

```typescript
// ❌ Bad: 函数做太多事
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);
  await validateOrder(order);
  await calculatePrice(order);
  await applyDiscount(order);
  await saveOrder(order);
  await sendEmail(order);
  await updateInventory(order);
}

// ✅ Good: 职责单一，组合调用
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);
  const validatedOrder = await validateOrder(order);
  const pricedOrder = await calculateFinalPrice(validatedOrder);
  await saveOrder(pricedOrder);
  await notifyOrderComplete(pricedOrder);
}
```

**函数原则：**
- 单一职责（一个函数做一件事）
- 长度控制（< 50 行，理想 < 20 行）
- 参数数量（< 4 个，多了用对象）
- 嵌套深度（< 3 层）

### DRY vs YAGNI

| 原则 | 含义 | 应用 |
|------|------|------|
| DRY | 不要重复自己 | 重复代码 > 2 次 → 抽取 |
| YAGNI | 不需要就不做 | 别为假设的未来需求写代码 |

**平衡点：**
- 3 次重复才抽象（Rule of Three）
- 当前需求优先，不过度设计
- 简单 > 抽象

---

## 3. 错误处理

### 异常处理模式

```typescript
// ✅ Good: 明确的错误处理
async function getUser(id: string): Promise<User> {
  try {
    const user = await userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return user;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // 业务异常直接抛出
    }
    logger.error('Failed to get user', { id, error });
    throw new InternalError('Failed to retrieve user');
  }
}

// ❌ Bad: 吞掉异常
async function getUser(id: string): Promise<User | null> {
  try {
    return await userRepository.findOne({ where: { id } });
  } catch (error) {
    return null; // 错误被吞掉，调用者不知道发生了什么
  }
}
```

### 错误分类

| 类型 | HTTP Code | 处理方式 |
|------|-----------|----------|
| 用户输入错误 | 400 | 返回详细错误信息 |
| 未认证 | 401 | 引导登录 |
| 无权限 | 403 | 说明缺少什么权限 |
| 资源不存在 | 404 | 明确资源类型 |
| 业务规则违反 | 422 | 说明违反了什么规则 |
| 服务器错误 | 500 | 记录日志，返回通用信息 |

---

## 4. 日志规范

### 该记录什么

```typescript
// ✅ 记录关键业务操作
logger.info('Order created', { orderId, userId, amount });

// ✅ 记录错误上下文
logger.error('Payment failed', { orderId, error: error.message, stack: error.stack });

// ❌ 不要记录敏感信息
logger.info('User login', { password }); // 危险！
```

### 日志级别

| 级别 | 使用场景 |
|------|----------|
| `error` | 需要立即关注的错误 |
| `warn` | 异常但可恢复的情况 |
| `info` | 关键业务操作 |
| `debug` | 开发调试信息（生产环境关闭） |

---

## 5. 注释规范

### 该写注释的地方

```typescript
// ✅ 解释 WHY（为什么这样做）
// 使用乐观锁防止超卖，因为库存更新是高频操作
await inventoryRepository.decrementWithVersion(productId, quantity);

// ✅ 解释复杂的业务规则
// 会员日（每月 8 号）额外 9 折，与其他折扣叠加
const memberDayDiscount = isMemberDay(date) ? 0.9 : 1;

// ❌ 不需要的注释（代码已经很清晰）
// 获取用户
const user = await getUser(id);
```

### 不该写注释的地方

- 代码本身就能说明的事情
- 过期的注释（宁可删除）
- 注释掉的代码（用版本控制）
