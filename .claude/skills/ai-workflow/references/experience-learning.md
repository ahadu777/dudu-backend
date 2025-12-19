# Experience Learning Reference

## 触发场景

当用户请求改进 AI 工作流时触发：
- "改进工作流"
- "优化流程"
- "CLAUDE.md 需要更新"
- "工作流有问题"

## 工作流

### 1. 理解当前工作流

```bash
# 读取核心文档
cat CLAUDE.md
cat .claude/skills/ai-workflow/SKILL.md

# 查看引用文档
ls .claude/skills/ai-workflow/references/
ls docs/reference/
```

### 2. 识别改进点

**常见改进类型：**

| 类型 | 示例 | 改进位置 |
|------|------|----------|
| 任务分类缺失 | 某类任务没有对应的处理方式 | SKILL.md Step 0 |
| 流程步骤问题 | 某步骤执行效果差 | SKILL.md 对应 Step |
| 反模式发现 | AI 经常犯的错误 | SKILL.md Anti-Patterns |
| 参考文档缺失 | 某场景需要详细指南 | references/ 目录 |

### 3. 实施改进

**原则：**
- 只改动必要的部分
- 保持向后兼容
- 用实际案例验证

**修改优先级：**
1. SKILL.md - 工作流核心
2. references/*.md - 详细参考
3. CLAUDE.md - 入口文档（通常不需要改）

### 4. 验证改进

```bash
# 确保文件格式正确
cat .claude/skills/ai-workflow/SKILL.md | head -20

# 检查引用是否存在
ls .claude/skills/ai-workflow/references/
```

### 5. 记录经验

```bash
# 记录到案例文档
echo "### $(date +%Y-%m-%d): [改进描述]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**问题**: [遇到的问题]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**改进**: [做了什么改进]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**效果**: [预期效果]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
```

## 反模式

| 错误 | 正确 |
|------|------|
| 添加理论性框架 | 只添加验证过的 pattern |
| 过度复杂化 | 保持简单直接 |
| 不查看现有文档就改 | 先 Reality Check |
| 改完不验证 | 用实际任务验证 |

## 相关文档

- [Experience Learning Guide](../../../../docs/reference/EXPERIENCE-LEARNING.md) - 详细的经验学习方法论
- [Case Studies](../../../../docs/cases/) - 实际案例记录
