#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

. ./build.sh

REMOTE_SERVER="me@machine.example.com"
REMOTE_DEST_PATH="/var/www/html/rj"

echo "🚚 Syncing 'deploy_package' directory with server..."
rsync -avz --delete ./deploy_package/ "${REMOTE_SERVER}:${REMOTE_DEST_PATH}/"

# Announce completion.
echo "✅ Deployment successful!"
echo "🌐 Your application is now live."

