# TASK-018: Update Configuration Documentation

## Status
- **Current**: TODO
- **Assigned**: Technical Writer / Developer
- **Priority**: MEDIUM
- **Estimated**: 1 hour
- **Phase**: 4 - Documentation & Deployment

## Description
Update README.md and configuration documentation with prompt-based filtering setup and examples.

## Context
Users need clear guidance on configuring the new analyze_prompt feature including LLM provider setup.

## Dependencies
- **Blocks**: None (documentation task)
- **Requires**: All implementation complete

## Acceptance Criteria
- [ ] README.md updated with prompt-based filtering section
- [ ] Configuration examples added
- [ ] Environment variable documentation updated
- [ ] Troubleshooting section updated
- [ ] Migration guide if needed
- [ ] Examples tested and verified

## Documentation Updates

### README.md Additions

**Section: LLM-Based Tool Filtering**
```markdown
## LLM-Based Tool Filtering (Prompt-Based Mode)

MCP Hub supports intelligent tool exposure using LLM analysis of user prompts.

### Configuration

```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "meta-only",
      "sessionIsolation": true
    },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.5-flash"
    }
  }
}
```

### Environment Variables

- `GEMINI_API_KEY`: Required for Gemini provider
- `OPENAI_API_KEY`: Required for OpenAI provider
- `ANTHROPIC_API_KEY`: Required for Anthropic provider
- `DEBUG_TOOL_FILTERING`: Enable debug logging

### How It Works

1. Client starts with minimal tools (meta-only by default)
2. User makes request: "Check GitHub notifications"
3. Client calls `hub__analyze_prompt` meta-tool
4. Hub analyzes intent and exposes GitHub tools
5. Client receives updated tool list
6. User request proceeds with correct tools available
```

### Configuration Examples

**Minimal Setup** (Gemini):
```json
{
  "toolFiltering": {
    "mode": "prompt-based",
    "promptBasedFiltering": { "enabled": true },
    "llmCategorization": {
      "enabled": true,
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  }
}
```

**OpenAI Configuration**:
```json
{
  "llmCategorization": {
    "provider": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "model": "gpt-4o-mini"
  }
}
```

**Anthropic Configuration**:
```json
{
  "llmCategorization": {
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "model": "claude-3-5-haiku-20241022"
  }
}
```

### Testing Configuration

```bash
# Set API key
export GEMINI_API_KEY="your-key-here"

# Start Hub
bun start

# Test with validation script
./scripts/test-analyze-prompt.sh "Check GitHub issues"
```

## Success Metrics
- Clear configuration instructions
- All examples tested
- Users can configure successfully
- Reduced support questions
- High documentation quality

## Related Tasks
- TASK-019: Create troubleshooting guide
- TASK-020: Deploy to staging

## Reference Documentation
- `claudedocs/ANALYZE_PROMPT_PLAN.md` Section 6
- Existing README.md structure
- Configuration documentation patterns
