# Express TypeScript API

一个现代化的 Express + TypeScript + MySQL API 项目，集成 Swagger 文档。

## 🚀 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express 5.x
- **ORM**: TypeORM
- **数据库**: MySQL
- **API 文档**: Swagger (swagger-jsdoc + swagger-ui-express)
- **验证**: class-validator + class-transformer
- **开发工具**: ts-node-dev (热重载)
- **代码质量**: ESLint + Prettier

## 📁 项目结构

```
express-typescript-api/
├── src/
│   ├── config/          # 配置文件（数据库、Swagger等）
│   ├── controllers/     # 控制器层
│   ├── dto/            # 数据传输对象
│   ├── middlewares/    # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── services/       # 业务逻辑层
│   ├── utils/          # 工具函数
│   └── server.ts       # 应用入口
├── dist/               # 编译输出目录
├── .env               # 环境变量
└── package.json
```

## 🏗️ 架构设计

### 分层架构

```
Routes (路由层)
    ↓
Controllers (控制器层)
    ↓
Services (业务逻辑层)
    ↓
Models/Repositories (数据访问层)
    ↓
Database (数据库)
```

### 核心特性

- ✅ **TypeScript** - 完整的类型安全
- ✅ **分层架构** - Controller → Service → Repository
- ✅ **自动验证** - 使用 class-validator 进行 DTO 验证
- ✅ **错误处理** - 统一的错误处理机制
- ✅ **API 文档** - Swagger 自动生成
- ✅ **热重载** - 开发环境自动重启
- ✅ **代码规范** - ESLint + Prettier

## 🛠️ 快速开始

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 配置环境变量

创建 `.env` 文件：

\`\`\`env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=express_api

# API Configuration
API_PREFIX=/api/v1

# Swagger
SWAGGER_ENABLED=true
\`\`\`

### 3. 创建数据库

\`\`\`sql
CREATE DATABASE express_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

### 4. 启动开发服务器

\`\`\`bash
npm run dev
\`\`\`

### 5. 访问 API 文档

打开浏览器访问: http://localhost:3000/api-docs

## 📝 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器（热重载） |
| `npm run build` | 编译 TypeScript 为 JavaScript |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查代码 |
| `npm run format` | 使用 Prettier 格式化代码 |

## 🔌 API 端点

### 用户管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/users` | 获取所有用户 |
| GET | `/api/v1/users/:id` | 获取单个用户 |
| POST | `/api/v1/users` | 创建新用户 |
| PUT | `/api/v1/users/:id` | 更新用户 |
| DELETE | `/api/v1/users/:id` | 删除用户（软删除） |

### 健康检查

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 服务健康状态检查 |

## 📊 数据模型示例

### User 模型

\`\`\`typescript
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "age": 30,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## 🔍 请求示例

### 创建用户

\`\`\`bash
curl -X POST http://localhost:3000/api/v1/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "age": 30
  }'
\`\`\`

### 获取所有用户

\`\`\`bash
curl http://localhost:3000/api/v1/users
\`\`\`

## 🧪 数据验证

使用 class-validator 进行自动验证：

\`\`\`typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  age?: number;
}
\`\`\`

## 🛡️ 错误处理

统一的错误响应格式：

\`\`\`json
{
  "success": false,
  "error": "Error message here"
}
\`\`\`

## 📈 后续扩展建议

- [ ] 添加 JWT 认证
- [ ] 添加 Redis 缓存
- [ ] 添加单元测试（Jest）
- [ ] 添加 Docker 支持
- [ ] 添加 CI/CD 配置
- [ ] 添加日志系统（Winston）
- [ ] 添加限流中间件
- [ ] 添加文件上传功能

## 📄 许可证

ISC

