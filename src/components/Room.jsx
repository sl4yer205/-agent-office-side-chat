import React from 'react';
import Blob from './Blob.jsx';

// Seat coordinates leave room for the desk, nameplate, and the blob at full hop
// inside the diamond centered at (460, 425) with radii of 440 and 235.
const SLOTS = [
  { id: 'canton-network', x: 316, y: 338, bubble: [294, 252] },
  { id: 'deepseek-bot', x: 460, y: 305, bubble: [466, 215] },
  { id: 'hot-repo', x: 604, y: 342, bubble: [756, 344] },
  { id: 'config-agent', x: 329, y: 474, bubble: [184, 441], plateWidth: 122 },
  { id: 'custom-cursor', x: 460, y: 516, bubble: [460, 439] },
  { id: 'agent-office', x: 591, y: 478, bubble: [737, 443], plateWidth: 122 },
];
const CORE_IDS = new Set(SLOTS.map(({ id }) => id));

function Bookshelf() {
  const spines = ['#c67a68', '#d8a451', '#77a986', '#719bc2', '#9579bf', '#c080a8'];
  return (
    <g transform="translate(93 239) skewY(-28.1)">
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
    <g transform="translate(576 106) skewY(28.1)">
      <rect x="0" y="0" width="168" height="102" rx="10" fill="#2e3440" />
      <rect x="10" y="10" width="148" height="82" rx="6" fill="#1f2733" />
      {bars.map((h, i) => (
        <rect key={i} x={22 + i * 22} y={92 - h} width="13" height={h - 6} rx="2" fill={i === 5 ? '#4cb998' : '#7392d0'} />
      ))}
      <text x="84" y="24" textAnchor="middle" fill="#e5e9f0" fontSize="11" fontWeight="700">
        HOẠT ĐỘNG TUẦN NÀY
      </text>
    </g>
  );
}

function Clock() {
  return (
    <g transform="translate(404 104)">
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

export default function Room({ chats, selectedId, onSelect }) {
  const [gaze, setGaze] = React.useState(null);
  const byId = new Map(chats.map((chat) => [chat.id, chat]));
  const extraChats = chats.filter((chat) => !CORE_IDS.has(chat.id));
  const selectedExtra = extraChats.findIndex(({ id }) => id === selectedId);
  const activePage = Math.floor(selectedExtra / SLOTS.length);

  const handlePointerMove = ({ clientX, clientY, currentTarget }) => {
    const matrix = currentTarget.getScreenCTM();
    if (matrix) setGaze(new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()));
  };

  return (
    <svg
      className="room-svg"
      viewBox="0 0 920 680"
      role="group"
      aria-label="Phòng office của các side chat"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setGaze(null)}
    >
      <g aria-hidden="true">
        <polygon points="20,425 460,190 460,20 20,255" fill="#e4ddf6" />
        <polygon points="460,190 900,425 900,255 460,20" fill="#d9d0f2" />
        <polygon points="20,425 460,190 900,425 460,660" fill="#a9c6a0" stroke="#8fae86" strokeWidth="2" />
        <polygon points="247,450 434,350 672,477 485,577" fill="#f4f1e6" opacity="0.2" />

        <Bookshelf />
        <ChartTv />
        <Clock />
        <Plant x={155} y={385} s={0.75} />
        <Plant x={765} y={387} s={0.85} />
      </g>

      {SLOTS.map((slot, index) => {
        const chat = byId.get(slot.id);
        return chat && <Blob key={chat.id} chat={chat} slot={slot} selected={chat.id === selectedId}
          gaze={gaze} onSelect={onSelect} bobDelay={index * 0.35} visible={activePage < 0} />;
      })}
      {extraChats.map((chat, index) => (
        <Blob key={chat.id} chat={chat} slot={SLOTS[index % SLOTS.length]} selected={chat.id === selectedId}
          gaze={gaze} onSelect={onSelect} bobDelay={(index % SLOTS.length) * 0.35}
          visible={Math.floor(index / SLOTS.length) === activePage} />
      ))}
    </svg>
  );
}
