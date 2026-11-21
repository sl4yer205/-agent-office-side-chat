import React, { useEffect, useState } from 'react';

// One round Bloub-style blob sitting at a desk.
// - White pill eyes that follow the cursor (gaze prop, in SVG units).
// - Dot arms in the body color, held a SMALL gap away from the body (Figma rule).
// - status working: body stays; 3 white thinking dots bounce on the belly.
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

  const gx = Math.max(-4.5, Math.min(4.5, (gaze.x - x) / 55));
  const gy = Math.max(-3.5, Math.min(3.5, (gaze.y - y) / 55));
  const sleeping = chat.status === 'sleeping';
  const hopping = chat.status === 'done' && chat.hop;

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* selection halo on the floor */}
      {selected && <ellipse className="halo" cx="0" cy="82" rx="116" ry="19" />}

      {/* desk */}
      <g className="desk">
        <polygon className="desk-top" points="-102,26 -34,4 102,26 34,50" />
        <polygon className="desk-front" points="-102,26 34,50 34,64 -102,40" />
        {/* monitor */}
        <g transform="translate(38 -16)">
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
      <g className="plate" transform="translate(0 80)">
        <rect x="-74" y="-17" width="148" height="34" rx="9" />
        <text className="plate-name" y="-1">{chat.name}</text>
        <text className="plate-status" y="12">{chat.statusLabel}</text>
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
                  x1={Math.sin((a * Math.PI) / 180) * 50}
                  y1={-Math.cos((a * Math.PI) / 180) * 50}
                  x2={Math.sin((a * Math.PI) / 180) * 63}
                  y2={-Math.cos((a * Math.PI) / 180) * 63}
                />
              ))}
            </g>
          )}

          <g transform={sleeping ? 'scale(1 0.84)' : undefined}>
            {/* dot arms: small gap from the body, same color */}
            <circle cx="-52" cy="7" r="7" fill={chat.color} />
            <circle cx="52" cy="7" r="7" fill={chat.color} />
            <circle cx="0" cy="0" r="42" fill={chat.color} />
            {sleeping ? (
              <g fill="#ffffff">
                <rect x="-20" y="-3" width="13.5" height="4.2" rx="2.1" />
                <rect x="6.5" y="-3" width="13.5" height="4.2" rx="2.1" />
              </g>
            ) : (
              <g transform={`translate(${gx} ${gy})`}>
                <g className="blink">
                  <ellipse cx="-13.5" cy="-3.5" rx="6.8" ry="10.5" fill="#ffffff" />
                  <ellipse cx="13.5" cy="-3.5" rx="6.8" ry="10.5" fill="#ffffff" />
                </g>
              </g>
            )}
          </g>

          {/* thinking: body stays, three white dots bounce on the belly */}
          {thinking && !sleeping && (
            <g className="think-dots">
              {[-15, 0, 15].map((dx, i) => (
                <circle key={dx} cx={dx} cy="16" r="5.5" fill="#ffffff" opacity="0.95" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </g>
          )}
        </g>
      </g>

      {/* sleeping Zzz */}
      {sleeping && (
        <text className="zzz" x="46" y="-44">Zzz</text>
      )}

      {/* waiting speech bubble */}
      {chat.status === 'waiting' && chat.bubble && (
        <g className="bubble" transform="translate(-104 -84)">
          <rect x="-110" y="-19" width="220" height="32" rx="12" />
          <polygon points="86,13 102,13 92,24" />
          <text y="1">{chat.bubble}</text>
        </g>
      )}
    </g>
  );
}
