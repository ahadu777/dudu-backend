---
name: code-review
description: |
  代码审查 skill。在以下场景自动触发：
  (1) 开发完成后、测试前 (ai-workflow Step 2.5)
  (2) 用户请求 "review code" / "审查代码" / "check my code"
  (3) PR 创建前
  触发方式：自动或 /code-review 命令
---

# Code Review Skill

## Overview

代码审查是确保代码质量的关键步骤。本 skill 提供结构化的审查流程，在开发完成后自动触发。

## Review Process

### Phase 1: Quick Scan (快速扫描)

**目标：30 秒内识别阻塞性问题**

```bash
# 1. 编译检查
npm run build

# 2. 改动范围
git diff --stat

# 3. 明显问题扫描
grep -r "TODO\|FIXME\|console.log\|debugger" src/
```

**Quick Scan 检查项：**
- [ ] 代码能编译通过
- [ ] 改动范围与任务匹配（没有无关改动）
- [ ] 无调试代码残留（console.log, debugger）

如果 Quick Scan 失败 → 立即返回修复，不进入 Deep Review

---

### Phase 2: Deep Review (深度审查)

加载对应的 reference 文档进行详细检查：

#### 2.1 Card Spec 一致性
> 参考：`references/checklist.md`

- [ ] API 路径、HTTP 方法是否匹配 Card 定义
- [ ] 请求参数（path, query, body）是否完整
- [ ] 响应结构是否符合 Card 规范
- [ ] 错误码是否按 Card 定义
- [ ] 边界条件是否覆盖

#### 2.2 代码质量
> 参考：`references/checklist.md`

- [ ] 命名清晰（变量名、函数名能表达意图）
- [ ] 函数职责单一（< 50 行，做一件事）
- [ ] 无重复代码（DRY - Don't Repeat Yourself）
- [ ] 无过度工程（YAGNI - You Aren't Gonna Need It）
- [ ] 适当的注释（解释 why，不是 what）

#### 2.3 TypeScript 规范
> 参考：`references/typescript.md`

- [ ] 无 `any` 类型（除非有充分理由）
- [ ] 正确使用 async/await（无 floating promises）
- [ ] 类型定义完整（接口、DTO）
- [ ] 泛型使用恰当

#### 2.4 安全检查
> 参考：`references/security.md`

- [ ] SQL 注入防护（使用 TypeORM 参数化查询）
- [ ] XSS 防护（输出转义）
- [ ] 认证/授权（敏感接口有 auth 中间件）
- [ ] 敏感数据处理（不记录密码、token 到日志）
- [ ] 输入验证（使用 class-validator）

#### 2.5 错误处理

- [ ] 关键操作有 try-catch
- [ ] 错误信息对用户友好（不暴露内部细节）
- [ ] 日志记录关键信息（便于排查）
- [ ] 错误正确传播（不吞掉异常）

#### 2.6 项目特定规则
> 参考：`references/project.md`

- [ ] 遵循 Repository 模式（优先 TypeORM Repository/QueryBuilder）
- [ ] Entity 放置正确（共享 → `src/models/`，专属 → `src/modules/{name}/domain/`）
- [ ] 新路由注册到 `src/modules/index.ts`
- [ ] 遵循模块分层（Router → Service → Repository）

---

### Phase 3: Report Generation (生成报告)

审查完成后，输出结构化报告：

```markdown
## Code Review Report

**Task**: [任务描述]
**Files Changed**: X files (+Y/-Z lines)
**Reviewer**: Claude Code Review Skill

---

### Summary

| Severity | Count |
|----------|-------|
| Critical | X |
| Warning  | Y |
| Info     | Z |

---

### Critical Issues (必须修复)

> 阻塞性问题，必须修复后才能继续

1. **[Issue Title]** @ `file:line`
   - Problem: [描述问题]
   - Impact: [影响]
   - Fix: [建议修复方式]

---

### Warnings (建议修复)

> 不阻塞但建议修复的问题

1. **[Issue Title]** @ `file:line`
   - Problem: [描述]
   - Suggestion: [建议]

---

### Info (可选改进)

> 代码可以工作，但有改进空间

1. **[Issue Title]** @ `file:line`
   - Note: [说明]

---

### Verdict

🔴 **BLOCKED** - 有 Critical issues，必须修复
🟡 **NEEDS WORK** - 有 Warnings，建议修复后继续
🟢 **APPROVED** - 代码质量良好，可以继续
```

---

## Integration with ai-workflow

本 skill 在 ai-workflow 的 Step 2 和 Step 3 之间自动触发：

```
Step 2: Execute Development
    ↓
Step 2.5: Code Review ← 本 skill
    │
    ├─ 🔴 BLOCKED → 返回 Step 2 修复
    ├─ 🟡 NEEDS WORK → 修复后继续（或用户确认跳过）
    └─ 🟢 APPROVED → 进入 Step 3
    ↓
Step 3: Verify Completion
```

---

## When to Skip Review

以下情况可以简化或跳过审查：

| 场景 | 审查级别 |
|------|----------|
| 修复 typo | 跳过 |
| 仅改文档 | 跳过 |
| 配置文件改动 | Quick Scan only |
| 新功能开发 | Full Review |
| API 修改 | Full Review + 特别关注兼容性 |
| 安全相关改动 | Full Review + 安全专项 |

---

## References

- `references/checklist.md` - 通用检查清单
- `references/security.md` - 安全检查详细指南
- `references/typescript.md` - TypeScript 规范
- `references/project.md` - 本项目特定规则
