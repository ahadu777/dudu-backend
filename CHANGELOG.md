# 更新日志

## [1.0.0] - 2024-01-01

### 新增
- ✨ 初始化 Express + TypeScript 项目
- ✨ 集成 TypeORM + MySQL 数据库支持
- ✨ 集成 Swagger API 文档
- ✨ 实现用户 CRUD 功能
- ✨ 添加请求验证（class-validator）
- ✨ 统一错误处理机制
- ✨ 统一响应格式
- ✨ 添加热重载开发环境
- ✨ 配置 ESLint + Prettier 代码规范
- ✨ 添加安全中间件（helmet、cors）
- ✨ 添加日志中间件（morgan）
- ✨ 添加压缩中间件（compression）

### 架构
- 🏗️ 采用分层架构：Routes → Controllers → Services → Models
- 🏗️ 使用 DTO 模式进行数据传输
- 🏗️ 使用 Repository 模式进行数据访问
- 🏗️ 使用依赖注入模式

### 文档
- 📚 完整的 README 文档
- 📚 API 文档（Swagger）
- 📚 数据库初始化脚本
- 📚 项目设置脚本

