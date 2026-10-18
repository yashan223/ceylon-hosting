#!/usr/bin/env bash

# ==============================================================================
# Automated Deployment Script for ceylonhosting
# ==============================================================================
set -e

# Move to the script's directory (e.g. /home/admin/ceylon-store)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "--------------------------------------------------------"
echo "🚀 Starting Deployment: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📁 Working Directory: $PROJECT_DIR"
echo "--------------------------------------------------------"

# 1. Pull latest changes from git
echo "📥 Pulling latest changes from Git..."
git pull origin master

# 2. Install any new or updated dependencies
echo "📦 Installing dependencies..."
npm install --prefer-offline --no-audit

# 3. Ensure MongoDB database is running
if command -v docker > /dev/null 2>&1; then
    echo "🍃 Ensuring MongoDB is running..."
    docker compose up -d mongodb || true
fi

# 4. Build Next.js application
echo "⚙️ Building Next.js application (low-memory optimized)..."
npm run build:low-mem

# 4. Reload or Start PM2 process
echo "🔄 Reloading PM2 process (zero downtime)..."
if pm2 describe ceylonhosting > /dev/null 2>&1; then
    pm2 reload ceylonhosting --update-env
    echo "✅ PM2 process 'ceylonhosting' reloaded successfully!"
else
    pm2 start ecosystem.config.cjs
    echo "✅ PM2 process 'ceylonhosting' started successfully!"
fi

# 5. Save PM2 process list
pm2 save

echo "--------------------------------------------------------"
echo "🎉 Deployment completed successfully!"
echo "--------------------------------------------------------"
