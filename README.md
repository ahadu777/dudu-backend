# Ticketing System with Integration Proof

A production-ready ticketing system with complete integration proof artifacts that solve the "last mile" gap between working APIs and consumer integration.

## 🎯 Integration Proof Solution

**Problem:** Even with working endpoints and specs, consumers ask: *"Which call first? What payloads work? How do I reproduce the full story?"*

**Solution:** Story-level runnable artifacts that prove integration works with real data.

**🤖 NEW: Complete AI Autonomy** - Fresh AI can now handle raw user stories → complete implementation autonomously using systematic templates and validation.

**🚀 NEW: PR Codespace Automation** - Every PR automatically gets a Codespace environment for easy testing!

**🧪 Fresh PR Test** - Testing the PR Codespace workflow with a brand new pull request.

**✅ Testing PR Codespace Workflow** - This PR tests the automatic Codespace creation workflow.

**🚂 Railway Preview Environment Test** - Testing automatic Railway preview deployment for PRs.

**🎯 Railway PR Preview** - Every PR automatically gets a live preview environment on Railway!

### Quick Start for Integration
```bash
# 1. Test complete user flows
npm run build && PORT=8080 npm start &
cat docs/integration/US-001-runbook.md  # Copy-paste complete flow

# 2. Validate all stories work
npm run test:e2e

# 3. Try TypeScript SDK examples
npm run example:us001
npm run example:all

# 4. Check accurate progress
node scripts/success-dashboard.js

# 5. Test AI autonomy capability
npm run validate:autonomy
```

### Integration Artifacts
- **📖 Story Runbooks** (`docs/integration/`) - Copy-paste commands for each user story
- **🧪 Newman E2E** (`npm run test:e2e`) - Automated validation of complete flows
- **💻 TypeScript Examples** (`examples/`) - Frontend integration patterns
- **📊 Accurate Dashboard** - True completion tracking (50% not 47%)

**Read [`docs/INTEGRATION_PROOF.md`](docs/INTEGRATION_PROOF.md) for complete context.**

---

# Express TypeScript API

一个企业级的 Express + TypeScript + MySQL REST API 项目。

## ✨ 特性

- 🚀 Express 5.x + TypeScript 5.x
- 🗄️ TypeORM + MySQL 数据库（支持双模式）
- 🎯 Mock-First 开发模式（快速开发，1-3ms 响应）
- 🔐 多种认证方式（JWT、WeChat 小程序）
- 📝 Winston 结构化日志系统
- 📚 OpenAPI 3.0 + Swagger UI 文档
- ✅ 自动数据验证 + 分页中间件
- 🛡️ 安全中间件（Helmet + CORS）
- 🏗️ 模块化架构（领域驱动设计）
- 🧪 完整的集成测试（Newman E2E）
- 📖 Story-level 运行手册
- 🔄 自动数据库迁移

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
npm run build && npm start

# 或者使用数据库模式
USE_DATABASE=true npm start
```

服务器将在 http://localhost:8080 启动

### API 文档

打开浏览器访问: http://localhost:8080/docs

## 📁 项目结构

```
src/
├── index.ts              # 应用启动入口
├── app.ts                # Express 应用组装
├── config/               # 配置文件（数据库、环境变量、Swagger）
├── core/                 # 核心功能（Mock Store、数据源配置）
├── middlewares/          # 中间件（认证、日志、错误处理、分页）
├── migrations/           # 数据库迁移文件
├── models/               # 全局数据模型（User、Operator 等）
├── modules/              # 功能模块（模块化架构）
│   ├── auth/            # 认证模块（WeChat、JWT）
│   ├── tickets/         # 票务管理
│   ├── orders/          # 订单管理
│   ├── ota/             # OTA 平台集成
│   ├── venue/           # 场馆运营
│   ├── miniprogram/     # 小程序接口
│   ├── operators/       # 操作员管理
│   ├── users/           # 用户管理
│   ├── payments/        # 支付处理
│   ├── pricing/         # 定价引擎
│   ├── qr-generation/   # 二维码生成
│   ├── reservations/    # 预订管理
│   ├── travel/          # 旅游套餐
│   └── ...              # 其他业务模块
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数（日志、响应、加密）

docs/
├── prd/                 # 产品需求文档
├── stories/             # 用户故事
├── cards/               # 技术卡片（API 规格）
├── integration/         # 集成运行手册
├── bugs/                # Bug 追踪
└── reference/           # 参考文档

每个功能模块 (modules/*) 采用领域驱动设计：
module/
├── router.ts            # 路由定义
├── controller.ts        # 控制器
├── service.ts           # 业务逻辑
└── domain/              # 领域层
    ├── *.entity.ts      # 数据实体
    ├── *.repository.ts  # 数据仓库
    └── *.dto.ts         # 数据传输对象
```

## 📝 可用命令

```bash
# 开发和构建
npm run build              # 编译 TypeScript
npm start                  # 启动服务器（Mock 模式，默认）
USE_DATABASE=true npm start # 启动服务器（数据库模式）

# 测试
npm run test:e2e          # 运行 Newman E2E 测试
npx newman run postman/xxx.postman_collection.json  # 运行特定测试集

# 集成示例
npm run example:us001     # 运行 US-001 示例
npm run example:all       # 运行所有示例
cat docs/integration/US-XXX-runbook.md  # 查看集成运行手册

# 数据库
npm run typeorm migration:generate  # 生成迁移文件
npm run typeorm migration:run       # 运行迁移

# 代码质量
npm run lint              # 代码检查
npm run format            # 代码格式化
```

## 🛠️ 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express 5.x
- **ORM**: TypeORM
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **验证**: class-validator
- **日志**: Winston
- **文档**: Swagger



