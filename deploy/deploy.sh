#!/usr/bin/env bash
# Build locally, upload to the server, and (re)start the easy-homepage container.
# Settings come from deploy/.env (gitignored):
#   DEPLOY_HOST=ubuntu@1.2.3.4
#   DEPLOY_KEY=~/.ssh/id_rsa
#   DEPLOY_DIR=/opt/easy-homepage
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f deploy/.env ] && . deploy/.env

: "${DEPLOY_HOST:?set DEPLOY_HOST in deploy/.env, e.g. ubuntu@1.2.3.4}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_rsa}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/easy-homepage}"
SSH="ssh -i $DEPLOY_KEY -o BatchMode=yes"

npm run build

$SSH "$DEPLOY_HOST" "sudo mkdir -p $DEPLOY_DIR/dist"
rsync -az --no-owner --no-group --delete -e "$SSH" --rsync-path="sudo rsync" dist/ "$DEPLOY_HOST:$DEPLOY_DIR/dist/"
rsync -az --no-owner --no-group -e "$SSH" --rsync-path="sudo rsync" \
  deploy/docker-compose.yml deploy/nginx.conf "$DEPLOY_HOST:$DEPLOY_DIR/"

# Recreate only this container so a changed nginx.conf is picked up.
# The server has the standalone docker-compose binary, not the compose plugin.
$SSH "$DEPLOY_HOST" "sudo -i sh -c 'cd $DEPLOY_DIR && docker-compose up -d --force-recreate'"
echo "Deployed to $DEPLOY_HOST:$DEPLOY_DIR"
