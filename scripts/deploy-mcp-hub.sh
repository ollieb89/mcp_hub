#!/bin/bash

# MCP Hub Deployment Script
# Deploys new version from git repository

set -e  # Exit on error

echo "📦 Deploying MCP Hub..."

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run from MCP Hub root directory."
  exit 1
fi

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
bun install --production
echo "✅"

# Build application
echo -n "Building application... "
bun run build
echo "✅"

# Verify build artifacts
if [ ! -f "dist/cli.js" ]; then
  echo "❌ Build failed: dist/cli.js not found"
  exit 1
fi

# Set file permissions
echo -n "Setting file permissions... "
chmod +x dist/cli.js
chmod 600 .env.production 2>/dev/null || true
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
echo "========================================="
echo ""
echo "✅ Deployment complete"
