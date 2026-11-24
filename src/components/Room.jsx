import React from 'react';
import Blob from './Blob.jsx';

// The office as a two-storey building cross-section (like the reference video):
// - Floor 1 (work): blobs with an active job sit at desks.
// - Floor 2 (lounge): idle / sleeping blobs rest upstairs.
// Wide, airy stage: viewBox 1240x800, blobs stay ~92px like the Figma standard.
const DESK_SLOTS = [
  { x: 240, y: 520 },
  { x: 560, y: 520 },
  { x: 880, y: 520 },
  { x: 340, y: 668 },
  { x: 660, y: 668 },
  { x: 980, y: 668 },
];

const REST_SLOTS = [
  { x: 210, y: 240 },
  { x: 390, y: 240 },
  { x: 570, y: 240 },
  { x: 750, y: 240 },
  { x: 930, y: 240 },
  { x: 1110, y: 240 },
];

const DESK_STATUSES = new Set(['working', 'waiting', 'done']);

function Bookshelf() {
  const spines = ['#e8483f', '#f0b429', '#3ecf8e', '#3b93f0', '#8b5cf6', '#e152b0'];
  return (
    <g transform="translate(48 108)">
      <rect x="0" y="0" width="98" height="150" rx="6" fill="#b08968" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="7" y={9 + row * 48} width="84" height="32" rx="3" fill="#8a6844" />
          {spines.map((c, i) => (
            <rect key={i} x={12 + i * 13} y={13 + row * 48} width="9" height="24" rx="2" fill={c} opacity="0.9" />
          ))}
          <rect x="5" y={41 + row * 48} width="88" height="5" rx="2" fill="#6f5133" />
        </g>
      ))}
    </g>
  );
}

function LoungeTv() {
  return (
    <g transform="translate(545 92)">
      <rect x="0" y="0" width="200" height="98" rx="10" fill="#2e3440" />
      <rect x="9" y="9" width="182" height="80" rx="6" fill="#31445c" />
      <circle cx="100" cy="49" r="17" fill="#f0b429" opacity="0.9" />
      <path d="M30 74 Q70 44 105 58 T172 40" fill="none" stroke="#7dd3fc" strokeWidth="4" strokeLinecap="round" />
      <text x="100" y="24" textAnchor="middle" fill="#e5e9f0" fontSize="11" fontWeight="700">
        PHÒNG GIẢI TRÍ
      </text>
    </g>
  );
}

function Clock() {
  return (
    <g transform="translate(330 106)">
      <circle r="24" fill="#ffffff" stroke="#c9cfda" strokeWidth="3" />
      <line x1="0" y1="0" x2="0" y2="-13" stroke="#2e3440" strokeWidth="3.2" strokeLinecap="round" />
      <line x1="0" y1="0" x2="9" y2="5" stroke="#2e3440" strokeWidth="3.2" strokeLinecap="round" />
      <circle r="3.2" fill="#e8483f" />
    </g>
  );
}

function Whiteboard() {
  return (
    <g transform="translate(470 384)">
      <rect x="0" y="0" width="300" height="88" rx="8" fill="#ffffff" stroke="#c9cfda" strokeWidth="3" />
      <text x="16" y="26" fill="#40513c" fontSize="13" fontWeight="700">
        KẾ HOẠCH TUẦN
      </text>
      <path d="M16 66 L70 50 L118 58 L172 34 L226 42 L282 22" fill="none" stroke="#3b93f0" strokeWidth="4" strokeLinecap="round" />
      <rect x="16" y="34" width="64" height="6" rx="3" fill="#e3e8db" />
      <rect x="196" y="58" width="64" height="6" rx="3" fill="#e3e8db" />
    </g>
  );
}

function WindowPane() {
  return (
    <g transform="translate(66 392)">
      <rect x="0" y="0" width="176" height="88" rx="8" fill="#cfe8f7" stroke="#a9c6de" strokeWidth="3" />
      <line x1="88" y1="0" x2="88" y2="88" stroke="#a9c6de" strokeWidth="3" />
      <line x1="0" y1="44" x2="176" y2="44" stroke="#a9c6de" strokeWidth="3" />
      <circle cx="40" cy="24" r="11" fill="#f6d365" />
      <ellipse cx="128" cy="26" rx="20" ry="8" fill="#ffffff" opacity="0.85" />
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
  const deskChats = chats.filter((c) => DESK_STATUSES.has(c.status));
  const restChats = chats.filter((c) => !DESK_STATUSES.has(c.status));

  const placed = [];
  deskChats.forEach((chat, i) => {
    const slot = DESK_SLOTS[i % DESK_SLOTS.length];
    placed.push({ chat, ...slot, variant: 'desk' });
  });
  restChats.forEach((chat, i) => {
    const slot = REST_SLOTS[i % REST_SLOTS.length];
    placed.push({ chat, ...slot, variant: 'rest' });
  });

  return (
    <svg className="room-svg" viewBox="0 0 1240 800" role="img" aria-label="Văn phòng hai tầng của các side chat">
      {/* building shell */}
      <rect x="30" y="30" width="1180" height="740" rx="18" fill="#e7e1f8" />
      {/* roof band */}
      <path d="M30 48 a18 18 0 0 1 18 -18 h1144 a18 18 0 0 1 18 18 v14 h-1180 z" fill="#c9bdf0" />

      {/* floor 2 lounge surface */}
      <rect x="30" y="252" width="1180" height="70" fill="#ddd2f3" />
      {/* slab between floors */}
      <rect x="30" y="322" width="1180" height="30" fill="#b08968" />
      <rect x="30" y="322" width="1180" height="7" fill="#8a6844" />

      {/* floor 1 work surface */}
      <rect x="30" y="556" width="1180" height="214" fill="#a9c6a0" />
      <rect x="30" y="556" width="1180" height="7" fill="#8fae86" />

      {/* building outline */}
      <rect x="30" y="30" width="1180" height="740" rx="18" fill="none" stroke="#b7a8e3" strokeWidth="3" />

      {/* floor labels */}
      <text x="58" y="92" fill="#6b6390" fontSize="15" fontWeight="700" letterSpacing="2">
        TẦNG 2 · NGHỈ NGƠI
      </text>
      <text x="58" y="386" fill="#5c7052" fontSize="15" fontWeight="700" letterSpacing="2">
        TẦNG 1 · LÀM VIỆC
      </text>

      {/* floor 2 furniture */}
      <Bookshelf />
      <LoungeTv />
      <Clock />
      <ellipse cx="660" cy="300" rx="330" ry="16" fill="#f4f1e6" opacity="0.4" />
      <Plant x={1178} y={272} s={0.95} />

      {/* stairs down to floor 1 (right corner) */}
      <polygon
        points="1210,352 1210,478 1176,478 1176,444 1142,444 1142,410 1108,410 1108,376 1074,376 1074,352"
        fill="#c3a06d"
        stroke="#a37f4e"
        strokeWidth="2"
      />

      {/* floor 1 furniture */}
      <Whiteboard />
      <WindowPane />
      <Plant x={88} y={694} />
      <Plant x={1152} y={694} s={1.1} />

      {/* beanbags under resting blobs */}
      {placed
        .filter((p) => p.variant === 'rest')
        .map(({ chat, x, y }) => (
          <ellipse key={`bag-${chat.id}`} cx={x} cy={y + 45} rx="60" ry="13" fill={chat.color} opacity="0.28" />
        ))}

      {placed.map(({ chat, x, y, variant }, i) => (
        <Blob
          key={chat.id}
          chat={chat}
          x={x}
          y={y}
          variant={variant}
          bubbleFlip={variant === 'desk' && x <= 240}
          selected={chat.id === selectedId}
          gaze={gaze}
          onSelect={onSelect}
          bobDelay={i * 0.35}
        />
      ))}
    </svg>
  );
}
