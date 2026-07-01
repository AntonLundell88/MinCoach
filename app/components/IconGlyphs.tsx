"use client";

type IconProps = {
  className?: string;
};

export function SettingsGlyph({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M9.7 3.5h4.6l.55 2.45c.45.18.88.43 1.28.73l2.4-.75 2.3 3.98-1.84 1.7c.03.24.05.48.05.73s-.02.49-.05.73l1.84 1.7-2.3 3.98-2.4-.75c-.4.3-.83.55-1.28.73l-.55 2.45H9.7l-.55-2.45a7.18 7.18 0 0 1-1.28-.73l-2.4.75-2.3-3.98 1.84-1.7a6.3 6.3 0 0 1-.05-.73c0-.25.02-.49.05-.73l-1.84-1.7 2.3-3.98 2.4.75c.4-.3.83-.55 1.28-.73L9.7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export function ProfileGlyph({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M12 12.1a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M5.95 18.1c1.05-2.65 3.2-4.05 6.05-4.05s5 1.4 6.05 4.05"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6.75 6.75l10.5 10.5M17.25 6.75l-10.5 10.5"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SendGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20.2 4.6 10.9 20l-1.35-7.2-6.75-2.7 17.4-5.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.7 12.75 5.45-4.25"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8.25 5.75v12.5l10-6.25-10-6.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PauseGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M7.5 5.5h3.25v13H7.5v-13ZM13.25 5.5h3.25v13h-3.25v-13Z" fill="currentColor" />
    </svg>
  );
}

export function RotateGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M18.6 8.1a7.1 7.1 0 1 0 1 5.2"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
      />
      <path
        d="M18.95 4.65v3.9h-3.9"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoubleChevronDownGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m7 8.25 5 5 5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m7 14.25 5 5 5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PencilGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m5.35 15.7-.75 3.7 3.7-.75L18.55 8.4 15.6 5.45 5.35 15.7Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.45 6.6 2.95 2.95"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m5.5 12.4 4.15 4.15L18.8 7.45"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlagGlyph({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6.7 20V5.2m0 0c3.55-1.55 5.7 1.85 9.6.1v8.05c-3.9 1.75-6.05-1.65-9.6-.1V5.2Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
