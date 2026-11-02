'use client';

import { useEffect, useState } from 'react';

const WAIT_SECONDS = 5;

export default function NoticeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(WAIT_SECONDS);

  useEffect(() => {
    if (!open) return;
    setLeft(WAIT_SECONDS);
    const t = window.setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          window.clearInterval(t);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [open]);

  if (!open) return null;

  const canClose = left <= 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <h2
          id="notice-modal-title"
          className="text-center text-lg font-bold text-slate-900"
        >
          📢 重要提醒
        </h2>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>
            小红书、抖音吞赞严重，影响大屏正常解锁，麻烦各位卡推老师在不限量时，
            <span className="mt-2 block text-center text-xl font-extrabold leading-snug text-red-600 sm:text-2xl">
              缓做慢做，错峰做大屏
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={!canClose}
          onClick={onClose}
          className={`mt-6 min-h-12 w-full rounded-xl text-base font-semibold transition ${
            canClose
              ? 'bg-sky-600 text-white active:bg-sky-700'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          {canClose ? '我已知晓' : `我已知晓（${left}s）`}
        </button>
      </div>
    </div>
  );
}
