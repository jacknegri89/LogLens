import { useId, type CSSProperties } from 'react';

import type { ThreadGeometry } from '../hooks/useThreadGeometry';

/** Seconds between one thread and the next, so the chain is drawn root first, effect by effect. */
const THREAD_STAGGER = 0.35;

/**
 * The red thread between pinned cards. Pure decoration: the same links are written on the
 * cards ("Set off by E1"), so it is hidden from screen readers. A pin head is drawn again
 * on each end, so the thread looks tied under the pin.
 */
export function CausalThread({ geometry }: { geometry: ThreadGeometry }) {
  const gradientId = useId();
  const { width, height, threads } = geometry;
  return (
    <svg
      className="report-thread"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <PinGradient id={gradientId} />
      {threads.map((thread, order) => (
        <g
          key={thread.key}
          style={{ '--thread-delay': `${0.2 + order * THREAD_STAGGER}s` } as CSSProperties}
        >
          <path d={thread.path} pathLength={1} className="red-thread red-thread-draw" />
          <circle cx={thread.from.x} cy={thread.from.y} r={9} fill={`url(#${gradientId})`} />
          <circle cx={thread.to.x} cy={thread.to.y} r={9} fill={`url(#${gradientId})`} />
        </g>
      ))}
    </svg>
  );
}

function PinGradient({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={id} cx="0.4" cy="0.36" r="0.7">
        <stop offset="0" style={{ stopColor: 'var(--color-paper)', stopOpacity: 0.8 }} />
        <stop offset="0.16" style={{ stopColor: 'var(--color-pen)' }} />
        <stop offset="1" style={{ stopColor: 'var(--color-pen-deep)' }} />
      </radialGradient>
    </defs>
  );
}
