# Duplicate Prevention

## Three-Layer Search Pattern

Before creating ANY new story/card, execute this search:

```bash
# Layer 0: PRD Level (Product domain check)
grep -ri "关键词" docs/prd/
grep -ri "keyword" docs/prd/

# Layer 1: Story Level (User capability check)
grep -ri "关键词" docs/stories/
grep -ri "keyword" docs/stories/

# Layer 2: Card Level (Technical implementation check)
grep -r "GET\|POST\|PUT\|DELETE" docs/cards/*.md | grep -i "keyword"
find docs/cards/ -name "*keyword*"

# Layer 3: Code Level (Actual implementation check)
ls src/modules/ | grep -i "keyword"
grep -r "router.get.*keyword\|router.post.*keyword" src/modules/*/router.ts
```

## AI Auto-Translation

When user uses Chinese, automatically translate to English for search:

```
用户输入: "批量导入票务"
AI搜索: 批量.*导入 | bulk.*import | batch.*import | ticket.*import

用户输入: "订单统计报表"
AI搜索: 订单.*统计 | order.*statistic | order.*report | order.*analytics
```

## Similarity Analysis Decision

```
Found similar content?
    ↓
>70% overlap? → Ask: Merge vs Extend vs Separate?
<70% overlap? → Ask: Related or Independent?
```

## User Clarification Template

```
🤖 我发现这两个需求非常相似（XXX vs YYY）：

   选项 1: 合并为一个故事 - 统一的[功能名称]
   选项 2: 创建两个独立故事 - 请说明业务场景区别
   选项 3: 扩展现有故事 - 已有类似功能，仅需增强

   您的选择？
```

## When to Create New

**Only create new story if:**
- ✅ User confirms it's a different business scenario
- ✅ Different user personas or access levels
- ✅ Different technical requirements or constraints
- ✅ No existing story can be extended

## Red Flags

- 🚨 Similar verbs ("查看订单" vs "浏览订单")
- 🚨 Same domain entities (Order, Ticket, User)
- 🚨 Overlapping API endpoints
- 🚨 Similar success criteria
