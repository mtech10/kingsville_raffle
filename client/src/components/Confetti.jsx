import { useMemo } from 'react';

const COLORS = ['#D4AF37', '#EBD78F', '#10B981', '#34D399', '#FFFFFF', '#F5EBC4'];

/** Pure-CSS confetti burst (no dependency). Pieces are generated once per mount. */
export default function Confetti({ pieces = 90 }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const round = i % 3 === 0;
        const size = 6 + Math.random() * 8;
        return {
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.9,
          duration: 2.8 + Math.random() * 2.4,
          width: size,
          height: round ? size : size * 0.45,
          round,
          drift: (Math.random() - 0.5) * 180,
          rotate: 360 + Math.random() * 720,
          color: COLORS[i % COLORS.length],
        };
      }),
    [pieces],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[130] overflow-hidden">
      {items.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: p.round ? '9999px' : '1px',
            opacity: 0,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
