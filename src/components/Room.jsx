import React from 'react';
import Blob from './Blob.jsx';

// The office room, drawn like the Figma "A10 · Concept 1" frame:
// corner room, pale lavender walls, sage floor, chart TV, bookshelf, clock, plants.
// Desk assignment mirrors the Figma HQ frame (back diagonal row, then front row).
const SLOTS = [
  { id: 'canton-network', x: 292, y: 252 },
  { id: 'deepseek-bot', x: 472, y: 288 },
  { id: 'hot-repo', x: 652, y: 324 },
  { id: 'config-agent', x: 226, y: 398 },
  { id: 'custom-cursor', x: 386, y: 440 },
  { id: 'agent-office', x: 546, y: 470 },
];

function Bookshelf() {
  const spines = ['#e8483f', '#f0b429', '#3ecf8e', '#3b93f0', '#8b5cf6', '#e152b0'];
  return (
    <g transform="translate(96 150)">
      <rect x="0" y="0" width="118" height="138" rx="6" fill="#b08968" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="8" y={10 + row * 44} width="102" height="30" rx="3" fill="#8a6844" />
          {spines.map((c, i) => (
            <rect
              key={i}
              x={14 + i * 16}
              y={14 + row * 44}
              width="10"
              height="22"
              rx="2"
              fill={c}
              opacity="0.9"
            />
          ))}
          <rect x="6" y={40 + row * 44} width="106" height="5" rx="2" fill="#6f5133" />
        </g>
      ))}
    </g>
  );
}

function ChartTv() {
  const bars = [26, 40, 32, 52, 44, 62];
  return (
    <g transform="translate(600 84)">
      <rect x="0" y="0" width="168" height="102" rx="10" fill="#2e3440" />
      <rect x="10" y="10" width="148" height="82" rx="6" fill="#1f2733" />
      {bars.map((h, i) => (
        <rect key={i} x={22 + i * 22} y={84 - h} width="13" height={h} rx="3" fill={i === 5 ? '#3ecf8e' : '#5b8def'} />
      ))}
      <text x="84" y="24" textAnchor="middle" fill="#e5e9f0" fontSize="11" fontWeight="700">
        HOẠT ĐỘNG TUẦN NÀY
      </text>
    </g>
  );
}

function Clock() {
  return (
    <g transform="translate(404 100)">
      <circle r="27" fill="#ffffff" stroke="#c9cfda" strokeWidth="3" />
      <line x1="0" y1="0" x2="0" y2="-15" stroke="#2e3440" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="0" y1="0" x2="10" y2="6" stroke="#2e3440" strokeWidth="3.5" strokeLinecap="round" />
      <circle r="3.5" fill="#e8483f" />
    </g>
  );
}

function Plant({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-16 18 h32 l-5 26 h-22 z" fill="#d96c47" />
      <circle cx="-12" cy="2" r="13" fill="#4e7a51" />
      <circle cx="12" cy="0" r="15" fill="#5d8a5f" />
      <circle cx="0" cy="-12" r="14" fill="#4e7a51" />
    </g>
  );
}

export default function Room({ chats, selectedId, gaze, onSelect }) {
  const byId = new Map(chats.map((c) => [c.id, c]));
  const placed = SLOTS.filter((s) => byId.has(s.id)).map((s) => ({ chat: byId.get(s.id), ...s }));
  const known = new Set(SLOTS.map((s) => s.id));
  chats
    .filter((c) => !known.has(c.id))
    .forEach((c, i) => placed.push({ chat: c, x: 742, y: 428 + i * 6, id: c.id }));

  return (
    <svg className="room-svg" viewBox="0 0 920 680" role="img" aria-label="Phòng office của các side chat">
      {/* walls */}
      <polygon points="20,310 460,190 460,20 20,140" fill="#e4ddf6" />
      <polygon points="460,190 900,310 900,140 460,20" fill="#d9d0f2" />
      {/* floor */}
      <polygon points="20,310 460,190 900,310 460,660" fill="#a9c6a0" />
      <polygon points="20,310 460,190 900,310 460,660" fill="none" stroke="#8fae86" strokeWidth="3" />
      {/* rug */}
      <ellipse cx="460" cy="448" rx="250" ry="54" fill="#f4f1e6" opacity="0.35" />

      <Bookshelf />
      <ChartTv />
      <Clock />
      <Plant x={110} y={452} />
      <Plant x={806} y={452} s={1.1} />
      <Plant x={452} y={208} s={0.8} />

      {placed.map(({ chat, x, y }, i) => (
        <Blob
          key={chat.id}
          chat={chat}
          x={x}
          y={y}
          selected={chat.id === selectedId}
          gaze={gaze}
          onSelect={onSelect}
          bobDelay={i * 0.35}
        />
      ))}
    </svg>
  );
}
