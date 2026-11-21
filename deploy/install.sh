#!/usr/bin/env bash
# Agent Office — Side Chat HQ · cài lên VPS Ubuntu/Debian (chạy bằng sudo, từ thư mục gốc của repo)
#
#   sudo bash deploy/install.sh
#
# Việc script làm:
#   1. Cài Node.js 20 LTS nếu máy chưa có Node >= 18
#   2. Copy app vào /opt/agent-office, npm install + build
#   3. Tạo systemd service "agent-office" (tự chạy lại khi reboot / crash), cổng nội bộ 8787
#   4. Cài Caddy, dựng HTTPS tự động (Let's Encrypt) cho DOMAIN + khoá basic auth trước toàn site
#   5. Mở firewall ufw cho 80/443 nếu ufw đang bật
#
# Biến môi trường tuỳ chọn:
#   DOMAIN=thegioidongvat.loc.cc   (mặc định đúng domain này)
#   OFFICE_USER=ted                 (tên đăng nhập basic auth, mặc định: ted)
#   OFFICE_PASSWORD=...             (mật khẩu basic auth; để trống thì script hỏi khi chạy)
set -euo pipefail

DOMAIN="${DOMAIN:-thegioidongvat.loc.cc}"
OFFICE_USER="${OFFICE_USER:-ted}"
APP_DIR="/opt/agent-office"
SERVICE_USER="agentoffice"
PORT="8787"

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ ! -f "$SRC_DIR/package.json" ]; then
  echo "LỖI: không thấy package.json cạnh deploy/ — hãy chạy script từ bản copy của repo." >&2
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "LỖI: chạy bằng sudo: sudo bash deploy/install.sh" >&2
  exit 1
fi

echo "== 1/5 Node.js =="
if command -v node >/dev/null 2>&1 && [ "$(node -p 'parseInt(process.versions.node)')" -ge 18 ]; then
  echo "Đã có $(node --version), bỏ qua."
else
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "Đã cài $(node --version)."
fi

echo "== 2/5 Copy app vào $APP_DIR =="
id -u "$SERVICE_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
mkdir -p "$APP_DIR"
# Copy source, bỏ node_modules/dist/dữ liệu local — data.json trên VPS (nếu đã có) được giữ nguyên.
command -v rsync >/dev/null 2>&1 || apt-get install -y rsync
rsync -a --delete \
  --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  --exclude 'server/data.json' \
  "$SRC_DIR"/ "$APP_DIR"/
cd "$APP_DIR"
npm install --no-audit --no-fund
npm run build
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

echo "== 3/5 systemd service =="
cat > /etc/systemd/system/agent-office.service <<EOF
[Unit]
Description=Agent Office - Side Chat HQ (API + web)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now agent-office
sleep 1
curl -fsS "http://127.0.0.1:$PORT/api/state" >/dev/null && echo "API nội bộ OK (cổng $PORT)."

echo "== 4/5 Caddy + HTTPS + basic auth =="
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

if [ -z "${OFFICE_PASSWORD:-}" ]; then
  read -r -s -p "Đặt mật khẩu basic auth cho office (user: $OFFICE_USER): " OFFICE_PASSWORD
  echo
fi
HASH="$(caddy hash-password --plaintext "$OFFICE_PASSWORD")"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	basic_auth {
		$OFFICE_USER $HASH
	}
	reverse_proxy 127.0.0.1:$PORT
}
EOF
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy

echo "== 5/5 Firewall =="
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "ufw: đã mở 80/443. (Nhớ mở thêm ingress 80/443 trên panel của hãng VPS nếu có — vd Oracle Cloud VCN.)"
else
  echo "ufw không bật — đảm bảo panel của hãng VPS đã mở cổng 80/443."
fi

echo
echo "XONG. Kiểm tra: mở https://$DOMAIN — trình duyệt sẽ hỏi user/mật khẩu basic auth trước."
echo "Caddy tự xin chứng chỉ Let's Encrypt khi DNS đã trỏ về VPS này; nếu vừa đổi DNS, chờ vài phút rồi chạy: systemctl restart caddy"
