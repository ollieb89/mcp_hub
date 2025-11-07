# Troubleshooting Guide: Analyze Prompt Feature

Comprehensive troubleshooting guide for the prompt-based tool filtering feature using `hub__analyze_prompt`.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Debug Procedures](#debug-procedures)
3. [Log Analysis](#log-analysis)
4. [Recovery Procedures](#recovery-procedures)
5. [Performance Issues](#performance-issues)
6. [Configuration Validation](#configuration-validation)

---

## Common Issues

### Issue 1: "Method not found" Error

**Symptom:**
```
Error: Method analyzePrompt not found on LLM provider
```

**Cause:** LLM provider missing `analyzePrompt()` implementation

**Solution:**
1. Verify provider implementation exists in `src/llm/providers/`
2. Check provider class extends `LLMProvider` base class
3. Verify provider is properly instantiated in `LLMProviderFactory`
4. Check that the provider you're using (gemini/openai/anthropic) is supported

**Debug:**
```bash
# Enable debug logging
DEBUG_TOOL_FILTERING=true bun start

# Check logs for provider initialization
grep "LLM provider initialized" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Expected log output:**
```
{"level":30,"msg":"LLM provider initialized","provider":"gemini","model":"gemini-2.5-flash"}
```

---

### Issue 2: Tools Not Updating After Analysis

**Symptom:**
- `hub__analyze_prompt` completes successfully
- Returns categories and reasoning
- But `tools/list` remains unchanged
- No new tools appear after analysis

**Cause:** `handleToolsList()` not filtering by session categories

**Root Causes:**
1. `promptBasedFiltering.enabled` set to `false`
2. Session's `exposedCategories` not updated after analysis
3. `filterToolsBySessionCategories()` not called in handler
4. MCP client not re-fetching tool list after notification

**Solution:**
1. Verify configuration:
```bash
jq '.toolFiltering.promptBasedFiltering.enabled' mcp-servers.json
# Should return: true
```

2. Check session state:
```bash
# Enable debug logging
DEBUG_TOOL_FILTERING=true bun start

# Look for session update log
grep "Tool exposure updated" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

3. Verify client receives notification:
```bash
# Check for tools/list_changed notification
grep "tools/list_changed" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

4. Ensure MCP client implements `notifications/tools/list_changed` handler

**Expected log flow:**
```json
{"msg":"Starting prompt analysis","sessionId":"abc123","prompt":"Check GitHub"}
{"msg":"LLM analysis completed","categories":["github"],"confidence":0.95}
{"msg":"Tool exposure updated","sessionId":"abc123","added":["github"],"total":15}
{"msg":"Client notified","notification":"tools/list_changed"}
```

---

### Issue 3: LLM Analysis Fails

**Symptom:**
```
Error: LLM analysis failed
```
or
```
{
  "categories": ["meta"],
  "confidence": 0.3,
  "reasoning": "Fallback to heuristic analysis"
}
```

**Cause:** LLM API error, missing API key, or network issue

**Common Root Causes:**
1. API key not set or invalid
2. API key expired or rate limited
3. Network connectivity issues
4. LLM service unavailable
5. Incorrect model name

**Solution:**

**Step 1: Verify API Key**
```bash
# Check if API key is set
echo $GEMINI_API_KEY
# Should output: your-key-here (not empty)

# Verify key is valid (Gemini example)
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' | jq .

# Expected: Should return a valid response, not 401/403 error
```

**Step 2: Check Network Connectivity**
```bash
# Test connectivity to LLM service
curl -I https://generativelanguage.googleapis.com  # Gemini
curl -I https://api.openai.com                      # OpenAI
curl -I https://api.anthropic.com                   # Anthropic
```

**Step 3: Verify Model Name**
```bash
# Check configured model matches provider
jq '.toolFiltering.llmCategorization' mcp-servers.json

# Valid models:
# - Gemini: "gemini-2.5-flash", "gemini-1.5-flash"
# - OpenAI: "gpt-4o-mini", "gpt-4o"
# - Anthropic: "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"
```

**Step 4: Check Rate Limits**
```bash
# Look for rate limit errors in logs
grep "rate limit\|quota\|429" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Debug:**
```bash
DEBUG_TOOL_FILTERING=true bun start
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep "LLM"
```

**Heuristic Fallback:**
The system automatically falls back to heuristic analysis when LLM fails. This is expected behavior and ensures the system remains functional.

---

### Issue 4: "Session not found" Error

**Symptom:**
```
Error: Session not found for sessionId: xyz789
```

**Cause:** Client reconnected and lost ephemeral session state

**Explanation:**
Sessions are ephemeral and stored in-memory. When:
- Client reconnects after disconnect
- Hub restarts
- Session timeout occurs

The session state is lost.

**Solution:**
This is expected behavior. The client should:
1. Call `hub__analyze_prompt` again after reconnection
2. Re-establish tool exposure for the new session
3. Proceed with user's request

**Not a Bug:** Session isolation is by design. Each session maintains independent tool exposure.

**If you need persistence:**
Consider implementing session persistence in your MCP client or using `sessionIsolation: false` for global tool exposure (not recommended for multi-client scenarios).

---

### Issue 5: Incorrect Categories Identified

**Symptom:**
- LLM returns wrong categories for prompt
- Example: "Check GitHub issues" → returns `["filesystem"]` instead of `["github"]`

**Cause:** LLM misinterpretation or ambiguous prompt

**Analysis:**
Check the response confidence and reasoning:
```json
{
  "categories": ["filesystem"],
  "confidence": 0.4,  // Low confidence indicates uncertainty
  "reasoning": "User mentioned 'check' which could mean file checking"
}
```

**Solution:**

**1. Refine the Prompt:**
```
❌ Ambiguous: "check issues"
✅ Clear: "check my GitHub issues"

❌ Ambiguous: "read file"
✅ Clear: "read the config.json file"
```

**2. Use Context Parameter:**
```json
{
  "prompt": "check issues",
  "context": "User is working on GitHub repository with open pull requests"
}
```

**3. Review Confidence Score:**
- `>0.8`: High confidence, likely correct
- `0.6-0.8`: Medium confidence, verify categories
- `<0.6`: Low confidence, prompt may be ambiguous

**4. Report Pattern for Improvement:**
If a specific prompt consistently returns incorrect categories, report it as a pattern for prompt engineering improvement.

**Debug:**
```bash
# Enable verbose logging
DEBUG_TOOL_FILTERING=true bun start

# Check reasoning in logs
grep "reasoning" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq .
```

---

### Issue 6: Meta-Tool Not Registered

**Symptom:**
- `hub__analyze_prompt` tool not available in client
- Client shows no meta-tools

**Cause:** Meta-tool registration failed or disabled

**Solution:**

**Step 1: Verify Configuration**
```bash
jq '.toolFiltering.promptBasedFiltering.enableMetaTools' mcp-servers.json
# Should return: true (or not present, defaults to true)
```

**Step 2: Check Hub Logs**
```bash
grep "Meta-tools registered" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

**Expected output:**
```json
{"msg":"Meta-tools registered","tools":["hub__analyze_prompt"],"sessionId":"abc123"}
```

**Step 3: Verify Client Implementation**
Ensure your MCP client:
1. Calls `/tools/list` after connecting
2. Supports dynamic tool registration
3. Handles `tools/list_changed` notifications

**Step 4: Test Manually**
```bash
# Use validation script to test
./scripts/test-analyze-prompt.sh
# Should show "Meta-Tool Registration: PASS"
```

---

## Debug Procedures

### Procedure 1: Enable Debug Logging

**Enable comprehensive debug logging:**
```bash
# Set environment variable
export DEBUG_TOOL_FILTERING=true

# Start Hub with debug enabled
DEBUG_TOOL_FILTERING=true bun start
```

**Monitor logs in real-time:**
```bash
# Follow logs with filtering
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | grep -E "analyze_prompt|LLM|Tool exposure"

# Or use pino-pretty for formatted output (if available)
tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log | bunx pino-pretty
```

**What to look for:**
- `handleAnalyzePrompt`: Function entry
- `Starting prompt analysis`: Analysis initiated
- `Calling LLM provider`: LLM request sent
- `LLM analysis completed`: LLM response received
- `Tool exposure updated`: Categories applied
- `Client notified`: Notification sent

---

### Procedure 2: Validate Configuration

**Check complete configuration:**
```bash
# View toolFiltering section
jq '.toolFiltering' mcp-servers.json

# Verify mode is prompt-based
jq '.toolFiltering.mode' mcp-servers.json
# Expected: "prompt-based"

# Check promptBasedFiltering enabled
jq '.toolFiltering.promptBasedFiltering.enabled' mcp-servers.json
# Expected: true

# Verify LLM provider configured
jq '.toolFiltering.llmCategorization' mcp-servers.json
# Expected: {enabled: true, provider: "gemini"|"openai"|"anthropic", apiKey: "..."}
```

**Common configuration errors:**
```json
// ❌ Wrong: mode mismatch
{
  "toolFiltering": {
    "mode": "server-allowlist",  // Wrong mode
    "promptBasedFiltering": { "enabled": true }
  }
}

// ✅ Correct:
{
  "toolFiltering": {
    "mode": "prompt-based",  // Correct mode
    "promptBasedFiltering": { "enabled": true }
  }
}
```

---

### Procedure 3: Test LLM Provider Directly

**Test Gemini:**
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Analyze this prompt: Check my GitHub notifications"}]
    }]
  }' | jq .
```

**Test OpenAI:**
```bash
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Test"}]
  }' | jq .
```

**Test Anthropic:**
```bash
curl -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Test"}]
  }' | jq .
```

**Expected:** Valid JSON response with generated content (not 401/403/429 error)

---

### Procedure 4: Validate Complete Flow

**Run validation script:**
```bash
# Basic test
./scripts/test-analyze-prompt.sh "Check my GitHub notifications"

# Verbose mode for debugging
./scripts/test-analyze-prompt.sh --verbose "Check my GitHub notifications"

# CI mode for structured output
./scripts/test-analyze-prompt.sh --ci "Check my GitHub notifications" | jq .
```

**Expected output:**
```
✓ Hub Health Check
✓ Config File Exists
✓ Prompt-Based Mode Enabled
✓ LLM Provider Configured
✓ SSE Connection
✓ Initial Tools List
✓ Meta-Tool Registration
✓ Analyze Prompt Call
✓ Result Format Validation
✓ Tools List After Analysis

Success Rate: 100%
```

**Check all 7 debug checkpoints:**
```bash
# Checkpoint 1: Meta-tools registered
grep "Meta-tools registered" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 2: Session initialized
grep "Session initialized" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 3: Starting analysis
grep "Starting prompt analysis" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 4: LLM called
grep "Calling LLM provider" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 5: Analysis completed
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 6: Tool exposure updated
grep "Tool exposure updated" ~/.local/state/mcp-hub/logs/mcp-hub.log

# Checkpoint 7: Client notified
grep "Client notified" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

---

## Log Analysis

### Key Log Patterns

**Successful Analysis Flow:**
```json
{"level":30,"msg":"handleAnalyzePrompt","sessionId":"abc123","prompt":"Check GitHub"}
{"level":30,"msg":"Starting prompt analysis","sessionId":"abc123","prompt":"Check GitHub"}
{"level":30,"msg":"Calling LLM provider","provider":"gemini","model":"gemini-2.5-flash"}
{"level":30,"msg":"LLM analysis completed","categories":["github"],"confidence":0.95,"reasoning":"User wants to check GitHub notifications"}
{"level":30,"msg":"Tool exposure updated","sessionId":"abc123","added":["github"],"total":15}
{"level":30,"msg":"Client notified","notification":"tools/list_changed"}
```

**Failed Analysis (LLM Error):**
```json
{"level":40,"msg":"LLM provider error","error":"API key invalid","provider":"gemini"}
{"level":30,"msg":"Falling back to heuristic analysis"}
{"level":30,"msg":"Heuristic analysis completed","categories":["meta"],"confidence":0.3}
```

**Session Not Found:**
```json
{"level":40,"msg":"Session not found","sessionId":"xyz789"}
```

### Log Search Commands

**Find all analysis attempts:**
```bash
grep "handleAnalyzePrompt" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq .
```

**Find category identification:**
```bash
grep "categories" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.categories'
```

**Find tool filtering operations:**
```bash
grep "Filtered tools by session categories" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq .
```

**Find errors:**
```bash
grep '"level":40' ~/.local/state/mcp-hub/logs/mcp-hub.log | grep analyze | jq .
grep '"level":50' ~/.local/state/mcp-hub/logs/mcp-hub.log | grep analyze | jq .
```

**Find performance metrics:**
```bash
# LLM response time
grep "LLM analysis completed" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.duration'

# End-to-end analysis time
grep "handleAnalyzePrompt" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.duration'
```

---

## Recovery Procedures

### Disable Feature

If prompt-based filtering is causing issues, disable it:

**Option 1: Disable Prompt-Based Mode**
```json
{
  "toolFiltering": {
    "enabled": true,
    "mode": "server-allowlist",  // Switch to static mode
    "promptBasedFiltering": {
      "enabled": false  // Disable feature
    }
  }
}
```

**Option 2: Disable All Filtering**
```json
{
  "toolFiltering": {
    "enabled": false  // Expose all tools
  }
}
```

**Option 3: Keep Feature but Use Minimal Exposure**
```json
{
  "toolFiltering": {
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true,
      "defaultExposure": "all"  // Start with all tools
    }
  }
}
```

### Clear Session State

**Restart Hub to clear all sessions:**
```bash
# Stop Hub
pkill -f "bun.*mcp-hub"

# Or use Ctrl+C if running in foreground

# Start fresh
bun start
```

### Switch LLM Provider

If one provider is having issues, switch to another:

```json
{
  "llmCategorization": {
    "provider": "openai",  // Changed from gemini
    "apiKey": "${OPENAI_API_KEY}",
    "model": "gpt-4o-mini"
  }
}
```

### Emergency Fallback

If LLM-based analysis completely fails, the system automatically falls back to heuristic analysis. This is safe and expected behavior.

**Heuristic fallback characteristics:**
- Returns `["meta"]` category with low confidence
- Allows minimal tool exposure to continue working
- User can manually specify categories if needed

---

## Performance Issues

### Issue: Slow LLM Response

**Symptom:** `hub__analyze_prompt` takes >5 seconds to respond

**Causes:**
1. LLM provider API latency
2. Large prompt size
3. Network issues
4. Provider rate limiting

**Solutions:**

**1. Use Faster Model:**
```json
{
  "llmCategorization": {
    "provider": "gemini",
    "model": "gemini-2.5-flash"  // Fastest option
  }
}
```

**2. Optimize Prompt Size:**
```json
{
  "prompt": "Check GitHub",  // ✅ Concise
  "context": null  // Don't send unnecessary context
}
```

**3. Check Network Latency:**
```bash
# Test provider latency
time curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'
```

**4. Monitor Rate Limits:**
```bash
# Check for rate limit errors
grep "rate limit\|429" ~/.local/state/mcp-hub/logs/mcp-hub.log
```

### Issue: High Token Usage

**Symptom:** Token usage still high even with prompt-based filtering

**Causes:**
1. Too many categories exposed
2. `defaultExposure` set to "all"
3. Session not properly isolated

**Solutions:**

**1. Use Restrictive Default Exposure:**
```json
{
  "promptBasedFiltering": {
    "defaultExposure": "meta-only"  // Most restrictive
  }
}
```

**2. Enable Session Isolation:**
```json
{
  "promptBasedFiltering": {
    "sessionIsolation": true  // Per-client isolation
  }
}
```

**3. Monitor Tool Counts:**
```bash
# Check exposed tool counts
grep "Tool exposure updated" ~/.local/state/mcp-hub/logs/mcp-hub.log | jq '.total'
```

---

## Configuration Validation

### Validate Entire Configuration

**Check configuration is valid JSON:**
```bash
jq . mcp-servers.json > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
```

**Validate required fields:**
```bash
# Check mode
jq -e '.toolFiltering.mode == "prompt-based"' mcp-servers.json && echo "✅ Mode correct" || echo "❌ Mode incorrect"

# Check promptBasedFiltering enabled
jq -e '.toolFiltering.promptBasedFiltering.enabled == true' mcp-servers.json && echo "✅ Enabled" || echo "❌ Not enabled"

# Check LLM provider configured
jq -e '.toolFiltering.llmCategorization.enabled == true' mcp-servers.json && echo "✅ LLM configured" || echo "❌ LLM not configured"

# Check API key present
jq -e '.toolFiltering.llmCategorization.apiKey != null' mcp-servers.json && echo "✅ API key present" || echo "❌ API key missing"
```

### Common Configuration Mistakes

**❌ Mistake 1: Wrong mode**
```json
{
  "toolFiltering": {
    "mode": "category",  // Wrong!
    "promptBasedFiltering": { "enabled": true }
  }
}
```

**✅ Correct:**
```json
{
  "toolFiltering": {
    "mode": "prompt-based",  // Correct
    "promptBasedFiltering": { "enabled": true }
  }
}
```

**❌ Mistake 2: Missing API key**
```json
{
  "llmCategorization": {
    "enabled": true,
    "provider": "gemini"
    // Missing: "apiKey": "${GEMINI_API_KEY}"
  }
}
```

**✅ Correct:**
```json
{
  "llmCategorization": {
    "enabled": true,
    "provider": "gemini",
    "apiKey": "${GEMINI_API_KEY}"  // Required!
  }
}
```

**❌ Mistake 3: Conflicting settings**
```json
{
  "toolFiltering": {
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": false  // Contradicts mode!
    }
  }
}
```

**✅ Correct:**
```json
{
  "toolFiltering": {
    "mode": "prompt-based",
    "promptBasedFiltering": {
      "enabled": true  // Consistent with mode
    }
  }
}
```

---

## Getting Help

If you've tried all troubleshooting steps and still have issues:

1. **Check existing issues:** https://github.com/yourorg/mcp-hub/issues
2. **Enable debug logging:** `DEBUG_TOOL_FILTERING=true`
3. **Run validation script:** `./scripts/test-analyze-prompt.sh --verbose`
4. **Collect logs:** `cat ~/.local/state/mcp-hub/logs/mcp-hub.log | grep analyze`
5. **Report issue:** Include configuration, logs, and validation script output

### Information to Include

When reporting issues, please include:

```bash
# System info
uname -a
bun --version

# Configuration
jq '.toolFiltering' mcp-servers.json

# Environment variables (redact API keys!)
env | grep -E "GEMINI|OPENAI|ANTHROPIC|DEBUG_TOOL_FILTERING"

# Recent logs
tail -100 ~/.local/state/mcp-hub/logs/mcp-hub.log | grep analyze

# Validation script output
./scripts/test-analyze-prompt.sh --ci "Test prompt" | jq .
```

---

## Related Documentation

- [Prompt-Based Filtering Quick Start](./PROMPT_BASED_FILTERING_QUICK_START.md)
- [Testing Guide](./TESTING_ANALYZE_PROMPT.md)
- [Configuration Documentation](../README.md#tool-filtering)
- [MCP Connection Troubleshooting](./TROUBLESHOOTING_MCP_CONNECTION.md)
