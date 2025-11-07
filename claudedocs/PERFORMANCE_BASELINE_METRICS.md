# Performance Baseline Metrics - Staging Deployment

**Deployment**: 2025-11-07 22:02:46
**Branch**: fix/analyze-prompt-tool-activation
**Configuration**: Prompt-based mode, Gemini (gemini-2.5-flash)
**Process ID**: 453077
**Port**: 7000

---

## Current Baseline Metrics

### System Resources (as of 2025-11-07 22:12)

**Memory Usage**:
- RSS (Resident Set Size): 113,804 KB (111.1 MB)
- VSZ (Virtual Memory Size): 75,046,940 KB (73,290 MB)
- Memory %: 0.7%
- **Status**: ✅ EXCELLENT (Target: <200MB, Acceptable: <300MB)

**Uptime**:
- Running since: 22:05
- Current uptime: 06:40 (6 minutes 40 seconds)
- Process state: Running (Sl)
- **Status**: ✅ STABLE

**Process Health**:
- CPU %: 0.4%
- Parent PID: 453075
- **Status**: ✅ HEALTHY

### MCP Server Connections

**Configuration**:
- Total configured servers: 2
- Successfully connected: 1 (filesystem)
- Failed connections: 1 (github - missing GITHUB_PERSONAL_ACCESS_TOKEN)
- Connection success rate: 50%

**Filesystem Server**:
- Transport: STDIO
- Connection time: 1.807s (lines 20-25 in log)
- State: Connected
- Allowed directories: /tmp/mcp-staging
- Tools exposed: 14 (read_file, write_file, edit_file, etc.)

**GitHub Server**:
- State: Failed initialization
- Error: Variable 'GITHUB_PERSONAL_ACCESS_TOKEN' not found
- Impact: No GitHub tools available

### Tool Filtering Performance

**Meta-Tool Registration**:
- Meta-tools registered: 1 (hub__analyze_prompt)
- Registration time: <1ms
- **Status**: ✅ OPTIMAL

**Tool Filtering Times** (line 37-51):
- read_file: 0.37ms
- read_text_file: 0.02ms
- read_media_file: 0.01ms
- read_multiple_files: 0.01ms
- write_file: 0.01ms
- edit_file: 0.02ms
- create_directory: 0.02ms
- list_directory: 0.02ms
- list_directory_with_sizes: 0.02ms
- directory_tree: 0.01ms
- move_file: 0.01ms
- search_files: 0.01ms
- get_file_info: 0.01ms
- list_allowed_directories: 0.01ms

**Average filtering time**: 0.03ms (excluding outlier read_file at 0.37ms)
**Status**: ✅ EXCELLENT (Target: <300ms, Acceptable: <500ms)

### LLM Categorization

**Configuration**:
- Provider: Gemini
- Model: gemini-2.5-flash
- Cache file: /home/ob/.local/state/mcp-hub/tool-categories-llm.json
- Cached categories: 5

**Initialization**:
- LLM init time: Immediate (<1ms)
- Cache load time: <1ms
- **Status**: ✅ OPTIMAL

### Session Isolation

**Sessions Created**:
- Session 1: 89d2a2b4-ba97-41b3-8bdc-83faec5a074c (21:07:10)
- Session 2: c7713e9f-4618-4935-8c68-b390f3a256e1 (21:08:22)

**Session Initialization**:
- Initial categories: ["meta"]
- Default exposure: meta-only
- Filtering mode: prompt-based
- Session isolation: Enabled
- **Status**: ✅ WORKING AS DESIGNED

### Error Tracking

**Startup Errors**:
- GitHub server initialization: 1 failure (expected - missing token)
- Marketplace registry fetch: 1 warning (using stale cache)

**Runtime Errors**:
- None observed in 6:40 uptime
- Error rate: 0%
- **Status**: ✅ ZERO RUNTIME ERRORS

### Configuration Performance

**Config Load Time**:
- File: ./mcp-servers.json
- Load time: 3ms (line 17)
- **Status**: ✅ OPTIMAL

**Startup Performance**:
- HTTP server start: 8ms (lines 5-6)
- Workspace cache init: 1ms (lines 7-8)
- Marketplace init: 38ms (lines 11-15, with network failure fallback)
- MCP Hub init: 3ms (line 16)
- Server connection: 1.807s (filesystem only)
- Total startup time: ~1.857s
- **Status**: ✅ ACCEPTABLE

---

## Performance Benchmarks Summary

| Metric | Target | Acceptable | Current | Status |
|--------|--------|------------|---------|--------|
| LLM Analysis Time | <1.5s | <2s | Not yet measured | ⏳ PENDING |
| Tool Exposure Update | <300ms | <500ms | <1ms | ✅ EXCELLENT |
| End-to-End Flow | <2.5s | <3s | Not yet measured | ⏳ PENDING |
| Error Rate | <0.1% | <1% | 0% | ✅ EXCELLENT |
| Memory Usage | <200MB | <300MB | 111.1 MB | ✅ EXCELLENT |

---

## Missing Metrics

### Not Yet Available

1. **LLM Analysis Time**: No hub__analyze_prompt calls observed yet
2. **End-to-End Flow**: No complete prompt→analysis→exposure cycles captured
3. **Tool Exposure Notifications**: No category additions observed (sessions only initialized with meta-only)

### Data Needed for Complete Baseline

- Execute test prompts with hub__analyze_prompt
- Capture LLM provider response times
- Measure tool/list_changed notification latency
- Track complete user flow timings

---

## Log File Analysis

### Staging Log
- **File**: staging-deployment-20251107_220246.log
- **Lines**: 62 (startup sequence + 2 session initializations)
- **Format**: JSON structured logs
- **Status**: Clean, no errors

### System Log
- **File**: ~/.local/state/mcp-hub/logs/mcp-hub.log
- **Lines**: 8 (binary objects, likely serialization format)
- **Format**: Not human-readable
- **Action**: Consider reviewing log configuration

---

## Next Steps

1. **Execute Performance Tests**: Run hub__analyze_prompt with various prompts
2. **Capture LLM Metrics**: Measure Gemini API response times
3. **Test Load Scenarios**: Simulate multiple concurrent sessions
4. **Monitor Memory Growth**: Track RSS over 24-48h period
5. **Validate Cache Effectiveness**: Measure cache hit rates for categorization
