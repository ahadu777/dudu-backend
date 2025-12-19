# AI 工作流使用指南

> **快速参考**：不同场景下如何与AI高效协作
>
> **完整文档**：[CLAUDE.md](../CLAUDE.md) | **详细参考**：[docs/reference/](./reference/)

---

## 🎯 快速导航

**我想做什么**：
- [创建新功能](#1-创建新功能) - "我想让用户能够..."
- [修改现有API](#2-修改现有api) - "需要修改某个接口..."
- [调试问题](#3-调试问题) - "为什么报错..."
- [查询信息](#4-查询信息) - "当前有哪些..."
- [运行测试](#5-运行测试) - "测试覆盖率如何..."
- [清理维护](#6-清理维护) - "整理过时文件..."

**快速命令**：
```bash
grep "status:" docs/cards/*.md       # 查看进度
npm start                             # 启动服务
npx newman run [集合].json           # 运行测试
curl http://localhost:8080/endpoint  # 测试端点
```

---

## ⚡ 重要：无脚本原则

**本项目采用简单命令优先策略，不创建不必要的脚本。**

**为什么？**
- ✅ 简单命令更直观、更快
- ✅ 零维护成本
- ✅ 易于理解和修改
- ✅ Newman已处理所有测试需求

**只保留必要的基础设施脚本**：
```bash
scripts/
├── setup.sh                        # 项目初始化
├── init-db.sql                     # 数据库初始化
├── run-migration.js                # 迁移工具
└── migrate-*.sql                   # 历史迁移
```

**其他所有功能用简单命令**：
```bash
# ✅ 查看进度
grep "status:" docs/cards/*.md

# ✅ 测试功能
npx newman run postman/xxx.json

# ✅ 检查端点
curl http://localhost:8080/endpoint

# ✅ 搜索文档
grep -ri "关键词" docs/
```

**如果AI提议创建脚本，你可以说**：
- "不要脚本，用简单命令"
- "KISS原则"
- "直接用grep/curl"

---

## 📋 场景与提问方式

### 1. 创建新功能

**场景**：你有一个新的业务需求，想让用户能够完成某个操作

**✅ 推荐提问**：
```
"我想让用户能够导出订单数据为Excel"
"需要实现一个会员积分系统"
"OTA合作伙伴需要查看销售统计报表"
"用户希望能够取消订单并退款"
```

**❌ 不推荐**：
```
"创建一个导出API"  ← 太技术化，应该说用户需求
"写个接口"         ← 缺少业务背景
```

**AI会做什么**：
1. 🔍 检查是否已有类似功能（避免重复）
2. 📊 判断需要创建PRD/Story/Card的层级
3. 💬 如果有类似功能，会问你："合并？扩展？还是独立？"
4. 📝 生成完整的文档（PRD/Story/Card）
5. 💻 实现代码（src/modules/）
6. 🧪 生成Newman测试集合
7. ✅ 创建集成验证文档

**示例对话**：
```
你：我想让运营人员能够批量导入票务数据

AI：🔍 执行三层判断...

    【第1层：PRD判断】
    ❓ 是否新产品领域？
    ✅ 不是。票务导入属于现有的票务平台 (PRD-001)

    【第2层：Story判断】
    ❓ 是否新用户能力？
    🔍 搜索现有功能：
       - US-001: 票据发放 ✓
       - US-012: OTA批量生成票据 ✓
       - 批量导入票务数据 ✗ (未找到)

    ✅ 是新用户能力 → 建议创建 US-015: Batch Ticket Import
       归属: PRD-001 (Cruise Ticketing Platform)

    【第3层：Card判断】
    需要实现的技术组件：
    1. Card: batch-import-api (上传Excel/CSV)
    2. Card: import-validation (数据验证)
    3. Card: import-processing (异步处理)

    是否继续？

你：继续

AI：✅ 开始实现...
    1. 更新 PRD-001 (添加 US-015 到 related_stories)
    2. 创建 US-015 Story文档
    3. 创建 3个 Cards
    4. 实现代码 src/modules/ticket/
    5. 生成 Newman测试
    6. 更新 _index.yaml
```

**对比：需要创建新PRD的例子**：
```
你：我想做一个会员积分系统

AI：🔍 执行三层判断...

    【第1层：PRD判断】
    ❓ 是否新产品领域？
    🔍 检查现有PRD：
       - PRD-001: 票务平台 (购票、核销)
       - PRD-002: OTA集成 (B2B分销)
       - PRD-003: 场馆运营 (扫码管理)
       - 会员积分系统 ✗ (未找到)

    ✅ 是新产品领域！
       理由：
       - 新的业务模式（积分奖励、兑换）
       - 新的客户细分（会员等级）
       - 独立的成功指标（会员活跃度、积分消耗率）

    → 建议创建 PRD-004: Loyalty Program (会员忠诚度计划)

    【第2层：Story判断】
    PRD-004 需要的核心用户能力：
    - US-016: 用户赚取积分
    - US-017: 用户兑换积分
    - US-018: 查看积分历史
    - US-019: 会员等级升级

    【第3层：Card判断】
    首个Story (US-016) 需要的Cards：
    - point-earn-api (积分获取规则)
    - point-transaction-log (交易记录)
    - point-balance-query (余额查询)

    是否继续创建完整的会员积分系统？

你：继续

AI：✅ 开始实现...
    1. 创建 PRD-004-loyalty-program.md
    2. 创建 4个 Stories (US-016 ~ US-019)
    3. 创建对应的 Cards
    4. 新建模块 src/modules/loyalty/
    5. 生成 Newman测试集合
    6. 更新所有索引文件
```

---

### 2. 修改现有API

**场景**：需要给现有API增加字段、修改逻辑、重命名字段等

**✅ 推荐提问**：
```
"订单创建API需要添加一个备注字段"
"channel_id需要改名为partner_id"
"订单总价计算现在要包含税费和运费"
"分页参数需要改为必填"
```

**AI会做什么**：
1. 🏷️ 分类变更类型：
   - **非破坏性**（添加可选字段）→ 直接更新
   - **破坏性**（删除/重命名字段）→ ⚠️ 警告 + 提供迁移方案
   - **业务逻辑**（计算方式改变）→ 更新PRD + 测试

2. 📄 更新相应文档层级：
   - Card（API规格）
   - Story（如果影响用户体验）
   - PRD（如果业务规则变化）

3. 🧪 更新测试用例

4. ✅ 验证向后兼容性

**示例对话（破坏性变更）**：
```
你：channel_id需要改名为partner_id

AI：🚨 这是一个破坏性变更！现有客户端会失败。

    提供三种方案：
    1️⃣ 支持双字段过渡（推荐）- 保留channel_id 6个月
    2️⃣ 创建v2端点 - POST /v2/orders
    3️⃣ 强制迁移 - 需通知所有客户端

    你选择哪种方案？

你：选择方案1，过渡6个月

AI：✅ 好的，我会：
    1. 在Card中添加版本历史
    2. 代码同时支持channel_id和partner_id
    3. 记录废弃日期：2026-05-19
    4. 更新相关测试
```

---

### 3. 调试问题

**场景**：系统报错、功能不工作、测试失败等

**✅ 推荐提问**：
```
"为什么订单创建接口返回500错误？"
"数据库模式下OTA分析API报错，帮我调试"
"扫码核销功能不工作"
"Newman测试失败了，错误信息是[粘贴错误]"
```

**重要**：直接粘贴完整的错误信息！

**AI会做什么（Reality Check）**：
```bash
# 1. 检查服务是否运行
curl http://localhost:8080/healthz

# 2. 查看实际代码
grep -r "import.*Service" src/modules/[name]/

# 3. 验证数据库schema
SHOW COLUMNS FROM [table_name];

# 4. 对比文档与实际
diff <(文档定义) <(实际运行)

# 5. 定位问题并修复
```

**示例对话**：
```
你：GET /api/ota/analytics/revenue 返回空数组，但数据库里有数据

AI：🔍 Reality Check - 让我诊断...

    ✅ 服务运行正常
    ✅ 数据库连接成功
    ⚠️ 发现问题！

    错误：SQL查询使用了 t.status = 'REDEEMED'
    但数据库ENUM只有: 'PRE_GENERATED','ACTIVE','USED','EXPIRED','CANCELLED'

    修复：将 'REDEEMED' 改为 'USED'

    是否应用修复？

你：是

AI：✅ 已修复，测试结果：返回了23条数据
```

---

### 4. 查询信息

**场景**：了解项目状态、查找已有功能、学习使用方法

**✅ 推荐提问**：
```
"当前项目有哪些已实现的故事？"
"OTA集成的API有哪些？"
"如何测试Newman集合？"
"分页功能是怎么实现的？我想复用"
"US-012的验收标准是什么？"
"PRD-001包含哪些功能？"
```

**AI会做什么**：
```bash
# 搜索文档
grep -r "关键词" docs/

# 查找代码
find src/ -name "*关键词*"

# 展示相关内容
cat docs/stories/US-012.md

# 提供示例命令
```

**示例对话**：
```
你：项目里有没有现成的分页实现？我想复用

AI：✅ 找到了！有现成的分页实现：

    位置：src/modules/ota/router.ts (行 757-788)

    验证逻辑：
    ```typescript
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(422).json({ error: 'INVALID_PARAMETER' });
    }
    ```

    响应格式：
    ```json
    {
      "total": 1000,
      "page": 1,
      "page_size": 100,
      "items": [...]
    }
    ```

    需要我帮你在[某个模块]实现相同的分页吗？
```

---

### 5. 运行测试

**场景**：执行测试、检查覆盖率、生成报告

#### 5.1 运行特定测试

**✅ 推荐提问**：
```
"运行US-012的所有测试"
"测试订单创建API"
"验证数据库模式下的测试是否通过"
"运行所有Newman集合"
```

**AI会执行**：
```bash
# 启动服务
npm start

# 运行指定测试
npx newman run postman/auto-generated/us-012-complete-coverage.json

# 或运行所有测试
npm run test:e2e
```

#### 5.2 检查测试覆盖率

**✅ 推荐提问**：
```
"检查PRD-001的测试覆盖率"
"US-012的验收标准都测试了吗？"
"生成完整的测试覆盖率报告"
"哪些Story还没有测试？"
"order-create卡片的测试完整吗？"
```

**AI会输出**：
```
📊 US-012 测试覆盖率分析

✅ 已覆盖 (8/10 = 80%):
  ✅ OTA可以预留库存
  ✅ 批量生成票据
  ✅ 支付通知触发发票
  ...

❌ 缺失覆盖 (2/10 = 20%):
  ❌ 多合作伙伴隔离测试
  ❌ 批次过期逻辑验证

🔧 建议：补充2个缺失场景的测试
```

**详细提问方式**：见[测试覆盖率专题](#测试覆盖率专题)

---

### 6. 清理维护

**场景**：清理过时文件、整理项目结构、修复问题

**✅ 推荐提问**：
```
"清理postman目录"
"检查并删除过时的测试文件"
"整理postman文件结构"
"找出所有临时/调试文件"
"修复所有失败的Newman测试"
```

**AI会做什么**：
1. 🔍 扫描所有文件
2. 📊 识别过时/有问题/重复的文件
3. 📋 生成诊断报告
4. 💬 询问你是否清理
5. 🧹 执行清理操作
6. ✅ 整理目录结构

**示例输出**：
```
🔍 Postman文件诊断

❌ 过时文件 (3个):
  - old/channel-based-inventory.json (Card已废弃)
  - temp/debug-ota-issue.json (临时调试)
  - backup/order-create-backup.json (重复)

⚠️ 有问题 (2个):
  - payment-webhook-tests.json (5/5测试失败)
  - us-010-deeptravel.json (环境变量缺失)

🔧 建议：
  - 删除3个过时文件
  - 修复2个问题文件

是否执行？(y/n)
```

---

## 🎓 进阶技巧

### 提问技巧

**✅ 好的提问**：
1. **描述业务场景**，而不是技术实现
   - 好："OTA合作伙伴需要看到销售统计"
   - 差："创建一个聚合查询API"

2. **提供上下文**，特别是错误信息
   - 好："数据库模式下，调用GET /api/ota/analytics返回空数组，错误日志：[粘贴]"
   - 差："API不工作"

3. **明确意图**
   - 查询："我想了解分页实现"
   - 实现："需要添加分页功能"

4. **一次一个主要问题**
   - 好："订单列表需要添加分页"
   - 差："订单列表要分页、导出、还有修复排序bug"

---

### 工作流决策树

```
你的需求是什么？
│
├─ 新的用户功能
│  └─ 说："我想让用户能够..."
│     → AI创建Story → Cards → Code → Tests
│
├─ 修改现有API
│  └─ 说："XXX API需要..."
│     → AI判断破坏性 → 提供方案 → 更新文档+代码+测试
│
├─ 出错/不工作
│  └─ 说："为什么...报错" + 粘贴错误
│     → AI执行Reality Check → 诊断 → 修复
│
├─ 查询信息
│  └─ 说："当前/如何/有哪些..."
│     → AI搜索文档+代码 → 展示结果 → 提供示例
│
├─ 运行测试
│  └─ 说："运行测试" 或 "检查覆盖率"
│     → AI执行Newman → 分析结果 → 生成报告
│
└─ 清理维护
   └─ 说："清理..." 或 "整理..."
      → AI扫描 → 诊断 → 建议 → 执行
```

---

## 📚 测试覆盖率专题

### 快速提问

| 你想检查... | 提问模板 |
|------------|---------|
| 单个PRD | "检查PRD-001的测试覆盖率" |
| 单个Story | "US-012的测试覆盖率如何？" |
| 单个Card | "order-create的测试完整吗？" |
| 整个项目 | "生成完整的测试覆盖率报告" |
| 特定场景 | "多合作伙伴隔离的测试够不够？" |
| 找缺口 | "哪些Story还没测试？" |

### AI输出示例

**你说**："检查PRD-001的测试覆盖率"

**AI输出**：
```
📊 PRD-001: Cruise Ticketing Platform

✅ 已覆盖功能 (4/5 = 80%):
  ✅ Dynamic Package Pricing (定价规则)
  ✅ Package Component System (组件系统)
  ✅ QR-Based Digital Tickets (二维码)
  ✅ Order Creation Flow (订单流程)

❌ 缺失功能 (1/5 = 20%):
  ❌ Multi-channel Inventory (多渠道库存)
     建议：创建inventory-management-tests.json

📈 总体覆盖率: 80%
```

**补充测试**：
```
"PRD-001缺失的多渠道库存测试帮我生成"

→ AI会生成完整的Newman测试用例
```

---

## ⚡ 常用命令速查

### 开发命令
```bash
# 启动服务
npm start                    # Mock模式（默认）
USE_DATABASE=true npm start  # 数据库模式

# 构建
npm run build

# 健康检查
curl http://localhost:8080/healthz
```

### 测试命令
```bash
# 运行单个测试集合
npx newman run postman/auto-generated/us-012-complete-coverage.json

# 运行所有E2E测试
npm run test:e2e

# 查看测试文件
ls postman/auto-generated/
find postman/ -name "*.json" | grep -i "test"
```

### 项目状态命令
```bash
# 查看卡片状态
grep "^status:" docs/cards/*.md                    # 所有卡片状态
grep "status: Done" docs/cards/*.md | wc -l        # 已完成数量
grep "status: In Progress" docs/cards/*.md         # 进行中的卡片
grep "status: Ready" docs/cards/*.md               # 待开始的卡片

# 查看Bug
grep "status: Open" docs/bugs/_index.yaml
grep "severity: Critical\|High" docs/bugs/_index.yaml

# 查看Story
cat docs/stories/_index.yaml
grep "related_stories" docs/prd/*.md
```

---

## 🎯 实战案例

### 案例1：创建新功能

**需求**："我想让用户能够导出订单数据"

**完整对话**：
```
你：我想让用户能够导出订单数据为Excel

AI：🔍 搜索现有功能...
    没有找到订单导出功能。

    这需要创建新Story：US-015: Order Data Export

    技术方案：
    - Card 1: order-export-api (生成导出任务)
    - Card 2: export-job-processor (异步处理)
    - Card 3: file-download-api (下载文件)

    是否继续？

你：继续

AI：✅ 创建 US-015...
    ✅ 创建 Card: order-export-api...
    ✅ 实现代码 src/modules/order-export/...
    ✅ 生成测试 us-015-complete-coverage.json...
    ✅ 更新文档 docs/stories/_index.yaml...

    完成！测试一下：
    curl -X POST http://localhost:8080/api/orders/export

你：测试通过！
```

---

### 案例2：调试SQL错误

**问题**："OTA收入分析API返回空数组"

**完整对话**：
```
你：GET /api/ota/analytics/revenue 返回空数组，但数据库有数据

AI：🔍 Reality Check...

    ✅ 服务运行中
    ✅ 数据库连接正常
    ✅ 查看SQL查询...

    ⚠️ 发现问题！

    src/modules/ota/domain/ota.repository.ts:234
    SQL: t.status = 'REDEEMED'

    但数据库ENUM值是：
    'PRE_GENERATED', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'

    没有'REDEEMED'！应该用'USED'

    是否修复？

你：是

AI：✅ 已修复
    ✅ 测试通过，返回23条数据
    ✅ 更新了相关测试用例
```

---

### 案例3：检查测试覆盖率

**需求**："检查US-012的测试覆盖情况"

**完整对话**：
```
你：检查US-012的测试覆盖率

AI：📊 US-012测试覆盖率分析

    Story: OTA Platform Integration

    ✅ 已覆盖 (8/10 = 80%):
      ✅ OTA库存预留
      ✅ 批量生成票据
      ✅ 支付触发票据激活
      ✅ QR码扫描核销
      ✅ API认证
      ✅ 渠道隔离
      ✅ 批次查询分页
      ✅ 定价计算

    ❌ 缺失 (2/10 = 20%):
      ❌ 多合作伙伴数据隔离
      ❌ 批次过期逻辑

    📈 总体: 80%

    需要我补充缺失的测试吗？

你：是的，补充多合作伙伴隔离测试

AI：✅ 生成测试用例...
    ✅ 添加到 us-012-complete-coverage.json
    ✅ 测试通过！

    现在覆盖率: 90% (9/10)
```

---

## 📖 相关文档

- **完整工作流**：[CLAUDE.md](../CLAUDE.md)
- **故事去重指南**：[docs/reference/DUPLICATE-PREVENTION.md](./reference/DUPLICATE-PREVENTION.md)
- **文档层级决策**：[docs/reference/DOCUMENT-LAYER-DECISION.md](./reference/DOCUMENT-LAYER-DECISION.md)
- **API变更管理**：[docs/reference/API-CHANGE-MANAGEMENT.md](./reference/API-CHANGE-MANAGEMENT.md)
- **案例研究**：[docs/cases/](./cases/)

---

## ❓ 常见问题

### Q: AI会自动创建重复的功能吗？

**A**: 不会。AI在创建任何新Story之前，会强制执行去重检查：
- 搜索PRD/Story/Card/Code
- 中英文自动翻译搜索
- 相似度>70%时询问你："合并？扩展？独立？"

### Q: 如果我不确定应该问什么怎么办？

**A**: 直接描述你的问题或需求，AI会帮你归类：
```
"我有个需求，但不知道是新Story还是修改Card：
 用户希望订单列表能筛选日期范围"

AI会分析并建议正确的做法
```

### Q: AI会修改我的代码吗？

**A**: 只在你明确同意后才会修改：
- 查询/分析 → 不需要确认
- 创建新文件 → AI自主决定
- 修改现有代码 → 询问你
- 破坏性变更 → 强制询问 + 提供方案

### Q: 测试失败了怎么办？

**A**: 直接告诉AI，粘贴错误信息：
```
"Newman测试失败了，错误：[粘贴完整错误]"

AI会：
1. 分析错误原因
2. 定位问题代码
3. 提供修复方案
4. 更新测试用例
```

### Q: 如何知道项目当前状态？

**A**: 使用简单查询命令：
```bash
grep "^status:" docs/cards/*.md           # 查看所有卡片状态
grep "status: Done" docs/cards/*.md | wc -l  # 已完成数量
grep "status: Open" docs/bugs/*.yaml      # 未解决Bug
ls postman/auto-generated/                # 测试文件列表
```

或直接问AI：
```
"当前项目进度如何？"
"有哪些Story已经完成？"
"显示所有卡片状态"
```

---

## 🚀 快速开始

**第一次使用**：
1. 熟悉本指南（5分钟）
2. 尝试查询："当前有哪些已实现的Story？"
3. 尝试测试："运行US-001的测试"
4. 准备开发："我想让用户能够[你的需求]"

**日常使用**：
- 有需求 → 描述业务场景
- 遇到错误 → 粘贴错误信息
- 不确定 → 直接问AI

**记住**：AI会自动处理技术细节，你只需关注业务需求 ✨

---

**最后更新**: 2025-11-20
**维护者**: AI Development Team
**重要变更**: 移除所有非必要脚本，采用简单命令优先策略
**反馈**: 直接在对话中提出问题和建议
