# Context Recovery Protocol - 上下文恢复协议

## 概述

新会话启动时自动检查进行中的工作，恢复上下文连续性，避免重复劳动。

---

## 触发时机

| 场景 | 是否执行恢复检查 |
|------|-----------------|
| 新会话开始 | ✅ 是 |
| 用户说"继续"/"上次" | ✅ 是 |
| 用户指定具体任务 | ⚠️ 快速检查后执行指定任务 |
| 用户说"新任务" | ❌ 跳过恢复 |

---

## 恢复检查清单

### 1. 检查进行中的 Card

```bash
# 从 Card 索引检查
cat docs/cards/_index.yaml | grep -A 10 "in_progress:"

# 或直接搜索 Card 文件
grep -l "status:.*In Progress" docs/cards/*.md
```

### 2. 检查未提交的变更

```bash
# Git 工作区状态
git status --short docs/ src/

# 最近修改的文件
ls -lt docs/cards/*.md | head -5
```

### 3. 检查最近的提交

```bash
# 最近 5 个提交
git log --oneline -5

# 检查是否有未推送的提交
git status -sb | head -1
```

---

## 恢复发现时的处理

### 发现 In Progress 任务

```markdown
## 上下文恢复

我发现以下未完成的工作：

| 类型 | 文件 | 状态 | 最后更新 |
|------|------|------|----------|
| Card | miniprogram-order.md | In Progress | 2025-12-20 |

**相关内容：**
- Story: US-010A
- 涉及: /miniprogram/orders 端点

---

请选择：
1. **继续这个任务** - 我将加载相关上下文
2. **开始新任务** - 暂时搁置当前工作
3. **查看详情** - 显示更多信息后决定
```

### 发现未提交变更

```markdown
## 上下文恢复

我发现以下未提交的变更：

```
M  src/modules/orders/service.ts
M  docs/cards/order-create.md
?? src/modules/orders/cancel.ts
```

这些变更可能与上次任务相关。

请选择：
1. **继续完成** - 我将检查变更内容
2. **开始新任务** - 保留变更，开始新工作
3. **查看变更** - 显示 diff 后决定
```

---

## 恢复后的工作流

### 继续未完成任务

1. **加载 Card 内容**
   ```bash
   cat docs/cards/[in-progress-card].md
   ```

2. **检查 Step 3 完成情况**
   - 测试是否通过？
   - Runbook 是否创建？
   - 文档是否一致？

3. **确定断点位置**
   - 代码是否完成？→ 进入 Step 2.5 Code Review
   - 代码未完成？→ 继续 Step 2
   - 测试失败？→ 修复后重测

4. **继续执行**

### 开始新任务

1. 记录当前进行中的工作（如有）
2. 正常进入 Step 0 Intent Analysis
3. 不影响已有的 In Progress 状态

---

## 快速恢复命令

```bash
# 一键检查项目状态
echo "=== In Progress Cards ===" && \
grep -l "status:.*In Progress" docs/cards/*.md 2>/dev/null || echo "无"

echo -e "\n=== 未提交变更 ===" && \
git status --short docs/ src/ 2>/dev/null || echo "无"

echo -e "\n=== 最近提交 ===" && \
git log --oneline -3 2>/dev/null
```

---

## 无需恢复的场景

以下情况直接开始新任务：

1. **Card 索引中 in_progress 为空**
2. **无未提交的代码变更**
3. **用户明确开始新任务**
4. **用户提供了完整的新需求**

---

## 与 /ai-sitemap 集成

对于更复杂的上下文恢复，可以调用：

```bash
curl http://localhost:8080/ai-sitemap
```

获取完整的项目状态，包括：
- 所有 PRD/Story/Card 的状态
- 测试覆盖率
- 最近的变更

---

## 恢复失败处理

如果无法确定上下文：

```markdown
## 上下文不明确

我发现了一些进行中的工作，但无法确定应该继续哪个：

1. Card: order-create.md (In Progress)
2. Card: payment-webhook.md (In Progress)
3. 未提交: src/modules/xxx/

请告诉我：
- 您想继续哪个任务？
- 或者描述您今天想做什么？
```
