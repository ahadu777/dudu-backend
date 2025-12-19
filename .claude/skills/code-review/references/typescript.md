# TypeScript Review Checklist

TypeScript 代码规范检查清单。

## 1. Type Safety

### 避免 any

```typescript
// ❌ BAD: 使用 any
function process(data: any): any {
  return data.value;
}

// ✅ GOOD: 明确类型
function process(data: { value: string }): string {
  return data.value;
}

// ✅ GOOD: 使用泛型
function process<T>(data: T): T {
  return data;
}

// ⚠️ 可接受：unknown（比 any 安全）
function parseJson(text: string): unknown {
  return JSON.parse(text);
}
```

**何时可以用 any：**
- 与第三方库交互且无类型定义
- 临时代码（需要标注 TODO）
- 类型过于复杂且不影响安全

### Null/Undefined 处理

```typescript
// ❌ BAD: 不处理 null
function getName(user: User | null): string {
  return user.name; // 可能 null
}

// ✅ GOOD: 明确处理
function getName(user: User | null): string {
  if (!user) {
    throw new Error('User is required');
  }
  return user.name;
}

// ✅ GOOD: 使用可选链和空值合并
function getName(user: User | null): string {
  return user?.name ?? 'Unknown';
}
```

---

## 2. Async/Await

### 正确的异步处理

```typescript
// ❌ BAD: Floating Promise（未等待的 Promise）
async function saveUser(user: User) {
  userRepository.save(user); // 没有 await！
  logger.info('User saved'); // 可能在保存完成前执行
}

// ✅ GOOD: 正确等待
async function saveUser(user: User) {
  await userRepository.save(user);
  logger.info('User saved');
}

// ❌ BAD: 串行执行独立操作
async function loadData() {
  const users = await userRepository.find();
  const orders = await orderRepository.find(); // 等待 users 完成才开始
  return { users, orders };
}

// ✅ GOOD: 并行执行独立操作
async function loadData() {
  const [users, orders] = await Promise.all([
    userRepository.find(),
    orderRepository.find()
  ]);
  return { users, orders };
}
```

### 错误处理

```typescript
// ❌ BAD: 不处理 rejected promise
async function fetchData() {
  const data = await api.get('/data'); // 可能抛出异常
  return process(data);
}

// ✅ GOOD: try-catch 处理
async function fetchData() {
  try {
    const data = await api.get('/data');
    return process(data);
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    throw new ServiceError('Data fetch failed');
  }
}

// ✅ GOOD: 在调用层处理（让错误冒泡）
async function fetchData() {
  const data = await api.get('/data'); // 异常向上传播
  return process(data);
}
// 调用方：
try {
  await fetchData();
} catch (error) {
  // 统一处理
}
```

---

## 3. Interface & Type

### Interface vs Type

```typescript
// Interface: 用于对象形状，可扩展
interface User {
  id: string;
  name: string;
}

interface Admin extends User {
  permissions: string[];
}

// Type: 用于联合类型、交叉类型、工具类型
type Status = 'active' | 'inactive' | 'pending';
type UserWithOrders = User & { orders: Order[] };
type PartialUser = Partial<User>;
```

**指南：**
- 对象结构用 `interface`
- 联合类型、别名用 `type`
- 可扩展的 API 用 `interface`

### DTO 定义

```typescript
// ✅ GOOD: 清晰的 DTO 定义
import { IsString, IsEmail, IsOptional } from 'class-validator';

class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```

---

## 4. Generics

### 恰当使用泛型

```typescript
// ✅ GOOD: 泛型提供类型安全的复用
async function findById<T>(
  repository: Repository<T>,
  id: string
): Promise<T | null> {
  return repository.findOne({ where: { id } as any });
}

// ✅ GOOD: 约束泛型
interface HasId {
  id: string;
}

function getIds<T extends HasId>(items: T[]): string[] {
  return items.map(item => item.id);
}

// ❌ BAD: 不必要的泛型
function identity<T>(value: T): T {
  return value;
}
// 除非确实需要类型推导，否则直接用具体类型
```

---

## 5. Enums & Constants

### 使用 const enum 或 as const

```typescript
// ⚠️ 普通 enum（编译后有运行时代码）
enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

// ✅ const enum（编译时内联，无运行时代码）
const enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

// ✅ as const（类型安全的对象）
const Status = {
  Active: 'active',
  Inactive: 'inactive'
} as const;

type StatusType = typeof Status[keyof typeof Status];
// 'active' | 'inactive'
```

---

## 6. Imports & Exports

### 导入规范

```typescript
// ✅ GOOD: 分组导入
// 1. Node.js 内置模块
import * as path from 'path';

// 2. 第三方库
import { Router } from 'express';
import { Repository } from 'typeorm';

// 3. 项目内部模块（绝对路径）
import { UserService } from '@/modules/user/service';
import { logger } from '@/utils/logger';

// 4. 相对路径导入
import { UserDto } from './types';
```

### 导出规范

```typescript
// ✅ GOOD: 命名导出（便于重构和 tree-shaking）
export class UserService { }
export function createUser() { }
export const USER_ROLES = ['admin', 'user'] as const;

// ⚠️ 谨慎使用：默认导出
export default class UserService { }
// 重构时更难追踪引用
```

---

## 7. Common Mistakes

### 类型断言滥用

```typescript
// ❌ BAD: 强制断言绕过类型检查
const user = data as User; // 不验证 data 是否真的是 User

// ✅ GOOD: 运行时验证
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

if (isUser(data)) {
  console.log(data.name); // 类型安全
}
```

### 可变性问题

```typescript
// ❌ BAD: 意外修改参数
function addItem(items: string[], newItem: string) {
  items.push(newItem); // 修改了原数组！
  return items;
}

// ✅ GOOD: 返回新数组
function addItem(items: readonly string[], newItem: string): string[] {
  return [...items, newItem];
}
```

---

## Quick TypeScript Checklist

| 检查项 | 通过 |
|--------|------|
| 无 `any`（或有充分理由） | [ ] |
| 无 floating promises | [ ] |
| null/undefined 正确处理 | [ ] |
| 类型断言有验证 | [ ] |
| 泛型使用恰当 | [ ] |
| 接口/类型定义清晰 | [ ] |
| 导入分组有序 | [ ] |
| async/await 正确使用 | [ ] |
