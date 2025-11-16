#!/bin/bash

# MCP Hub Pre-Deployment Backup Script
# Creates a timestamped backup of configuration, cache, and logs

BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating pre-deployment backup..."
echo "Backup directory: $BACKUP_DIR"

# Backup configuration
echo -n "Backing up configuration... "
if [ -d "config" ]; then
  cp -r config/ "$BACKUP_DIR/config/"
  echo "✅"
else
  echo "⚠️  No config directory found"
fi

# Backup cache
echo -n "Backing up cache... "
if [ -d "$HOME/.cache/mcp-hub" ]; then
  mkdir -p "$BACKUP_DIR/cache"
  cp -r "$HOME/.cache/mcp-hub/" "$BACKUP_DIR/cache/"
  echo "✅"
else
  echo "⚠️  No cache directory found"
fi

# Backup logs
echo -n "Backing up logs... "
if [ -d "$HOME/.local/state/mcp-hub/logs" ]; then
  mkdir -p "$BACKUP_DIR/logs"
  cp -r "$HOME/.local/state/mcp-hub/logs/" "$BACKUP_DIR/logs/"
  echo "✅"
else
  echo "⚠️  No logs directory found"
fi

# Create backup manifest
echo -n "Creating manifest... "
cat > "$BACKUP_DIR/manifest.txt" <<EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git branch: $(git branch --show-current 2>/dev/null || echo "N/A")
MCP Hub version: $(cat package.json 2>/dev/null | jq -r .version || echo "N/A")
Backup size: $(du -sh "$BACKUP_DIR" | awk '{print $1}')
EOF
echo "✅"

# Display manifest
echo ""
echo "========================================="
cat "$BACKUP_DIR/manifest.txt"
echo "========================================="
echo ""
echo "✅ Backup complete: $BACKUP_DIR"
