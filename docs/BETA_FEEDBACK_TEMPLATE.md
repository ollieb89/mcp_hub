# Beta Feedback Template

**Instructions**: Copy this template and post in GitHub Discussions → Beta Feedback category

---

## Beta Feedback: [Your Workflow Persona]

**Beta Tester**: @[github-username]
**Configuration Used**: Frontend / Backend / Full-Stack / DevOps
**Testing Period**: [Start Date] - [Current Date]
**Days Active**: [Number of days]

---

### 1. Setup Experience

**Configuration Difficulty** (1-5 stars, 5 = easiest):
⭐⭐⭐⭐⭐

**Documentation Clarity** (1-5 stars, 5 = clearest):
⭐⭐⭐⭐⭐

**Time to First Success**: [X minutes]

**Comments**:
- What worked well during setup?
- What was confusing or unclear?
- Any missing documentation?

---

### 2. Functionality Testing

#### ✅ Works as Expected
- [ ] Server allowlist filtering
- [ ] Server denylist filtering
- [ ] Category-based filtering
- [ ] Hybrid mode
- [ ] Auto-enable feature
- [ ] Statistics API
- [ ] Web dashboard
- [ ] Configuration hot-reload

**Details**: [Describe what worked well]

#### ⚠️ Needs Improvement
- [ ] Feature 1: [What and why]
- [ ] Feature 2: [What and why]

**Details**: [Specific suggestions for improvement]

#### ❌ Broken Workflows
- [ ] Workflow 1: [What broke and impact]
- [ ] Workflow 2: [What broke and impact]

**Details**: [Critical issues blocking productivity]

---

### 3. Performance Impact

**Tool Count Reduction**:
- Before filtering: [X tools]
- After filtering: [Y tools]
- Reduction: [Z%]

**Token Savings** (if measurable):
- Before: [X tokens]
- After: [Y tokens]
- Savings: [Z tokens / Z%]

**LLM Response Speed**: Faster / Same / Slower
**Perceived Change**: [Describe any noticeable speed difference]

**Overall Productivity**: Improved / Same / Decreased
**Explanation**: [How did filtering affect your actual work?]

---

### 4. Configuration Accuracy

**Server List Accuracy**: Too many / Just right / Too few
**Explanation**: [Which servers should be added/removed?]

**Category Accuracy** (if using category mode): Good / Needs refinement
**Explanation**: [Which tools are miscategorized?]

**Missing Critical Tools**:
1. Tool name: [Why it's critical]
2. Tool name: [Why it's critical]

**Unnecessary Tools Exposed**:
1. Tool name: [Why it's not needed]
2. Tool name: [Why it's not needed]

---

### 5. Specific Workflows Tested

List the workflows you tested and results:

#### Workflow 1: [Name]
- **Frequency**: Daily / Weekly / Occasionally
- **Tools Used**: [List specific tools]
- **Result**: ✅ Success / ⚠️ Partial / ❌ Failed
- **Notes**: [Details]

#### Workflow 2: [Name]
- **Frequency**: Daily / Weekly / Occasionally
- **Tools Used**: [List specific tools]
- **Result**: ✅ Success / ⚠️ Partial / ❌ Failed
- **Notes**: [Details]

#### Workflow 3: [Name]
- **Frequency**: Daily / Weekly / Occasionally
- **Tools Used**: [List specific tools]
- **Result**: ✅ Success / ⚠️ Partial / ❌ Failed
- **Notes**: [Details]

---

### 6. Feature Requests

**Priority 1 (Must Have)**:
- Feature: [Description]
- Rationale: [Why it's critical]

**Priority 2 (Nice to Have)**:
- Feature: [Description]
- Rationale: [Why it would help]

**Priority 3 (Future Consideration)**:
- Feature: [Description]
- Rationale: [Why it's interesting]

---

### 7. Category Refinement Suggestions

*Only applicable if using category-based or hybrid filtering*

**Categories That Work Well**:
- [Category name]: [Why it's accurate]

**Categories Needing Improvement**:
- [Category name]: [What's wrong and how to fix]

**New Categories to Consider**:
- [Proposed category]: [Tools that would fit]

---

### 8. LLM Categorization Feedback

*Only applicable if LLM categorization enabled*

**LLM Categorization Enabled**: Yes / No

**Accuracy** (if enabled): Good / Fair / Poor
**Explanation**: [Examples of good/bad categorization]

**Performance Impact**: Noticeable / Minimal / None
**Explanation**: [Did background LLM affect responsiveness?]

---

### 9. Documentation Feedback

**Most Helpful Documentation**:
- Document: [Name]
- Why: [What made it helpful]

**Documentation Gaps**:
- Missing topic: [What you couldn't find]
- Unclear section: [What needs clarification]

**Example Requests**:
- Scenario: [Use case needing an example]

---

### 10. Net Promoter Score

**How likely are you to recommend tool filtering to other MCP Hub users?** (0-10)

Score: [0-10]

**Reasoning**: [Why this score?]

---

### 11. Open Questions

1. Question: [Your question]
2. Question: [Your question]

---

### 12. Additional Comments

[Any other feedback, observations, or suggestions]

---

### 13. Configuration Attachment

**Please attach your anonymized configuration** (remove sensitive data):

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "...",
    "serverFilter": { /* your config */ },
    "categoryFilter": { /* your config */ }
  }
}
```

---

## Submission Checklist

- [ ] All sections completed
- [ ] Specific examples provided where applicable
- [ ] Configuration attachment included (anonymized)
- [ ] Screenshots attached for any UI issues (if applicable)
- [ ] Posted in GitHub Discussions → Beta Feedback category

---

**Thank you for your detailed feedback!** 🙏

Your insights are invaluable for making tool filtering production-ready.

**Questions?** Reply to your feedback post or create a new discussion in Beta Q&A.

---

**Template Version**: 1.0
**Last Updated**: 2025-11-02
