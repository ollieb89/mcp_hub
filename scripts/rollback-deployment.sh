#!/bin/bash

# MCP Hub Rollback Script
# Rolls back to previous version using git and backup

set -e  # Exit on error

echo "🔄 MCP Hub Rollback"
echo "========================================"
echo ""

# Find most recent backup
LATEST_BACKUP=$(ls -td backups/*/ 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backup found in backups/ directory"
  echo "   Cannot rollback without backup"
  exit 1
fi

echo "Latest backup: $LATEST_BACKUP"
cat "$LATEST_BACKUP/manifest.txt"
echo ""

# Confirm rollback
echo "⚠️  This will:"
echo "  1. Stop current MCP Hub"
echo "  2. Revert code to previous git commit"
echo "  3. Restore configuration from backup"
echo "  4. Restart MCP Hub"
echo ""
read -p "Continue with rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

echo ""

# Phase 1: Stop current version
echo "🛑 Phase 1: Stopping MCP Hub"
echo "----------------------------------------"
bash scripts/stop-mcp-hub.sh
echo ""

# Phase 2: Git rollback
echo "🔄 Phase 2: Git Rollback"
echo "----------------------------------------"
BACKUP_COMMIT=$(grep "Git commit:" "$LATEST_BACKUP/manifest.txt" | awk '{print $3}')

if [ "$BACKUP_COMMIT" = "N/A" ]; then
  echo "⚠️  No git commit found in backup"
  echo "   Skipping git rollback"
else
  echo -n "Reverting to commit $BACKUP_COMMIT... "
  git checkout "$BACKUP_COMMIT"
  echo "✅"
fi
echo ""

# Phase 3: Restore configuration
echo "📦 Phase 3: Restore Configuration"
echo "----------------------------------------"

if [ -d "$LATEST_BACKUP/config" ]; then
  echo -n "Restoring config/ directory... "
  rm -rf config
  cp -r "$LATEST_BACKUP/config" config/
  echo "✅"
else
  echo "⚠️  No config backup found"
fi

if [ -d "$LATEST_BACKUP/cache" ]; then
  echo -n "Restoring cache... "
  rm -rf "$HOME/.cache/mcp-hub"
  mkdir -p "$HOME/.cache"
  cp -r "$LATEST_BACKUP/cache/mcp-hub" "$HOME/.cache/"
  echo "✅"
else
  echo "⚠️  No cache backup found"
fi
echo ""

# Phase 4: Rebuild
echo "🔨 Phase 4: Rebuild"
echo "----------------------------------------"
echo -n "Installing dependencies... "
bun install --production
echo "✅"

echo -n "Building application... "
bun run build
echo "✅"
echo ""

# Phase 5: Start rolled-back version
echo "🚀 Phase 5: Start Rolled-Back Version"
echo "----------------------------------------"
bash scripts/start-mcp-hub.sh
echo ""

# Phase 6: Validation
echo "🔍 Phase 6: Validation"
echo "----------------------------------------"
sleep 5  # Give service time to stabilize
bash scripts/validate-deployment.sh
echo ""

# Success
echo "========================================"
echo "✅ Rollback Complete"
echo "========================================"
echo "Rolled back to:"
echo "  Commit: $BACKUP_COMMIT"
echo "  Backup: $LATEST_BACKUP"
echo ""
echo "Monitor the rolled-back version:"
echo "  bash scripts/monitor-production.sh"
echo "========================================"
