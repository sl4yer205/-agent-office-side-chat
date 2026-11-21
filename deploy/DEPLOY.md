# Deploy Agent Office lên VPS với domain thegioidongvat.loc.cc

Kiến trúc: VPS chạy app (Node, cổng nội bộ 8787, systemd tự khởi động lại) sau
**Caddy** — Caddy tự xin HTTPS Let's Encrypt và khoá **basic auth** trước toàn bộ site.

> Vì sao có khoá: office không có đăng nhập riêng, mà ô nhắn/tạo bot của nó được
> vòng sync chuyển thẳng vào các side chat Muse thật. Không khoá = ai có link
> cũng nhắn vào chat của bạn được. Đừng bỏ basic auth.

## Bước 1 — Trỏ DNS trên Yunamo (làm trước, ~5 phút + chờ lan truyền)

1. Vào yunamo.com → domain `thegioidongvat.loc.cc` → **Manage** → mục DNS records.
2. Thêm bản ghi: type **A**, host **`@`** (nếu panel không nhận `@` thì để trống), value = **IP public của VPS**.
3. Nếu có sẵn bản ghi A/CNAME cũ trỏ đi nơi khác cho cùng host thì xoá.
4. Yunamo có health check: domain phải trỏ tới site chạy được trong 30 ngày —
   làm xong bước 2–3 trong hôm nay là qua.

## Bước 2 — Mở cổng trên VPS

- Firewall của hãng VPS (nếu có, vd Oracle Cloud → VCN Security List): mở ingress **80** và **443**.
- SSH (22) giữ như hiện tại.

## Bước 3 — Cài app (trên VPS, Ubuntu/Debian)

Cách nhanh (từ máy có sẵn thư mục repo này):

```bash
bash deploy/push-to-vps.sh user@IP_VPS
```

Hoặc thủ công trên VPS: copy thư mục repo lên, rồi:

```bash
sudo bash deploy/install.sh
```

Script sẽ hỏi đặt mật khẩu basic auth (user mặc định `ted`), cài Node 20 nếu
thiếu, build, tạo service `agent-office`, cài Caddy và bật HTTPS.

## Bước 4 — Kiểm chứng

- Mở `https://thegioidongvat.loc.cc` → trình duyệt hỏi user/mật khẩu → vào được phòng office là xong.
- Trên VPS: `systemctl status agent-office caddy` và `curl -s http://127.0.0.1:8787/api/state`.
- Nếu HTTPS chưa có ngay: DNS chưa lan truyền — chờ vài phút, `sudo systemctl restart caddy`.

## Vận hành

- Cập nhật code: chạy lại `push-to-vps.sh` (data `server/data.json` trên VPS được giữ nguyên).
- Xem log: `journalctl -u agent-office -f`.
- Đổi mật khẩu: chạy lại `sudo OFFICE_PASSWORD='mới' bash deploy/install.sh` trong thư mục source trên VPS.
- Đồng bộ 2 chiều: vòng sync hiện vẫn ghi vào bản Space. Muốn bản VPS này là
  bản chính, cho agent gọi `POST https://thegioidongvat.loc.cc/api/hq-sync`
  (kèm basic auth) theo cùng giao thức — việc riêng, làm khi Ted chốt chuyển hẳn.
