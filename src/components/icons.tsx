type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Без подписи иконка остаётся aria-hidden. */
  'aria-label'?: string;
};

function base({ size = 24, className, strokeWidth = 1.8, 'aria-label': label }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
  };
}

export const SendIcon = ({ size, className }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2 })}>
    <path d="M4.5 12h13" />
    <path d="M12 5.5 18.5 12 12 18.5" />
  </svg>
);

export const AttachIcon = ({ size, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <path d="M20 11.5 12.2 19.3a4.6 4.6 0 0 1-6.5-6.5l8.2-8.2a3.1 3.1 0 0 1 4.3 4.3l-8.2 8.2a1.5 1.5 0 0 1-2.2-2.2l7.4-7.4" />
  </svg>
);

export const SmileIcon = ({ size, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M9 14.2c.8 1.1 1.8 1.7 3 1.7s2.2-.6 3-1.7" />
    <path d="M9.3 9.6h.01M14.7 9.6h.01" strokeWidth={2.4} />
  </svg>
);

export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2.1 })}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m16 16 3.4 3.4" />
  </svg>
);

export const CheckIcon = ({ size = 15, className, ...rest }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2.4, ...rest })}>
    <path d="m4.5 12.5 4.8 4.8L19.5 7" />
  </svg>
);

export const DoubleCheckIcon = ({ size = 17, className, ...rest }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2.1, ...rest })}>
    <path d="m1.8 12.8 4.2 4.2L14.6 9" />
    <path d="m9 12.8 4.2 4.2L22 9" />
  </svg>
);

export const ClockIcon = ({ size = 15, className, ...rest }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2, ...rest })}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.6V12l2.8 1.8" />
  </svg>
);

export const AlertIcon = ({ size = 15, className, ...rest }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2, ...rest })}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.8v4.8" />
    <path d="M12 16h.01" strokeWidth={2.4} />
  </svg>
);

export const ChatIcon = ({ size = 28, className }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 1.6 })}>
    <path d="M20.5 11.4c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20l1.1-3.3A6.9 6.9 0 0 1 3.5 11.4c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
  </svg>
);

export const LogoutIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <path d="M14.5 5.5H6.8A1.8 1.8 0 0 0 5 7.3v9.4a1.8 1.8 0 0 0 1.8 1.8h7.7" />
    <path d="M17 9.2 20.5 12 17 14.8" />
    <path d="M20.5 12h-9.3" />
  </svg>
);

export const CloseIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2 })}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base({ size, className, strokeWidth: 2 })}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);

export const SpinnerIcon = ({ size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden
    style={{ animation: 'max-spin 0.9s linear infinite' }}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.6" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
);

export const TrashIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <path d="M5.5 7.5h13M9.5 7.5V6a1.4 1.4 0 0 1 1.4-1.4h2.2A1.4 1.4 0 0 1 14.5 6v1.5" />
    <path d="M7.2 7.5h9.6l-.7 11.1a1.7 1.7 0 0 1-1.7 1.6H9.6a1.7 1.7 0 0 1-1.7-1.6L7.2 7.5Z" />
  </svg>
);

export const EyeIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </svg>
);

export const EyeOffIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base({ size, className })}>
    <path d="M9.6 6.2A8.7 8.7 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.7 3.4" />
    <path d="M6.4 8A16.6 16.6 0 0 0 2.5 12S6 18.2 12 18.2a9.4 9.4 0 0 0 3.5-.66" />
    <path d="m4 4 16 16" />
  </svg>
);