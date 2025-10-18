# Express TypeScript API

一个企业级的 Express + TypeScript + MySQL REST API 项目。

## ✨ 特性

- 🚀 Express 5.x + TypeScript 5.x
- 🗄️ TypeORM + MySQL 数据库
- 🔐 JWT 认证系统
- 📝 Winston 日志系统
- 📚 Swagger API 文档
- ✅ 自动数据验证
- 🛡️ 安全中间件（Helmet + CORS）
- 🔥 热重载开发环境

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

### 安装运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改数据库配置

# 3. 创建数据库
mysql -u root -p
CREATE DATABASE express_api CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

# 4. 启动开发服务器
npm run dev
```

服务器将在 http://localhost:3000 启动

### API 文档

打开浏览器访问: http://localhost:3000/api-docs

## 📁 项目结构

```
src/
├── index.ts              # 应用启动入口
├── app.ts                # Express 应用组装
├── config/               # 配置文件（数据库、环境变量、Swagger）
├── controllers/          # 控制器层
├── services/             # 业务逻辑层
├── models/               # 数据模型层
├── routes/               # 路由层
├── middlewares/          # 中间件（认证、日志、错误处理）
├── dto/                  # 数据传输对象
└── utils/                # 工具函数（日志、响应）
```

## 📝 可用命令

```bash
npm run dev      # 启动开发服务器（热重载）
npm run build    # 编译 TypeScript
npm start        # 启动生产服务器
npm run lint     # 代码检查
npm run format   # 代码格式化
```

## 🔌 主要 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api-docs` | API 文档 |
| GET | `/api/v1/users` | 获取所有用户 |
| GET | `/api/v1/users/:id` | 获取单个用户 |
| POST | `/api/v1/users` | 创建用户 |
| PUT | `/api/v1/users/:id` | 更新用户 |
| DELETE | `/api/v1/users/:id` | 删除用户 |

## 📚 文档

- [快速开始指南](./QUICKSTART.md) - 5分钟快速上手
- [API 使用示例](./API_EXAMPLES.md) - 完整的 API 调用示例
- [更新日志](./CHANGELOG.md) - 版本更新记录

## 🔒 安全提示

⚠️ **生产环境必须修改：**

1. 修改 JWT 密钥（`.env` 中的 `JWT_SECRET`）
2. 关闭数据库自动同步（`database.ts` 中的 `synchronize: false`）
3. 配置 CORS 白名单
4. 设置 `NODE_ENV=production`

## 🛠️ 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express 5.x
- **ORM**: TypeORM
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **验证**: class-validator
- **日志**: Winston
- **文档**: Swagger

## 📄 许可证

ISC

---

**需要帮助？** 查看 [快速开始指南](./QUICKSTART.md) 或 [API 示例](./API_EXAMPLES.md)
