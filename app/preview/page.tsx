'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import RewardsNotice from '../components/RewardsNotice';
import LeaderboardBoard, { type BoardItem } from '../components/LeaderboardBoard';

type TabKey = 'rewards' | 'board';

/** 本地预览用假数据：凑满 48 人，便于看清三组与前七特效 */
function buildMockBoard(): BoardItem[] {
  const list: BoardItem[] = [];
  for (let i = 1; i <= 48; i++) {
    list.push({
      rank: i,
      user_id: i === 1 ? '冠军小海豹' : `预览用户_${String(i).padStart(2, '0')}`,
      total_times: Math.max(1, 120 - i * 2 + (i % 3)),
    });
  }
  return list;
}

export default function PreviewPage() {
  const [tab, setTab] = useState<TabKey>('rewards');
  const board = useMemo(() => buildMockBoard(), []);

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-white shadow-sm">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 sm:text-sm">
        🧪 <strong>本地预览模式</strong>
        ：精简特效版（角标 OPERATOR / CANDIDATE / RECRUIT）· 确认后再推送
        <span className="mx-1.5 text-amber-300">|</span>
        <Link href="/" className="underline underline-offset-2 hover:text-amber-700">
          返回正式首页
        </Link>
      </div>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <h1 className="text-base font-semibold text-slate-900 md:text-lg">预览 · 任务参与统计</h1>
        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-600">
          PREVIEW
        </span>
      </header>

      <div className="flex border-b border-slate-200">
        {(
          [
            ['rewards', '🎁 奖励公告'],
            ['board', '🏆 排行榜 TOP48'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`min-h-12 flex-1 text-sm font-medium active:bg-slate-50 md:text-base ${
              tab === key ? 'border-b-2 border-rose-500 text-rose-700' : 'text-slate-500'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-4 py-5">
        {tab === 'rewards' && <RewardsNotice />}
        {tab === 'board' && (
          <LeaderboardBoard board={board} lastUpdate="2026-10-31 预览" />
        )}
      </main>
    </div>
  );
}
