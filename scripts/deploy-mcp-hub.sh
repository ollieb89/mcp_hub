#!/bin/bash

# MCP Hub Deployment Script
# Deploys new version from git repository with rollback support

set -e  # Exit on error

echo "📦 Deploying MCP Hub..."

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from MCP Hub root directory."
  exit 1
fi

# Save current state for rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD)
PREVIOUS_BRANCH=$(git branch --show-current)

# Rollback function
rollback_deployment() {
  echo ""
  echo "🔄 Rolling back deployment..."
  echo "Reverting to: $PREVIOUS_COMMIT"

  git checkout "$PREVIOUS_COMMIT" 2>/dev/null || true
  bun install --production 2>/dev/null || true
  bun run build 2>/dev/null || true

  echo "❌ Deployment failed and rolled back"
  exit 1
}

# Set trap for errors
trap rollback_deployment ERR

# Git pull latest changes
echo -n "Pulling latest changes from git... "
git fetch origin
git pull origin main
echo "✅"

# Show current version
CURRENT_VERSION=$(cat package.json | jq -r .version)
echo "Deploying version: $CURRENT_VERSION"

# Install dependencies
echo -n "Installing dependencies... "
if ! bun install --production; then
  echo "❌ Dependency installation failed"
  rollback_deployment
fi
echo "✅"

# Build application
echo -n "Building application... "
if ! bun run build; then
  echo "❌ Build failed"
  rollback_deployment
fi
echo "✅"

# Verify build artifacts
if [ ! -f "dist/cli.js" ]; then
  echo "❌ Build artifact missing: dist/cli.js"
  rollback_deployment
fi

# Verify build artifact is executable
if ! chmod +x dist/cli.js; then
  echo "❌ Cannot make build artifact executable"
  rollback_deployment
fi

# Verify build artifact size
BUILD_SIZE=$(du -k dist/cli.js | cut -f1)
if [ "$BUILD_SIZE" -lt 100 ]; then
  echo "❌ Build artifact too small: ${BUILD_SIZE}KB (expected: >100KB)"
  rollback_deployment
fi

# Set file permissions
echo -n "Setting file permissions... "
chmod 600 .env.production 2>/dev/null || true
mkdir -p logs 2>/dev/null || true
echo "✅"

# Display deployment info
echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo "Version:    $CURRENT_VERSION"
echo "Commit:     $(git rev-parse --short HEAD)"
echo "Branch:     $(git branch --show-current)"
echo "Build size: $(du -sh dist | awk '{print $1}')"
echo "Previous:   $(echo $PREVIOUS_COMMIT | cut -c1-7)"
echo "========================================="
echo ""
echo "✅ Deployment complete (rollback available)"

# Clear trap
trap - ERR
