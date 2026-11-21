import React, { useEffect, useRef } from 'react';

const BODY_RADIUS = 46;

function Desk() {
  return (
    <g className="desk" aria-hidden="true" transform="scale(.9 1)">
      <ellipse cx="0" cy="54" rx="70" ry="12" fill="#435b3d" opacity="0.12" />
      <path d="M-64 36h9v21h-9zm79 13h9v17h-9zm45-12h9v19h-9z" fill="#ae895f" />
      <path className="desk-top" d="M-74 26-21 8 74 28 21 49Z" />
      <path className="desk-front" d="M-74 26 21 49V57L-74 34Z" />
      <path d="M21 49 74 28V36L21 57Z" fill="#ad885c" />
      <g transform="translate(53 -13)">
        <path d="M-4 24h8l4 5H-8Z" fill="#414553" />
        <rect x="-18" width="36" height="24" rx="3" className="monitor" />
        <path d="M-13 18v-6h5v6zm8 0V7h5v11zm8 0V9h5v9zm8 0V4h4v14z" fill="#87acc9" />
      </g>
      <g transform="translate(-54 20) rotate(-10)">
        <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#faf7ef" />
        <path d="M-8-3H8M-8 1H4" stroke="#b7bdc2" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

function SpeechBubble({ x, y, targetX, targetY, text }) {
  const halfWidth = 82;
  const halfHeight = 21;
  const dx = targetX - x;
  const dy = targetY - y;
  const onSide = Math.abs(dx) > 90;
  const edgeX = onSide ? Math.sign(dx) * (halfWidth - 1) : Math.max(-65, Math.min(65, dx / 2));
  const edgeY = onSide ? Math.max(-7, Math.min(7, dy / 4)) : halfHeight - 1;
  const tipDistance = Math.hypot(dx - edgeX, dy - edgeY);
  const tipX = edgeX + (dx - edgeX) * 17 / tipDistance;
  const tipY = edgeY + (dy - edgeY) * 17 / tipDistance;
  const baseX = onSide ? 0 : 6;
  const baseY = onSide ? 6 : 0;

  return (
    <g className="bubble" transform={`translate(${x} ${y})`}>
      <title>{text}</title>
      <rect x={-halfWidth} y={-halfHeight} width={halfWidth * 2} height={halfHeight * 2} rx="12" />
      <path d={`M${edgeX - baseX} ${edgeY - baseY} L${tipX} ${tipY} L${edgeX + baseX} ${edgeY + baseY}`} pointerEvents="none" />
      <foreignObject x={-halfWidth + 10} y={-halfHeight + 5} width={halfWidth * 2 - 20} height={halfHeight * 2 - 10}>
        <div className="bubble-copy" title={text}><span>{text}</span></div>
      </foreignObject>
    </g>
  );
}

export default function Blob({ chat, slot, selected, gaze, onSelect, bobDelay, visible }) {
  const figure = useRef(null);
  const { x, y, bubble, plateWidth = 148 } = slot;
  const sleeping = chat.status === 'sleeping';
  const completed = chat.status === 'done' && Boolean(chat.hop);

  useEffect(() => {
    if (!completed || !figure.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hop = figure.current.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-12px)', offset: 0.42 },
      { transform: 'translateY(0)' },
    ], { duration: 550, easing: 'ease-in-out', iterations: 1 });
    return () => hop.cancel();
  }, [completed]);

  if (!visible) return null;

  const gx = gaze ? Math.max(-4.5, Math.min(4.5, (gaze.x - x) / 55)) : 0;
  const gy = gaze ? Math.max(-3.5, Math.min(3.5, (gaze.y - y) / 55)) : 0;
  const waitingText = chat.status === 'waiting' && (chat.bubble || chat.statusLabel);

  return (
    <g className="seat" transform={`translate(${x} ${y})`}>
      <Desk />
      <g className={`plate${selected ? ' active' : ''}`} transform="translate(0 47)" aria-hidden="true">
        <title>{`${chat.name} · ${chat.statusLabel}`}</title>
        <rect x={-plateWidth / 2} width={plateWidth} height="26" rx="7" />
        <foreignObject x={-plateWidth / 2 + 5} width={plateWidth - 10} height="26" pointerEvents="none">
          <div className="plate-copy">
            <div className="plate-name">{chat.name}</div>
            <div className="plate-status">{chat.statusLabel}</div>
          </div>
        </foreignObject>
      </g>

      <g
        className="blob-click"
        role="button"
        tabIndex={0}
        aria-label={`${chat.name} · ${chat.statusLabel}`}
        aria-description={waitingText || undefined}
        aria-pressed={selected}
        onClick={() => onSelect(chat.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(chat.id);
          }
        }}
      >
        <g ref={figure} aria-hidden="true">
          <g className="bob" style={{ animationDelay: `${bobDelay}s` }}>
            <g className="blob-body" fill={chat.color} transform={sleeping ? 'translate(0 16) scale(1 .66)' : undefined}>
              <circle cx="-57" cy="7" r="6.5" />
              <circle cx="57" cy="7" r="6.5" />
              <circle r={BODY_RADIUS} />
              {sleeping ? (
                <g fill="#fff">
                  <rect x="-19" y="-2" width="13" height="4.5" rx="2.25" />
                  <rect x="6" y="-2" width="13" height="4.5" rx="2.25" />
                </g>
              ) : (
                <g className="gaze" transform={`translate(${gx} ${gy})`}>
                  <g className="blink" fill="#fff" style={{ animationDelay: `${bobDelay}s` }}>
                    <rect x="-18" y="-12" width="11" height="20" rx="5.5" />
                    <rect x="7" y="-12" width="11" height="20" rx="5.5" />
                  </g>
                </g>
              )}
            </g>
            {chat.status === 'working' && (
              <g className="think-dots" fill="#fff">
                {[-13, 0, 13].map((dx, index) => (
                  <circle key={dx} cx={dx} cy="23" r="3.6" style={{ animationDelay: `${index * 0.14}s` }} />
                ))}
              </g>
            )}
          </g>
        </g>
      </g>

      {sleeping && <text className="zzz" x="37" y="-39" aria-hidden="true">Zzz</text>}
      {waitingText && <SpeechBubble x={bubble[0] - x} y={bubble[1] - y} targetX={0} targetY={0} text={waitingText} />}
    </g>
  );
}
