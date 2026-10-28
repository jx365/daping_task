'use client';

import { useEffect } from 'react';

type Props = {
  message: string | null;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, onClose, duration = 3500 }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[90] w-[min(92vw,420px)] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}
