'use client';

import { useEffect } from 'react';

type Props = {
  src: string | null;
  onClose: () => void;
  /** 前台查 ID 等场景：大图同样雾化 */
  blur?: boolean;
};

export default function Lightbox({ src, onClose, blur = false }: Props) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      onTouchStart={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="凭证大图"
        className={`max-h-full max-w-full object-contain ${
          blur ? 'scale-105 blur-[10px]' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />
    </div>
  );
}
