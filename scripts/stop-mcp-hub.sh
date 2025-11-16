#!/bin/bash

# MCP Hub Graceful Shutdown Script
# Stops the running MCP Hub instance with graceful shutdown

echo "🛑 Stopping MCP Hub..."

# Find MCP Hub process
PID=$(pgrep -f "bun.*mcp-hub" || pgrep -f "node.*mcp-hub")

if [ -z "$PID" ]; then
  echo "⚠️  No running MCP Hub process found"
  exit 0
fi

echo "Found MCP Hub process: PID $PID"

# Send SIGTERM for graceful shutdown
echo -n "Sending graceful shutdown signal (SIGTERM)... "
kill -TERM "$PID"
echo "✅"

# Wait for graceful shutdown (max 30 seconds)
echo -n "Waiting for graceful shutdown (max 30s)... "
for i in {1..30}; do
  if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "✅"
    echo "✅ MCP Hub stopped gracefully"
    exit 0
  fi
  sleep 1
done

# Force kill if still running
echo "⚠️  Timeout"
echo -n "Forcing shutdown (SIGKILL)... "
kill -KILL "$PID" 2>/dev/null
sleep 2
echo "✅"

# Verify shutdown
if ps -p "$PID" > /dev/null 2>&1; then
  echo "❌ Failed to stop MCP Hub"
  exit 1
else
  echo "✅ MCP Hub stopped (forced)"
  exit 0
fi
