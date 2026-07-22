import { useRef, useState, useCallback } from 'react';

const GRADIENTS = [
  { from: '#ef4444', to: '#ec4899' },
  { from: '#facc15', to: '#f97316' },
  { from: '#ec4899', to: '#a855f7' },
];

interface Burst {
  id: number;
  x: number;
  y: number;
  colorIndex: number;
}

export function useDoubleTapLike(onDoubleTap: () => void) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const lastTap = useRef(0);
  const colorCounter = useRef(0);
  const burstId = useRef(0);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        const rect = e.currentTarget.getBoundingClientRect();
        let cx: number, cy: number;
        if ('touches' in e && e.touches.length > 0) {
          cx = e.touches[0].clientX;
          cy = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
          cx = e.changedTouches[0].clientX;
          cy = e.changedTouches[0].clientY;
        } else {
          cx = (e as React.MouseEvent<HTMLElement>).clientX;
          cy = (e as React.MouseEvent<HTMLElement>).clientY;
        }
        const x = cx - rect.left;
        const y = cy - rect.top;
        const colorIndex = colorCounter.current % GRADIENTS.length;
        colorCounter.current++;
        const id = burstId.current++;
        setBursts((b) => [...b, { id, x, y, colorIndex }]);
        setTimeout(() => setBursts((b) => b.filter((bs) => bs.id !== id)), 800);
        onDoubleTap();
      }
      lastTap.current = now;
    },
    [onDoubleTap],
  );

  return { bursts, handleTap };
}

export function LikeBurstOverlay({ bursts }: { bursts: Burst[] }) {
  return (
    <>
      {bursts.map((burst) => {
        const grad = GRADIENTS[burst.colorIndex];
        const gradId = `like-grad-${burst.id}`;
        return (
          <div
            key={burst.id}
            className="absolute pointer-events-none z-20"
            style={{ left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)' }}
          >
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              className="animate-like-burst drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={grad.from} />
                  <stop offset="100%" stopColor={grad.to} />
                </linearGradient>
              </defs>
              <path
                d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"
                fill={`url(#${gradId})`}
              />
            </svg>
            {Array.from({ length: 6 }).map((_, pi) => {
              const angle = (pi / 6) * Math.PI * 2;
              const dx = Math.cos(angle) * 60;
              const dy = Math.sin(angle) * 60;
              return (
                <span
                  key={pi}
                  className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-like-particle"
                  style={
                    {
                      background: grad.to,
                      '--dx': `${dx}px`,
                      '--dy': `${dy}px`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
