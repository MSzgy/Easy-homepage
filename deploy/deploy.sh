#!/usr/bin/env bash
# Build locally, upload to the server, install the hourly data sync, and
# (re)start the easy-homepage container.
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
RSYNC="rsync -az --no-owner --no-group -e \"$SSH\" --rsync-path=\"sudo rsync\""

npm run build

$SSH "$DEPLOY_HOST" "sudo mkdir -p $DEPLOY_DIR/dist $DEPLOY_DIR/sync"
eval "$RSYNC --delete dist/ $DEPLOY_HOST:$DEPLOY_DIR/dist/"
eval "$RSYNC deploy/docker-compose.yml deploy/nginx.conf deploy/security-headers.conf $DEPLOY_HOST:$DEPLOY_DIR/"
eval "$RSYNC scripts/sources.mjs scripts/sync-live.mjs $DEPLOY_HOST:$DEPLOY_DIR/sync/"
eval "$RSYNC deploy/easy-homepage-sync.service deploy/easy-homepage-sync.timer $DEPLOY_HOST:/etc/systemd/system/"

# Run the sync once before the container starts, so /var/lib/easy-homepage is
# created by systemd (not by Docker) and live.json exists from the first request.
$SSH "$DEPLOY_HOST" "sudo -i sh -c 'systemctl daemon-reload && systemctl enable --now easy-homepage-sync.timer && systemctl start easy-homepage-sync.service'"

# The server has the standalone docker-compose binary, not the compose plugin.
$SSH "$DEPLOY_HOST" "sudo -i sh -c 'cd $DEPLOY_DIR && docker-compose up -d --force-recreate'"
echo "Deployed to $DEPLOY_HOST:$DEPLOY_DIR"
