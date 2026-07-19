export function Logo({ size = 40, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={animated ? 'animate-[float_6s_ease-in-out_infinite]' : ''}
    >
      <defs>
        <linearGradient id="snapix-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3385ff">
            {animated && (
              <animate attributeName="stop-color" values="#3385ff;#ff4281;#06cf7e;#3385ff" dur="6s" repeatCount="indefinite" />
            )}
          </stop>
          <stop offset="0.5" stopColor="#ff4281">
            {animated && (
              <animate attributeName="stop-color" values="#ff4281;#06cf7e;#3385ff;#ff4281" dur="6s" repeatCount="indefinite" />
            )}
          </stop>
          <stop offset="1" stopColor="#06cf7e">
            {animated && (
              <animate attributeName="stop-color" values="#06cf7e;#3385ff;#ff4281;#06cf7e" dur="6s" repeatCount="indefinite" />
            )}
          </stop>
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="16"
        stroke="url(#snapix-g)"
        strokeWidth="4"
        style={{ transformOrigin: 'center' }}
        className={animated ? 'animate-[ringSpin_8s_linear_infinite]' : ''}
      />
      <circle cx="32" cy="32" r="12" stroke="url(#snapix-g)" strokeWidth="4">
        {animated && (
          <animate attributeName="r" values="12;10;12" dur="3s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="44" cy="20" r="3" fill="url(#snapix-g)">
        {animated && (
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="font-display font-bold tracking-tight text-gradient"
      style={{ fontSize: size }}
    >
      Snapix
    </span>
  );
}
