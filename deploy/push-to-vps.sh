#!/usr/bin/env bash
# Đẩy code từ máy này lên VPS và chạy cài đặt — dùng khi đã có SSH vào VPS.
#
#   bash deploy/push-to-vps.sh user@IP
#
# Việc làm: đóng gói source (bỏ node_modules/dist/.git/data.json) → scp lên /tmp
# → giải nén vào ~/agent-office-src trên VPS → chạy sudo bash deploy/install.sh ở đó.
set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "Cách dùng: bash deploy/push-to-vps.sh user@IP" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_TAR="$(mktemp /tmp/agent-office-XXXXXX.tar.gz)"
trap 'rm -f "$TMP_TAR"' EXIT

tar -czf "$TMP_TAR" -C "$SRC_DIR" \
  --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  --exclude 'server/data.json' .
echo "Đã đóng gói $(du -h "$TMP_TAR" | cut -f1). Đang đẩy lên $HOST ..."
scp "$TMP_TAR" "$HOST:/tmp/agent-office.tar.gz"
ssh -t "$HOST" 'mkdir -p ~/agent-office-src && tar -xzf /tmp/agent-office.tar.gz -C ~/agent-office-src && cd ~/agent-office-src && sudo bash deploy/install.sh'
echo "Xong. Mở https://thegioidongvat.loc.cc để kiểm chứng."
