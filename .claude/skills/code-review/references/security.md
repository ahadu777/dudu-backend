# Security Review Checklist

基于 OWASP Top 10 的安全检查清单。

## 1. Injection (注入攻击)

### SQL Injection

```typescript
// ❌ DANGEROUS: 直接拼接 SQL
const query = `SELECT * FROM users WHERE id = '${userId}'`;
await dataSource.query(query);

// ✅ SAFE: TypeORM Repository
const user = await userRepository.findOne({ where: { id: userId } });

// ✅ SAFE: TypeORM QueryBuilder with parameters
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.status = :status', { status: 'active' })
  .getMany();

// ✅ SAFE: 原生查询使用参数化
await dataSource.query('SELECT * FROM users WHERE id = ?', [userId]);
```

**检查点：**
- [ ] 所有数据库查询使用参数化
- [ ] 不直接拼接用户输入到 SQL
- [ ] 使用 TypeORM Repository 或 QueryBuilder

### Command Injection

```typescript
// ❌ DANGEROUS: 直接执行用户输入
const { exec } = require('child_process');
exec(`ls ${userInput}`); // 用户输入 "; rm -rf /" 会灾难性后果

// ✅ SAFE: 使用参数数组
const { execFile } = require('child_process');
execFile('ls', [userInput]); // 参数作为独立参数传递
```

**检查点：**
- [ ] 避免使用 `exec`，优先使用 `execFile`
- [ ] 用户输入不直接拼接到命令
- [ ] 验证和清理所有外部输入

---

## 2. Broken Authentication (认证失效)

### Session Management

```typescript
// ✅ JWT 最佳实践
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: '1h',        // 短有效期
    algorithm: 'HS256',      // 明确算法
  }
);

// ✅ Token 验证
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],     // 限制算法，防止 none 攻击
});
```

**检查点：**
- [ ] JWT 设置合理的过期时间
- [ ] 明确指定签名算法
- [ ] 敏感操作要求重新认证
- [ ] 实现 token 刷新机制

### Password Security

```typescript
// ✅ 密码加密
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

// ✅ 密码验证
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

**检查点：**
- [ ] 密码使用 bcrypt 加密（不是 MD5/SHA1）
- [ ] salt rounds >= 10
- [ ] 不存储明文密码
- [ ] 不在日志中记录密码

---

## 3. Sensitive Data Exposure (敏感数据泄露)

### Response Filtering

```typescript
// ❌ BAD: 返回完整用户对象
return user;

// ✅ GOOD: 过滤敏感字段
return {
  id: user.id,
  name: user.name,
  email: user.email,
  // password, salt 等敏感字段不返回
};

// ✅ GOOD: 使用 class-transformer
import { Exclude } from 'class-transformer';

class UserResponse {
  id: string;
  name: string;

  @Exclude()
  password: string;

  @Exclude()
  salt: string;
}
```

### Logging Security

```typescript
// ❌ BAD: 记录敏感信息
logger.info('User login', { email, password }); // 危险！
logger.debug('Request body', req.body); // 可能包含敏感数据

// ✅ GOOD: 过滤敏感字段
logger.info('User login', { email, userId: user.id });
logger.debug('Request', {
  path: req.path,
  method: req.method,
  // 不记录 body
});
```

**检查点：**
- [ ] API 响应不包含密码、token、密钥
- [ ] 日志不记录敏感信息
- [ ] 错误信息不暴露内部实现
- [ ] 使用 HTTPS（生产环境）

---

## 4. Broken Access Control (访问控制失效)

### Authorization Checks

```typescript
// ❌ BAD: 只检查认证，不检查授权
router.get('/orders/:id', authMiddleware, async (req, res) => {
  const order = await orderService.getById(req.params.id);
  return res.json(order); // 用户可以查看任何人的订单！
});

// ✅ GOOD: 检查资源所有权
router.get('/orders/:id', authMiddleware, async (req, res) => {
  const order = await orderService.getById(req.params.id);
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('Access denied');
  }
  return res.json(order);
});
```

**检查点：**
- [ ] 敏感接口有 auth 中间件
- [ ] 检查资源所有权（不只是登录状态）
- [ ] 角色权限控制正确
- [ ] 垂直越权防护（普通用户不能访问管理功能）
- [ ] 水平越权防护（用户不能访问其他用户数据）

---

## 5. Security Misconfiguration (安全配置错误)

### Headers Security

```typescript
// ✅ 使用 helmet 中间件
import helmet from 'helmet';
app.use(helmet());

// helmet 自动设置：
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Content-Security-Policy
```

### Error Handling

```typescript
// ❌ BAD: 暴露内部错误
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack  // 危险！暴露代码结构
  });
});

// ✅ GOOD: 隐藏内部细节
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id  // 用于追踪
  });
});
```

**检查点：**
- [ ] 使用 helmet 中间件
- [ ] 生产环境不暴露 stack trace
- [ ] 禁用不必要的 HTTP 方法
- [ ] 配置 CORS 白名单

---

## 6. XSS (Cross-Site Scripting)

### Output Encoding

```typescript
// ❌ BAD: 直接输出用户输入
res.send(`<p>Hello, ${username}</p>`);

// ✅ GOOD: 转义输出
import { escape } from 'lodash';
res.send(`<p>Hello, ${escape(username)}</p>`);

// ✅ GOOD: 使用模板引擎自动转义
// (大多数现代模板引擎默认转义)
```

**检查点：**
- [ ] 用户输入在输出时转义
- [ ] Content-Type 正确设置
- [ ] CSP (Content Security Policy) 配置

---

## 7. Input Validation (输入验证)

### Using class-validator

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// 在路由中使用验证中间件
router.post('/users', validateBody(CreateUserDto), createUser);
```

**检查点：**
- [ ] 所有用户输入都有验证
- [ ] 使用 class-validator 声明式验证
- [ ] 验证失败返回清晰的错误信息
- [ ] 服务端验证（不只依赖客户端）

---

## Quick Security Checklist

| 检查项 | 通过 |
|--------|------|
| 无 SQL 拼接 | [ ] |
| 密码用 bcrypt 加密 | [ ] |
| JWT 有过期时间 | [ ] |
| 敏感接口有 auth | [ ] |
| 响应不含密码 | [ ] |
| 日志不含敏感信息 | [ ] |
| 输入有验证 | [ ] |
| 使用 helmet | [ ] |
