import React, { useEffect, useState } from 'react';

// One round Bloub-style blob sitting at a desk.
// - White pill eyes that follow the cursor (gaze prop, in SVG units).
// - Dot arms in the body color, held a SMALL gap away from the body (Figma rule).
// - status working: body periodically swaps to 3 bouncing thinking dots.
// - status sleeping: squashed body, closed eyes, floating Zzz.
// - status done + hop=true: hops with burst rays (completion notification only).
export default function Blob({ chat, x, y, selected, gaze, onSelect, bobDelay = 0 }) {
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (chat.status !== 'working') {
      setThinking(false);
      return undefined;
    }
    let dots;
    const show = () => {
      setThinking(true);
      dots = setTimeout(() => setThinking(false), 1600);
    };
    const first = setTimeout(show, 1200);
    const loop = setInterval(show, 5200);
    return () => {
      clearTimeout(first);
      clearTimeout(dots);
      clearInterval(loop);
    };
  }, [chat.status]);

  const gx = Math.max(-5, Math.min(5, (gaze.x - x) / 55));
  const gy = Math.max(-4, Math.min(4, (gaze.y - y) / 55));
  const sleeping = chat.status === 'sleeping';
  const hopping = chat.status === 'done' && chat.hop;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* selection halo on the floor */}
      {selected && <ellipse className="halo" cx="0" cy="86" rx="128" ry="22" />}

      {/* desk */}
      <g className="desk">
        <polygon className="desk-top" points="-102,26 -34,4 102,26 34,50" />
        <polygon className="desk-front" points="-102,26 34,50 34,64 -102,40" />
        {/* monitor */}
        <g transform="translate(34 -14)">
          <rect x="-30" y="-24" width="60" height="40" rx="5" className="monitor" />
          <rect x="-23" y="-17" width="34" height="5" rx="2.5" fill="#7dd3fc" />
          <rect x="-23" y="-8" width="44" height="5" rx="2.5" fill="#f0b429" />
          <rect x="-23" y="1" width="26" height="5" rx="2.5" fill="#3ecf8e" />
          <rect x="-4" y="16" width="8" height="7" className="monitor" />
        </g>
        {/* paper sheet */}
        <g transform="translate(-58 22) rotate(-6)">
          <rect x="-22" y="-14" width="44" height="30" rx="3" fill="#ffffff" />
          <rect x="-15" y="-7" width="30" height="4" rx="2" fill="#cbd5e1" />
          <rect x="-15" y="0" width="24" height="4" rx="2" fill="#cbd5e1" />
        </g>
      </g>

      {/* name plate on the front edge of the desk */}
      <g className="plate" transform="translate(0 84)">
        <rect x="-84" y="-17" width="168" height="36" rx="9" />
        <text className="plate-name" y="0">{chat.name}</text>
        <text className="plate-status" y="13">{chat.statusLabel}</text>
      </g>

      {/* the blob itself (clickable) */}
      <g
        className={`blob-click ${hopping ? 'hop' : ''}`}
        onClick={() => onSelect(chat.id)}
        style={{ cursor: 'pointer' }}
      >
        <g className="bob" style={{ animationDelay: `${bobDelay}s` }}>
          {hopping && (
            <g className="burst">
              {[-70, -45, -20, 0, 20, 45, 70].map((a) => (
                <line
                  key={a}
                  x1={Math.sin((a * Math.PI) / 180) * 56}
                  y1={-Math.cos((a * Math.PI) / 180) * 56}
                  x2={Math.sin((a * Math.PI) / 180) * 70}
                  y2={-Math.cos((a * Math.PI) / 180) * 70}
                />
              ))}
            </g>
          )}

          {thinking ? (
            <g className="think-dots">
              {[-30, 0, 30].map((dx, i) => (
                <circle key={dx} cx={dx} cy="0" r="14" fill={chat.color} style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </g>
          ) : (
            <g transform={sleeping ? 'scale(1 0.84)' : undefined}>
              {/* dot arms: small gap from the body, same color */}
              <circle cx="-57" cy="8" r="7.5" fill={chat.color} />
              <circle cx="57" cy="8" r="7.5" fill={chat.color} />
              <circle cx="0" cy="0" r="46" fill={chat.color} />
              {sleeping ? (
                <g fill="#ffffff">
                  <rect x="-22" y="-3" width="15" height="4.5" rx="2.25" />
                  <rect x="7" y="-3" width="15" height="4.5" rx="2.25" />
                </g>
              ) : (
                <g transform={`translate(${gx} ${gy})`}>
                  <g className="blink">
                    <ellipse cx="-15" cy="-4" rx="7.5" ry="11.5" fill="#ffffff" />
                    <ellipse cx="15" cy="-4" rx="7.5" ry="11.5" fill="#ffffff" />
                  </g>
                </g>
              )}
            </g>
          )}
        </g>
      </g>

      {/* sleeping Zzz */}
      {sleeping && (
        <text className="zzz" x="50" y="-48">Zzz</text>
      )}

      {/* waiting speech bubble */}
      {chat.status === 'waiting' && chat.bubble && (
        <g className="bubble" transform="translate(0 -104)">
          <rect x="-128" y="-21" width="256" height="34" rx="12" />
          <polygon points="-8,13 8,13 0,24" />
          <text y="2">{chat.bubble}</text>
        </g>
      )}
    </g>
  );
}
