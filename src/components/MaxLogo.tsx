type MaxLogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

export function MaxLogo({ size = 44, withWordmark = false, className }: MaxLogoProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="MAX"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="max-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7b45f0" />
            <stop offset="55%" stopColor="#9a3ce8" />
            <stop offset="100%" stopColor="#c23ad4" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#max-logo-gradient)" />
        <path
          d="M11 33.5 21.4 15.2a2.1 2.1 0 0 1 3.7.1l3.4 6"
          stroke="#fff"
          strokeWidth="3.1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M25.5 33.5h10.9"
          stroke="#fff"
          strokeWidth="3.1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M31 26.2 36.6 33.5"
          stroke="#fff"
          strokeWidth="3.1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {withWordmark ? (
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          MAX Чат
        </span>
      ) : null}
    </span>
  );
}