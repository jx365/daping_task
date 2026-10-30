'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Lightbox from './components/Lightbox';
import Toast from './components/Toast';

type Detail = { task: string; times: number; images: string[] };
type UserResult = {
  found: boolean;
  user_id: string;
  sub_ids: string[];
  total_times: number;
  details: Detail[];
  rank?: number;
  total_players?: number;
  next_score?: number | null;
  times_needed?: number | null;
  target_rank?: number | null;
};
type BoardItem = { rank: number; user_id: string; total_times: number };

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'query' | 'board'>('query');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UserResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(() => {
      document.getElementById('search-result')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [result]);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setBoard(data.list || []);
      setLastUpdate(data.last_update || null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (tab === 'board') loadBoard();
  }, [tab, loadBoard]);

  async function doSearch(e?: FormEvent) {
    e?.preventDefault();
    const id = query.trim();
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      if (!data.found) {
        setNotFound(true);
        return;
      }
      setResult(data);
    } catch {
      setToast('查询失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setToast('密码错误');
        return;
      }
      const data = await res.json();
      sessionStorage.setItem('adminToken', data.token);
      setLoginOpen(false);
      router.push('/admin');
    } catch {
      setToast('登录失败');
    }
  }

  function formatUpdate(s: string | null) {
    if (!s) return '—';
    return s.slice(0, 16);
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-white shadow-sm md:my-0">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <h1 className="text-base font-semibold text-slate-900 md:text-lg">任务参与统计</h1>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl active:bg-slate-100"
          aria-label="管理员登录"
          onClick={() => setLoginOpen(true)}
        >
          ⚙️
        </button>
      </header>

      <div className="flex border-b border-slate-200">
        {(
          [
            ['query', 'ID 查询'],
            ['board', '排行榜'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`min-h-12 flex-1 text-sm font-medium active:bg-slate-50 md:text-base ${
              tab === key
                ? 'border-b-2 border-sky-600 text-sky-700'
                : 'text-slate-500'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="px-4 py-5">
        {tab === 'query' && (
          <div className="space-y-5">
            <form onSubmit={doSearch} className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-h-12 w-full flex-1 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-sky-500"
                placeholder="输入用户 ID / 昵称"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="min-h-12 rounded-lg bg-sky-600 px-6 text-white active:bg-sky-700 disabled:opacity-60 sm:w-28"
              >
                {loading ? '查询中' : '查询'}
              </button>
            </form>

            {notFound && (
              <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-slate-500">
                未查询到该 ID 的参与记录
              </p>
            )}

            {result && (
              <div
                id="search-result"
                className="space-y-4 rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">用户 ID</div>
                    <div className="text-lg font-semibold">{result.user_id}</div>
                    {result.sub_ids?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.sub_ids.map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">参与总次数</div>
                    <div className="text-3xl font-bold text-sky-600">{result.total_times}</div>
                  </div>
                </div>

                {typeof result.rank === 'number' && (
                  <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                    <div>
                      位次：第 <span className="font-semibold">{result.rank}</span> 名
                      {typeof result.total_players === 'number' && (
                        <span className="text-sky-700"> / 共 {result.total_players} 人</span>
                      )}
                    </div>
                    {result.rank === 1 ? (
                      <div className="mt-1 text-amber-700">已是第 1 名</div>
                    ) : (
                      typeof result.times_needed === 'number' &&
                      typeof result.target_rank === 'number' && (
                        <div className="mt-1">
                          再完成{' '}
                          <span className="font-semibold">{result.times_needed}</span>{' '}
                          次，即可成为第{' '}
                          <span className="font-semibold">{result.target_rank}</span> 名！
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="hidden w-full min-w-[480px] text-left text-sm md:table">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="py-2 pr-3 font-medium">任务名称</th>
                        <th className="py-2 pr-3 font-medium">参与次数</th>
                        <th className="py-2 font-medium">凭证图片</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details?.map((d) => (
                        <tr key={d.task} className="border-b border-slate-100 align-top">
                          <td className="py-3 pr-3">{d.task}</td>
                          <td className="py-3 pr-3">{d.times}</td>
                          <td className="py-3">
                            <div className="grid grid-cols-6 gap-2">
                              {d.images?.map((img) => (
                                <button
                                  key={img}
                                  type="button"
                                  className="h-16 w-16 overflow-hidden rounded border active:opacity-80"
                                  onClick={() => setLightbox(`/api/files/${encodeURIComponent(img)}`)}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/files/${encodeURIComponent(img)}`}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="space-y-4 md:hidden">
                    {result.details?.map((d) => (
                      <div key={d.task} className="rounded-lg bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium">{d.task}</span>
                          <span className="text-sky-700">×{d.times}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {d.images?.map((img) => (
                            <button
                              key={img}
                              type="button"
                              className="aspect-square overflow-hidden rounded border bg-white active:opacity-80"
                              onClick={() => setLightbox(`/api/files/${encodeURIComponent(img)}`)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/files/${encodeURIComponent(img)}`}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'board' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">排名</th>
                    <th className="px-3 py-3 font-medium">用户ID</th>
                    <th className="px-3 py-3 font-medium">参与次数</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((item) => (
                    <tr
                      key={item.user_id}
                      className={`border-t border-slate-100 ${
                        item.rank <= 3 ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        {item.rank <= 3 ? (
                          <span className="text-base">
                            {medals[item.rank - 1]} {item.rank}
                          </span>
                        ) : (
                          item.rank
                        )}
                      </td>
                      <td className="px-3 py-3">{item.user_id}</td>
                      <td className="px-3 py-3 font-semibold text-sky-700">
                        {item.total_times}
                      </td>
                    </tr>
                  ))}
                  {board.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                        暂无排行数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-slate-400">
              上次更新时间：{formatUpdate(lastUpdate)}
            </p>
          </div>
        )}
      </main>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-semibold">管理员登录</h2>
            <input
              type="password"
              className="min-h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-500"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg border active:bg-slate-50"
                onClick={() => setLoginOpen(false)}
              >
                取消
              </button>
              <button
                type="submit"
                className="min-h-11 flex-1 rounded-lg bg-sky-600 text-white active:bg-sky-700"
              >
                登录
              </button>
            </div>
          </form>
        </div>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
