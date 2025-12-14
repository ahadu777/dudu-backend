# Natural Language Optimization

## 5-Step Workflow

1. **Parse & Understand** - Extract core intent, requirements, constraints
2. **Optimize into Structured Prompt** - Convert to clear, actionable specification
3. **Present for Confirmation** - Show optimized version with clarifying questions
4. **Wait for User Approval** - Don't proceed without explicit confirmation
5. **Execute Based on Optimized Prompt** - Implement exactly what was confirmed

## Template: Feature Request

```
📋 理解你的需求，优化后的提示词：

**功能范围：**
- 用户故事：作为[角色]，我想[动作]，以便[价值]
- API端点：[HTTP METHOD] [/api/path]
- 返回数据：[数据结构]
- 权限要求：[认证/授权]
- 文档层级：[PRD/Story/Card]

**需要确认：**
1. [范围问题]
2. [集成问题]
3. [业务逻辑问题]

**技术决策：**
- [默认值 1]
- [默认值 2]

请确认方向后我再开始实现。
```

## Template: Bug Fix

```
📋 理解你的问题，优化后的诊断计划：

**问题描述：**
- 症状：[观察到的行为]
- 影响范围：[影响范围]
- 预期行为：[预期行为]

**诊断计划：**
1. Reality Check: [验证命令]
2. [诊断步骤 2]
3. [诊断步骤 3]

**需要确认：**
1. [上下文问题]
2. [复现问题]
3. [环境问题]

请提供更多信息，我将立即开始诊断。
```

## Template: API Design

```
📋 理解你的需求，优化后的API设计方案：

**功能需求：**
- [核心需求]
- 目标用户：[用户角色]

**API设计选项：**
方案 1: [推荐方案]
[API 契约示例]

方案 2: [备选方案]
[API 契约示例]

**需要确认：**
1. [业务规则问题]
2. [规模问题]
3. [授权问题]

**技术考虑：**
- 建议：[推荐及理由]

请选择方案并确认业务规则。
```

## Anti-Patterns

| Wrong | Correct |
|-------|---------|
| 直接实现 | 先优化提示词，等用户确认 |
| 假设默认值 | 明确询问参数（如分页大小） |
| 过度设计 | 先提供简单方案，询问是否需要复杂功能 |

## Validation

**Success indicators:**
- ✅ User confirms "yes, that's what I want" before implementation
- ✅ Clear API contracts specified upfront
- ✅ Business rules and constraints surfaced early
- ✅ Avoids rework due to misunderstanding

**Failure indicators:**
- 🚨 AI starts implementing without user confirmation
- 🚨 User says "that's not what I meant" after implementation
- 🚨 Multiple rounds of clarification after code is written
