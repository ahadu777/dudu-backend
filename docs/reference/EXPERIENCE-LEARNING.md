# Experience-Based Learning

## Core Principle

Continuously improve AI-driven workflow effectiveness through:
- Honest experimentation
- Failure analysis
- Iterative refinement

---

## Identifying Workflow Improvements

**After each interaction, ask:**
1. Did this workflow pattern work or fail?
2. What would have been faster/more accurate?
3. Is this repeatable for similar scenarios?
4. What should be added/removed from CLAUDE.md?

---

## Experience Documentation Pattern

```bash
# Update case study with real results
echo "### $(date +%Y-%m-%d): [Brief Description]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Pattern Tested**: [What workflow was used]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Result**: [Success/Failure + specific evidence]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
echo "**Learning**: [What should change in CLAUDE.md]" >> docs/cases/CASE-DISCOVER-AI-WORKFLOW.md
```

---

## Proven Learning Triggers

| Trigger | Action |
|---------|--------|
| Elaborate analysis produces wrong results | Add Reality Check requirements |
| AI skips obvious verification steps | Make verification mandatory |
| Complex theory fails in practice | Simplify to proven patterns |
| Successful pattern emerges | Document and institutionalize |
| Time wasted on wrong approaches | Identify prevention methods |

---

## Anti-Patterns to Catch

**Red flags indicating workflow problems:**

1. **Theory without testing** - Solutions not validated in practice
2. **Analysis procrastination** - Complex research avoiding basic verification
3. **Documentation bias** - Assuming cards/PRDs reflect running reality
4. **Overcorrection** - Throwing out working patterns due to one failure
5. **Pattern proliferation** - Adding complexity without proven benefit

---

## Success Measurement

**Effective AI workflow produces:**
- Fast accurate diagnosis (Reality Check works)
- Reduced cognitive load (Less thinking required)
- Repeatable patterns (Works across scenarios)
- Self-correcting behavior (Failures improve future performance)
- Honest documentation (Real results, not aspirational)

---

## Continuous Improvement Process

1. **Use current CLAUDE.md patterns** for real tasks
2. **Document what actually happens** (successes and failures)
3. **Identify specific improvements** based on evidence
4. **Test changes in next real scenario**
5. **Update CLAUDE.md with proven patterns**
6. **Remove theoretical additions that don't work**

---

## AI Self-Feedback Loop

**AI should question itself during generation:**
- Before adding to CLAUDE.md: "What evidence do I have this works?"
- Before implementing: "Am I adding something theoretical again?"
- After commands: "Did this give me useful data?"
- When stuck: "What pattern worked in a similar situation?"

---

## User Communication Pattern Recognition

**Key signals user wants systematic verification:**
- "Be honest" → Values truthful assessment
- "How did you know..." → Testing AI reasoning
- "There should be a systematic way..." → Wants repeatable processes
- "Also when you mentioned X - how did you know to..." → Meta-analysis

**AI response pattern:**
- Provide evidence-based reasoning
- Show systematic discovery methods
- Be transparent about decision-making
- Mirror user's analytical framework with validation

---

## Learning-Driven Updates

**CLAUDE.md should evolve based on:**
- Proven successes that work repeatedly
- Failure prevention for identified anti-patterns
- Simplified patterns that reduce cognitive overhead
- Real command examples that solve problems

**Never add:**
- Theoretical frameworks without validation
- Complex systems that sound systematic but fail
- Solutions to hypothetical problems
- Patterns that worked once but aren't repeatable

---

## Related

- [Case Studies](../cases/)
- [CLAUDE.md](../../CLAUDE.md)
