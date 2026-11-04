#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "--------------------------------------------------------"
echo "🚀 Starting Deployment: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📁 Working Directory: $PROJECT_DIR"
echo "--------------------------------------------------------"

git pull origin master
npm install --prefer-offline --no-audit
npm run build:low-mem

if pm2 describe ceylonhosting > /dev/null 2>&1; then
    pm2 reload ceylonhosting --update-env
    echo "✅ PM2 process 'ceylonhosting' reloaded successfully!"
else
    pm2 start ecosystem.config.cjs
    echo "✅ PM2 process 'ceylonhosting' started successfully!"
fi

pm2 save

echo "--------------------------------------------------------"
echo "🎉 Deployment completed successfully!"
echo "--------------------------------------------------------"
