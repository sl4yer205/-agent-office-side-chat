import React, { useCallback, useEffect, useRef, useState } from 'react';
import Room from './components/Room.jsx';
import { WorkList, DetailPanel } from './components/SideColumn.jsx';
import { getState, sendMessage, createBot } from './api.js';

export default function App() {
  const [data, setData] = useState({ chats: [], outbox: [], sent: [], lastSyncAt: null });
  const [selectedId, setSelectedId] = useState('config-agent');
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const [gaze, setGaze] = useState({ x: 620, y: 400 });
  const lastManualRef = useRef(0);
  const roomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await getState();
      setData(d);
    } catch {
      // server not up yet; keep last data
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // pick up sync results (hop, new bots, sent marks)
    return () => clearInterval(t);
  }, [load]);

  const chats = data.chats;
  const selected = chats.find((c) => c.id === selectedId) || chats[0] || null;

  const counts = {
    working: chats.filter((c) => c.status === 'working').length,
    waiting: chats.filter((c) => c.status === 'waiting').length,
    done: chats.filter((c) => c.status === 'done').length,
  };

  const select = useCallback((id) => {
    lastManualRef.current = Date.now();
    setSelectedId(id);
  }, []);

  // Spotlight: rotate the selection every 4s; pauses after a manual pick.
  useEffect(() => {
    if (spotlightPaused || chats.length < 2) return undefined;
    const t = setInterval(() => {
      if (Date.now() - lastManualRef.current < 15000) return;
      setSelectedId((cur) => {
        const idx = chats.findIndex((c) => c.id === cur);
        return chats[(idx + 1) % chats.length].id;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [spotlightPaused, chats]);

  const handleMouseMove = (e) => {
    const svg = roomRef.current && roomRef.current.querySelector('svg');
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    setGaze({
      x: ((e.clientX - r.left) / r.width) * 1240,
      y: ((e.clientY - r.top) / r.height) * 800,
    });
  };

  const handleSend = async (chatId, text) => {
    await sendMessage(chatId, text);
    await load();
  };

  const handleCreate = async (payload) => {
    await createBot(payload);
    await load();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">ao</span>
          <span className="brand-name">agent office</span>
        </div>
        <div className="counters">
          <span className="counter counter-working">
            <b>{counts.working}</b> đang chạy việc
          </span>
          <span className="counter counter-waiting">
            <b>{counts.waiting}</b> việc chờ QC
          </span>
          <span className="counter counter-done">
            <b>{counts.done}</b> việc đã xong
          </span>
        </div>
        <div className="header-right">
          <button className="spotlight-btn" onClick={() => setSpotlightPaused((v) => !v)}>
            {spotlightPaused ? '▶ Chạy spotlight' : '⏸ Tạm dừng spotlight'}
          </button>
          <span className="connected-pill">
            <span className="connected-dot" /> Connected
          </span>
          <span className="avatar">KT</span>
        </div>
      </header>

      <div className="main">
        <section className="room-wrap" ref={roomRef} onMouseMove={handleMouseMove}>
          <div className="room-head">
            <div>
              <h1>Side Chat HQ</h1>
              <p>{chats.length} side chat — tầng 1 làm việc, rảnh thì lên tầng 2 nghỉ</p>
            </div>
            <div className="spotlight-dots">
              {chats.map((c) => (
                <button
                  key={c.id}
                  title={c.name}
                  className={`sdot ${selected && c.id === selected.id ? 'on' : ''}`}
                  style={{ background: c.color }}
                  onClick={() => select(c.id)}
                />
              ))}
            </div>
          </div>
          <Room chats={chats} selectedId={selected ? selected.id : null} gaze={gaze} onSelect={select} />
          <div className="room-foot">
            {selected && (
              <>
                <span className="foot-dot" style={{ background: selected.color }} />
                Đang xem: <b>{selected.name}</b> — spotlight tự chuyển mỗi 4 giây, bấm vào blob để chọn.
              </>
            )}
          </div>
        </section>

        <div className="below">
          <WorkList chats={chats} selected={selected} outbox={data.outbox} onSelect={select} />
          <DetailPanel
            chats={chats}
            selected={selected}
            outbox={data.outbox}
            sent={data.sent}
            lastSyncAt={data.lastSyncAt}
            onSendMessage={handleSend}
            onCreateBot={handleCreate}
          />
        </div>
      </div>
    </div>
  );
}
