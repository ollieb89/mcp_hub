#!/bin/bash

# MCP Hub Deployment Validation Script
# Validates deployment with comprehensive health checks

echo "🔍 Validating MCP Hub deployment..."
echo ""

FAILED=0
PASSED=0

# Test 1: Health Check
echo -n "Test 1: Health Check... "
if curl -s http://localhost:7000/api/health | jq -e '.status == "ok"' > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 2: Filtering Enabled
echo -n "Test 2: Tool Filtering Enabled... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.enabled == true' > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 3: LLM Provider Active
echo -n "Test 3: LLM Provider Active... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.llm.enabled == true' > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 4: Cache Functional
echo -n "Test 4: Cache Functional... "
if curl -s http://localhost:7000/api/filtering/stats | jq -e '.llmCache' > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 5: Tool List Available
echo -n "Test 5: Tool List Available... "
TOOL_COUNT=$(curl -s http://localhost:7000/api/tools | jq '.tools | length')
if [ "$TOOL_COUNT" -gt 0 ] 2>/dev/null; then
  echo "✅ ($TOOL_COUNT tools)"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 6: MCP Endpoint Responsive
echo -n "Test 6: MCP Endpoint Responsive... "
if curl -s -X POST http://localhost:7000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}' \
  | jq -e '.result' > /dev/null 2>&1; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 7: Configuration Valid
echo -n "Test 7: Configuration Valid... "
if [ -f "config/mcp-hub.json" ] && jq empty config/mcp-hub.json 2>/dev/null; then
  echo "✅"
  ((PASSED++))
else
  echo "❌"
  ((FAILED++))
fi

# Test 8: Environment Variables Set
echo -n "Test 8: Environment Variables... "
if [ -n "$GEMINI_API_KEY" ] || [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✅"
  ((PASSED++))
else
  echo "⚠️  (No API keys found)"
  ((FAILED++))
fi

# Summary
echo ""
echo "========================================="
echo "Validation Results"
echo "========================================="
echo "Passed: $PASSED/8"
echo "Failed: $FAILED/8"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All validation tests passed"
  exit 0
else
  echo "❌ Some validation tests failed"
  echo "Review logs: tail -f logs/mcp-hub-output.log"
  exit 1
fi
