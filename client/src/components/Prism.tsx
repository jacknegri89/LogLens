/**
 * The hero picture: many faint log lines converge on a glass prism and leave it
 * as a fan of separated rays. Purely decorative. While a log is being analysed
 * (`active`) the lines and rays move faster.
 */

// Where the incoming lines start on the left edge (y), and where they hit the prism.
const INCOMING_Y = [30, 75, 120, 165, 210, 255, 300, 345, 385];
const ENTRY = { x: 196, y: 202 };
const EXIT = { x: 310, y: 214 };

// The rays leave the prism in spectrum order. Each one is a possible severity colour.
const RAYS = [
  { y: 70, color: '#8f6bff' },
  { y: 130, color: '#4f8bff' },
  { y: 190, color: '#4fd6ff' },
  { y: 255, color: '#5dffb0' },
  { y: 320, color: '#ffc04d' },
  { y: 380, color: '#ff4f8b' },
];

export function Prism({ active }: { active: boolean }) {
  return (
    <svg
      className="prism h-auto w-full"
      viewBox="0 0 600 400"
      data-active={active}
      aria-hidden="true"
    >
      <defs>
        <filter id="prism-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id="prism-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#8f6bff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#4fd6ff" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      <g fill="none" strokeLinecap="round">
        {INCOMING_Y.map((y, i) => (
          <path
            key={y}
            className="prism-in"
            d={`M0 ${y} C 90 ${y}, 130 ${ENTRY.y}, ${ENTRY.x} ${ENTRY.y}`}
            stroke="#f1f3ff"
            strokeWidth="1.4"
            strokeOpacity={0.18 + (i % 3) * 0.14}
            style={{ animationDelay: `${i * -0.35}s` }}
          />
        ))}
      </g>

      {/* Glow under the rays */}
      <g filter="url(#prism-glow)" fill="none" strokeLinecap="round" opacity="0.8">
        <line x1={ENTRY.x} y1={ENTRY.y} x2={EXIT.x} y2={EXIT.y} stroke="#ffffff" strokeWidth="6" />
        {RAYS.map((ray) => (
          <line
            key={ray.color}
            x1={EXIT.x}
            y1={EXIT.y}
            x2="600"
            y2={ray.y}
            stroke={ray.color}
            strokeWidth="7"
          />
        ))}
      </g>

      <g fill="none" strokeLinecap="round">
        <line
          x1={ENTRY.x}
          y1={ENTRY.y}
          x2={EXIT.x}
          y2={EXIT.y}
          stroke="#ffffff"
          strokeWidth="2.4"
        />
        {RAYS.map((ray, i) => (
          <line
            key={ray.color}
            className="prism-ray"
            x1={EXIT.x}
            y1={EXIT.y}
            x2="600"
            y2={ray.y}
            stroke={ray.color}
            strokeWidth="2.6"
            style={{ animationDelay: `${i * -0.5}s, ${i * -0.7}s` }}
          />
        ))}
      </g>

      <polygon
        points="250,100 340,270 160,270"
        fill="url(#prism-glass)"
        stroke="#f1f3ff"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M250 100 L218 160"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
