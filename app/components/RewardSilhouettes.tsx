/** 奖励物剪影（纯 SVG，便于本地预览与后续替换成实图） */

import type { ReactNode } from 'react';

type SilhouetteProps = { className?: string; label: string };

function Frame({
  className,
  label,
  children,
  accent,
}: SilhouetteProps & { children: ReactNode; accent: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className || ''}`}>
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-2xl ${accent}`}
      >
        {children}
      </div>
      <span className="text-center text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}

export function SilhouetteCard({ className, label }: SilhouetteProps) {
  return (
    <Frame className={className} label={label} accent="bg-rose-50 ring-1 ring-rose-200/80">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-rose-400/90" aria-hidden>
        <rect x="14" y="8" width="36" height="48" rx="4" fill="currentColor" opacity="0.85" />
        <circle cx="32" cy="28" r="10" fill="#fff" opacity="0.55" />
        <rect x="20" y="42" width="24" height="4" rx="2" fill="#fff" opacity="0.45" />
      </svg>
    </Frame>
  );
}

export function SilhouetteSpecialCard({ className, label }: SilhouetteProps) {
  return (
    <Frame
      className={className}
      label={label}
      accent="bg-amber-50 ring-1 ring-amber-300/70 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
    >
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-amber-500" aria-hidden>
        <rect x="14" y="10" width="36" height="44" rx="4" fill="currentColor" opacity="0.9" />
        <path
          d="M32 18l2.8 7.2H42l-5.8 4.4 2.2 7.2L32 32.8 25.6 36.8l2.2-7.2L22 25.2h7.2z"
          fill="#fff"
          opacity="0.85"
        />
      </svg>
    </Frame>
  );
}

export function SilhouetteGuard({ className, label }: SilhouetteProps) {
  return (
    <Frame className={className} label={label} accent="bg-sky-50 ring-1 ring-sky-200/80">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-sky-500/90" aria-hidden>
        <circle cx="32" cy="16" r="8" fill="currentColor" />
        <path
          d="M18 54c2-14 8-22 14-22s12 8 14 22"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M22 30h20l2 8H20z" fill="currentColor" opacity="0.55" />
      </svg>
    </Frame>
  );
}

export function SilhouetteAlbum({ className, label }: SilhouetteProps) {
  return (
    <Frame
      className={className}
      label={label}
      accent="bg-amber-50 ring-1 ring-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.4)]"
    >
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-amber-600" aria-hidden>
        <rect x="10" y="12" width="36" height="42" rx="3" fill="currentColor" opacity="0.35" />
        <rect x="16" y="10" width="36" height="42" rx="3" fill="currentColor" opacity="0.95" />
        <rect x="22" y="18" width="24" height="18" rx="2" fill="#fff" opacity="0.5" />
        <rect x="22" y="40" width="16" height="3" rx="1.5" fill="#fff" opacity="0.4" />
      </svg>
    </Frame>
  );
}

export function SilhouetteSleeve({ className, label }: SilhouetteProps) {
  return (
    <Frame className={className} label={label} accent="bg-slate-100 ring-1 ring-slate-300/80">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-slate-500" aria-hidden>
        <rect
          x="12"
          y="10"
          width="40"
          height="44"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.9"
        />
        <rect x="18" y="16" width="28" height="32" rx="2" fill="currentColor" opacity="0.25" />
      </svg>
    </Frame>
  );
}

export function SilhouetteLanyard({ className, label }: SilhouetteProps) {
  return (
    <Frame className={className} label={label} accent="bg-rose-50 ring-1 ring-rose-200/70">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-rose-500" aria-hidden>
        <path
          d="M20 8c0 12 4 18 12 22 8-4 12-10 12-22"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <rect x="24" y="30" width="16" height="22" rx="2" fill="currentColor" opacity="0.85" />
        <circle cx="32" cy="28" r="3" fill="currentColor" />
      </svg>
    </Frame>
  );
}

export function SilhouetteWish({ className, label }: SilhouetteProps) {
  return (
    <Frame className={className} label={label} accent="bg-pink-50 ring-1 ring-pink-200/80">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-pink-400" aria-hidden>
        <path
          d="M32 52S12 38 12 24c0-7 5-12 12-12 4 0 7 2 8 5 1-3 4-5 8-5 7 0 12 5 12 12 0 14-20 28-20 28z"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    </Frame>
  );
}
