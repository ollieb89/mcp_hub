#!/bin/bash

# MCP Hub Startup Script
# Starts MCP Hub with production configuration

set -e  # Exit on error

echo "🚀 Starting MCP Hub..."

# Verify production environment
if [ ! -f ".env.production" ]; then
  echo "⚠️  Warning: .env.production not found"
fi

# Load production environment
if [ -f ".env.production" ]; then
  echo -n "Loading production environment... "
  export $(cat .env.production | grep -v '^#' | xargs)
  echo "✅"
fi

# Verify configuration
if [ ! -f "config/mcp-hub.json" ]; then
  echo "❌ Error: config/mcp-hub.json not found"
  exit 1
fi

# Validate JSON configuration
echo -n "Validating configuration... "
if ! jq empty config/mcp-hub.json 2>/dev/null; then
  echo "❌ Invalid JSON in config/mcp-hub.json"
  exit 1
fi
echo "✅"

# Check if already running
if pgrep -f "bun.*mcp-hub" > /dev/null || pgrep -f "node.*mcp-hub" > /dev/null; then
  echo "⚠️  MCP Hub is already running"
  echo "   Use stop-mcp-hub.sh first, or check with: ps aux | grep mcp-hub"
  exit 1
fi

# Start MCP Hub in background
echo -n "Starting MCP Hub service... "
nohup bun start > logs/mcp-hub-output.log 2>&1 &
PID=$!
echo "✅ (PID: $PID)"

# Wait for startup (max 10 seconds)
echo -n "Waiting for service to be ready... "
for i in {1..10}; do
  if curl -s http://localhost:7000/api/health > /dev/null 2>&1; then
    echo "✅"
    echo ""
    echo "========================================="
    echo "MCP Hub started successfully"
    echo "========================================="
    echo "PID:        $PID"
    echo "Health:     http://localhost:7000/api/health"
    echo "API:        http://localhost:7000/api"
    echo "MCP:        http://localhost:7000/mcp"
    echo "Logs:       logs/mcp-hub-output.log"
    echo "========================================="
    exit 0
  fi
  sleep 1
done

echo "⚠️  Timeout"
echo "Service started but health check failed"
echo "Check logs: tail -f logs/mcp-hub-output.log"
exit 1
