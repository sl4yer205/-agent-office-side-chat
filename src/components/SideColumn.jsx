import React, { useState } from 'react';

export const STATUS_DOT = {
  waiting: '#f0b429',
  working: '#3b93f0',
  done: '#3ecf8e',
  idle: '#a3a3a3',
  sleeping: '#8b93a7',
};

const BOT_COLORS = [
  ['#0a0a0c', 'Đen mực'],
  ['#8b5e3c', 'Nâu'],
  ['#e8483f', 'Đỏ'],
  ['#f08a24', 'Cam'],
  ['#f0b429', 'Vàng'],
  ['#3ecf8e', 'Xanh lá'],
  ['#2fbfa0', 'Ngọc'],
  ['#3b93f0', 'Xanh dương'],
  ['#8b5cf6', 'Tím'],
  ['#e152b0', 'Hồng'],
  ['#a3a3a3', 'Xám'],
  ['#f1efe9', 'Kem'],
];

function formatSync(iso) {
  if (!iso) return 'chưa có';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function SideColumn({ chats, selected, outbox, sent, lastSyncAt, onSelect, onSendMessage, onCreateBot }) {
  const [draft, setDraft] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [botName, setBotName] = useState('');
  const [botPurpose, setBotPurpose] = useState('');
  const [botColor, setBotColor] = useState('#2fbfa0');
  const [busy, setBusy] = useState(false);

  const pendingForChat = selected ? outbox.filter((i) => i.type === 'message' && i.chatId === selected.id) : [];
  const sentForChat = selected ? sent.filter((i) => i.type === 'message' && i.chatId === selected.id).slice(0, 3) : [];
  const pendingBots = outbox.filter((i) => i.type === 'create_bot');

  async function handleSend() {
    const text = draft.trim();
    if (!text || !selected || busy) return;
    setBusy(true);
    try {
      await onSendMessage(selected.id, text);
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!botName.trim() || busy) return;
    setBusy(true);
    try {
      await onCreateBot({ name: botName.trim(), purpose: botPurpose.trim(), color: botColor });
      setBotName('');
      setBotPurpose('');
      setShowCreate(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="side">
      <div className="side-section">
        <div className="side-title">
          SIDE CHATS
          {outbox.length > 0 && <span className="pending-badge">{outbox.length} tin chờ đồng bộ</span>}
        </div>
        <div className="chat-list">
          {chats.map((c) => (
            <button
              key={c.id}
              className={`chat-row ${selected && c.id === selected.id ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="chat-dot" style={{ background: c.color }} />
              <span className="chat-row-main">
                <span className="chat-row-name">{c.name}</span>
                <span className="chat-row-sub">{c.sub}</span>
              </span>
              <span className="chat-row-meta">
                <span className="status-chip">
                  <span className="status-dot" style={{ background: STATUS_DOT[c.status] || '#a3a3a3' }} />
                  {c.statusLabel}
                </span>
                <span className="chat-row-time">{c.lastActive}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="side-section detail">
          <div className="side-title">SIDE CHAT DETAIL</div>
          <div className="detail-head">
            <span className="chat-dot big" style={{ background: selected.color }} />
            <div>
              <div className="detail-name">{selected.name}</div>
              <div className="detail-sub">{selected.sub}</div>
            </div>
          </div>
          <div className="detail-task">{selected.task}</div>
          <ul className="checklist">
            {(selected.checklist || []).map((item, i) => {
              const text = typeof item === 'string' ? item : item.text;
              const done = typeof item === 'string' ? false : item.done;
              return (
                <li key={i} className={done ? 'done' : ''}>
                  <span className="check-mark">{done ? '✓' : '○'}</span>
                  {text}
                </li>
              );
            })}
          </ul>
          <div className="snippet">
            <div className="snippet-label">Hoạt động mới nhất · {selected.lastActive}</div>
            {selected.snippet}
          </div>

          <div className="msg-box">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Nhắn / giao việc cho ${selected.name}…`}
              rows={3}
            />
            <button className="send-btn" onClick={handleSend} disabled={busy || !draft.trim()}>
              Gửi
            </button>
          </div>
          {pendingForChat.map((i) => (
            <div key={i.id} className="queue-item">
              <span className="queue-text">{i.text}</span>
              <span className="chip chip-wait">Chờ đồng bộ</span>
            </div>
          ))}
          {sentForChat.map((i) => (
            <div key={i.id} className="queue-item sent">
              <span className="queue-text">{i.text}</span>
              <span className="chip chip-sent">Đã gửi</span>
            </div>
          ))}
        </div>
      )}

      <div className="side-section">
        {!showCreate ? (
          <button className="create-btn" onClick={() => setShowCreate(true)}>
            ＋ Tạo bot mới
          </button>
        ) : (
          <div className="create-form">
            <div className="side-title">TẠO BOT MỚI (SIDE CHAT)</div>
            <input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="Tên bot" />
            <input value={botPurpose} onChange={(e) => setBotPurpose(e.target.value)} placeholder="Mục đích của bot" />
            <div className="swatches">
              {BOT_COLORS.map(([hex, label]) => (
                <button
                  key={hex}
                  title={label}
                  className={`swatch ${botColor === hex ? 'picked' : ''}`}
                  style={{ background: hex }}
                  onClick={() => setBotColor(hex)}
                />
              ))}
            </div>
            <div className="create-actions">
              <button className="send-btn" onClick={handleCreate} disabled={busy || !botName.trim()}>
                Tạo bot
              </button>
              <button className="ghost-btn" onClick={() => setShowCreate(false)}>
                Huỷ
              </button>
            </div>
          </div>
        )}
        {pendingBots.map((i) => (
          <div key={i.id} className="queue-item">
            <span className="chat-dot" style={{ background: i.color }} />
            <span className="queue-text">{i.name} — {i.purpose || 'bot mới'}</span>
            <span className="chip chip-wait">Đang chờ đồng bộ tạo bot</span>
          </div>
        ))}
      </div>

      <div className="side-footer">Đồng bộ lần cuối: {formatSync(lastSyncAt)}</div>
    </aside>
  );
}
