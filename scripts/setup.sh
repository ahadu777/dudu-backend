#!/bin/bash

echo "🚀 Express TypeScript API 项目初始化"
echo "===================================="

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 2. 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

# 3. 复制环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建，请修改数据库配置"
else
    echo "⚠️  .env 文件已存在"
fi

# 4. 安装依赖
echo "📦 安装依赖..."
npm install

# 5. 编译 TypeScript
echo "🔨 编译 TypeScript..."
npm run build

echo ""
echo "✅ 初始化完成！"
echo ""
echo "📝 接下来的步骤："
echo "1. 修改 .env 文件中的数据库配置"
echo "2. 创建 MySQL 数据库: CREATE DATABASE express_api;"
echo "3. 运行开发服务器: npm run dev"
echo "4. 访问 API 文档: http://localhost:3000/api-docs"

