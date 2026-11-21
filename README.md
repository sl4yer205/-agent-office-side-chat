# Agent Office — Side Chat HQ

Một văn phòng trực quan: **mỗi blob tròn là một side chat Muse có thật** của Ted.
Thay vì chọn chat từ danh sách, bạn vào phòng, nhìn trạng thái từng blob và bấm vào
blob để xem chi tiết, nhắn/giao việc, hoặc tạo bot (side chat) mới.

Đây là bản **dựng lại độc lập** của Muse Space cùng tên — giao diện theo chuẩn
Figma "A10 · Concept 1" (phòng góc tường lavender, sàn sage, blob tròn ~92px,
tay chấm cách thân một khoảng hở nhỏ) và toàn bộ cơ chế đồng bộ được giữ nguyên
qua một API server nhỏ đi kèm.

## Chạy local

```bash
npm install
npm run dev
```

- Giao diện: http://localhost:5173
- API server: http://localhost:8787 (tự chạy cùng lệnh `npm run dev`)

Chạy production (1 server duy nhất):

```bash
npm run build
npm run server   # http://localhost:8787 — vừa serve giao diện vừa là API
```

## Cách đồng bộ hoạt động

Trạng thái nằm ở `server/data.json` (tự tạo từ `server/seed.js` ở lần chạy đầu,
đã gitignore). Giao diện chỉ đọc/ghi qua API:

| Endpoint | Việc |
| --- | --- |
| `GET /api/state` | Toàn bộ: danh sách chat, hàng đợi (outbox), tin đã gửi, mốc đồng bộ cuối |
| `POST /api/send-message` `{chatId, text}` | Xếp một tin/giao việc vào outbox — hiện chip "Chờ đồng bộ" |
| `POST /api/create-bot` `{name, purpose, color}` | Xếp một yêu cầu tạo bot vào outbox |
| `POST /api/hq-sync` `{chats, processedIds}` | Đầu đồng bộ (agent bên ngoài) ghi trạng thái mới nhất của các side chat thật vào, đồng thời xác nhận các mục outbox đã xử lý → chúng chuyển thành "Đã gửi" |

Quy tắc hiển thị trạng thái của blob:

- `waiting` — đứng yên, hiện bong bóng thoại (chỉ khi có việc chờ người dùng chốt)
- `working` — thân thỉnh thoảng tan thành 3 chấm suy nghĩ
- `done` + `hop: true` — **chỉ lúc này** blob mới nhảy lên kèm tia burst để báo xong việc
- `idle` — nhún nhẹ, chớp mắt, mắt liếc theo con trỏ
- `sleeping` — xẹp người, nhắm mắt, "Zzz"

Spotlight tự chuyển lựa chọn mỗi 4 giây (tạm dừng sau khi người dùng tự chọn,
hoặc bấm nút tạm dừng trên header).

## Cấu trúc

```
server/
  server.js   API zero-dependency (node:http) + serve bản build
  seed.js     6 side chat gốc
src/
  App.jsx             bố cục + spotlight + gaze theo chuột
  components/Room.jsx phòng Figma A10 (SVG) + vị trí 6 trạm
  components/Blob.jsx blob: mắt liếc, chớp, 3 chấm, Zzz, nhảy khi xong
  components/SideColumn.jsx  cột thao tác duy nhất bên phải
scripts/dev.mjs  chạy server + Vite cùng lúc
```

## Ghi chú

- Bản Space trên Muse vẫn chạy độc lập với vòng đồng bộ riêng; repo này là bản
  sao để tự chỉnh sửa/chạy local. Muốn đồng bộ bản local với các side chat thật,
  cho một agent gọi `POST /api/hq-sync` vào `localhost:8787` theo đúng giao thức
  ở bảng trên.
- Màu blob lấy từ bộ Bloub (Jérémy Perret, MIT cho phần code).
