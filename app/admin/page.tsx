'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadModal from '../components/UploadModal';
import Lightbox from '../components/Lightbox';
import Toast from '../components/Toast';

type Detail = { task: string; times: number; images: string[] };
type SummaryItem = {
  id: number;
  user_id: string;
  sub_ids: string[];
  total_times: number;
  details: Detail[];
  manual?: boolean;
};
type AccountLink = { id: number; main_id: string; sub_id: string };

type TabKey = 'upload' | 'accounts' | 'view' | 'edit' | 'export';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upload', label: '上传 Excel' },
  { key: 'accounts', label: '关联账号' },
  { key: 'view', label: '查看汇总表' },
  { key: 'edit', label: '编辑汇总表' },
  { key: 'export', label: '下载汇总表' },
];

const MAX_FILE = 30 * 1024 * 1024;

function parseDetailsText(text: string, prev: Detail[] = []): Detail[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const m = line.match(/^(.*?)(?:\s*[×xX]\s*(\d+))?$/);
    const task = (m?.[1] || line).trim();
    const times = m?.[2] ? Number(m[2]) : 1;
    const old = prev.find((d) => d.task === task);
    return { task, times: Number.isFinite(times) ? times : 1, images: old?.images || [] };
  });
}

function matchesSearch(item: SummaryItem, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return false;
  if (item.user_id.toLowerCase().includes(q)) return true;
  return (item.sub_ids || []).some((s) => s.toLowerCase().includes(q));
}

export default function AdminPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [tab, setTab] = useState<TabKey>('upload');
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [mainId, setMainId] = useState('');
  const [subId, setSubId] = useState('');
  const [accounts, setAccounts] = useState<AccountLink[]>([]);

  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editDrafts, setEditDrafts] = useState<
    Record<number, { total_times: number; detailsText: string }>
  >({});

  const [searchTerm, setSearchTerm] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [newUserId, setNewUserId] = useState('');
  const [newDetailsText, setNewDetailsText] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem('adminToken');
    if (t === 'admin-ok') setToken(t);
    setReady(true);
  }, []);

  const loadSummaries = useCallback(async () => {
    const res = await fetch('/api/summary');
    const data = await res.json();
    setSummaries(data);
    const drafts: Record<number, { total_times: number; detailsText: string }> = {};
    for (const s of data as SummaryItem[]) {
      drafts[s.id] = {
        total_times: s.total_times,
        detailsText: (s.details || [])
          .map((d) => `${d.task} ×${d.times}`)
          .join('\n'),
      };
    }
    setEditDrafts(drafts);
  }, []);

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts');
    setAccounts(await res.json());
  }, []);

  useEffect(() => {
    if (!token) return;
    if (tab === 'view' || tab === 'edit') loadSummaries();
    if (tab === 'accounts') loadAccounts();
  }, [token, tab, loadSummaries, loadAccounts]);

  const matchIds = useMemo(
    () => summaries.filter((s) => matchesSearch(s, searchTerm)).map((s) => s.id),
    [summaries, searchTerm]
  );

  function locateMatch(next = true) {
    if (matchIds.length === 0) {
      setToast('未找到匹配的用户');
      setHighlightId(null);
      return;
    }
    const idx = next
      ? matchIndex % matchIds.length
      : (matchIndex - 1 + matchIds.length) % matchIds.length;
    const id = matchIds[idx];
    setMatchIndex((idx + 1) % matchIds.length);
    setHighlightId(id);
    setExpanded(id);
    requestAnimationFrame(() => {
      const nodes = document.querySelectorAll(`[data-summary-id="${id}"]`);
      const el = Array.from(nodes).find((n) => {
        const style = window.getComputedStyle(n as HTMLElement);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }) as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPwd }),
    });
    if (!res.ok) {
      setToast('密码错误');
      return;
    }
    const data = await res.json();
    sessionStorage.setItem('adminToken', data.token);
    setToken(data.token);
  }

  function onPickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    for (const f of files) {
      if (f.size > MAX_FILE) {
        setToast('单文件过大，请拆分后上传');
        return;
      }
    }
    setPendingFiles(files);
    setUploadOpen(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function addAccount(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify({ main_id: mainId.trim(), sub_id: subId.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || '添加失败');
      return;
    }
    setMainId('');
    setSubId('');
    setToast('关联已添加');
    loadAccounts();
    loadSummaries();
  }

  async function deleteAccount(id: number) {
    if (!confirm('确认删除该关联？')) return;
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    });
    if (!res.ok) {
      setToast('删除失败');
      return;
    }
    setToast('已删除关联');
    loadAccounts();
    loadSummaries();
  }

  async function saveRow(item: SummaryItem) {
    const draft = editDrafts[item.id];
    if (!draft) return;
    const details = parseDetailsText(draft.detailsText, item.details || []);
    const res = await fetch(`/api/summary/${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify({ total_times: draft.total_times, details }),
    });
    if (!res.ok) {
      setToast('保存失败');
      return;
    }
    setToast('已保存');
    loadSummaries();
  }

  async function deleteRow(id: number) {
    if (!confirm('确认删除该行？手动条目会被彻底删除；Excel 来源行重算后可能恢复。')) return;
    const res = await fetch(`/api/summary/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    });
    if (!res.ok) {
      setToast('删除失败');
      return;
    }
    setToast('已删除');
    loadSummaries();
  }

  async function createManual(e: FormEvent) {
    e.preventDefault();
    const user_id = newUserId.trim();
    const details = parseDetailsText(newDetailsText);
    if (!user_id) {
      setToast('请填写用户 ID');
      return;
    }
    if (details.length === 0) {
      setToast('请至少填写一条明细（任务名 ×次数）');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ user_id, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || '创建失败');
        return;
      }
      setToast(`已新增：${user_id}（共 ${data.total_times} 次）`);
      setNewUserId('');
      setNewDetailsText('');
      setSearchTerm(user_id);
      setMatchIndex(0);
      await loadSummaries();
      setTimeout(() => {
        const q = user_id.toLowerCase();
        const nodes = document.querySelectorAll('[data-summary-id]');
        for (const n of Array.from(nodes)) {
          const text = (n as HTMLElement).innerText.toLowerCase();
          if (text.includes(q)) {
            const id = Number((n as HTMLElement).getAttribute('data-summary-id'));
            setHighlightId(id);
            setExpanded(id);
            (n as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }, 150);
    } catch {
      setToast('创建失败');
    } finally {
      setCreating(false);
    }
  }

  function downloadExport() {
    window.location.href = '/api/summary/export';
  }

  if (!ready) {
    return <div className="p-8 text-center text-slate-400">加载中…</div>;
  }

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow"
        >
          <h1 className="text-center text-lg font-semibold">管理员登录</h1>
          <input
            type="password"
            className="min-h-12 w-full rounded-lg border px-3 outline-none focus:border-sky-500"
            placeholder="请输入密码"
            value={loginPwd}
            onChange={(e) => setLoginPwd(e.target.value)}
          />
          <button
            type="submit"
            className="min-h-12 w-full rounded-lg bg-sky-600 text-white active:bg-sky-700"
          >
            登录
          </button>
          <button
            type="button"
            className="min-h-11 w-full text-sm text-slate-500 active:text-slate-700"
            onClick={() => router.push('/')}
          >
            返回前台
          </button>
        </form>
        <Toast message={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl bg-white">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="font-semibold">后台管理</h1>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm text-slate-600 active:bg-slate-100"
            onClick={() => router.push('/')}
          >
            返回前台
          </button>
        </div>
        <div className="overflow-x-auto whitespace-nowrap border-t px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`inline-flex min-h-12 items-center px-4 text-sm active:bg-slate-50 ${
                tab === t.key
                  ? 'border-b-2 border-sky-600 font-medium text-sky-700'
                  : 'text-slate-500'
              }`}
              onClick={() => {
                if (t.key === 'upload') {
                  setTab('upload');
                  fileRef.current?.click();
                  return;
                }
                if (t.key === 'export') {
                  setTab('export');
                  downloadExport();
                  return;
                }
                setTab(t.key);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />

      <main className="px-4 py-5">
        {tab === 'upload' && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="mb-4 text-slate-600">选择一个或多个 Excel 文件开始导入</p>
            <button
              type="button"
              className="min-h-12 rounded-lg bg-sky-600 px-6 text-white active:bg-sky-700"
              onClick={() => fileRef.current?.click()}
            >
              选择 Excel
            </button>
          </div>
        )}

        {tab === 'accounts' && (
          <div className="space-y-5">
            <form onSubmit={addAccount} className="space-y-3 md:flex md:items-end md:gap-3 md:space-y-0">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-slate-500">主账号</label>
                <input
                  className="min-h-11 w-full rounded-lg border px-3"
                  value={mainId}
                  onChange={(e) => setMainId(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm text-slate-500">子账号</label>
                <input
                  className="min-h-11 w-full rounded-lg border px-3"
                  value={subId}
                  onChange={(e) => setSubId(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="min-h-11 w-full rounded-lg bg-sky-600 px-5 text-white active:bg-sky-700 md:w-auto"
              >
                添加
              </button>
            </form>

            <ul className="divide-y rounded-xl border">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{a.main_id}</span>
                    <span className="mx-2 text-slate-400">←</span>
                    <span className="text-slate-600">{a.sub_id}</span>
                  </span>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg px-3 text-red-600 active:bg-red-50"
                    onClick={() => deleteAccount(a.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
              {accounts.length === 0 && (
                <li className="px-4 py-8 text-center text-slate-400">暂无关联</li>
              )}
            </ul>
          </div>
        )}

        {tab === 'view' && (
          <div className="space-y-4">
            <SummarySearchBar
              term={searchTerm}
              setTerm={(v) => {
                setSearchTerm(v);
                setMatchIndex(0);
              }}
              matchCount={matchIds.length}
              onLocate={() => locateMatch(true)}
            />
            <SummaryView
              items={summaries}
              expanded={expanded}
              setExpanded={setExpanded}
              highlightId={highlightId}
              onOpenImage={setLightbox}
            />
          </div>
        )}

        {tab === 'edit' && (
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              提示：重新上传或修改账号关联后，仅「手动编辑」的总次数/明细可能被重算覆盖；后台「新增条目」写入的手动数据会作为数据源参与汇总，上传覆盖不会清除。
            </p>

            <form
              onSubmit={createManual}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="font-medium text-slate-800">新增条目</div>
              <div>
                <label className="mb-1 block text-sm text-slate-500">用户 ID</label>
                <input
                  className="min-h-11 w-full rounded-lg border px-3"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="输入新用户 ID / 昵称"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-500">
                  参与明细（每行：任务名 ×次数）
                </label>
                <textarea
                  className="min-h-[96px] w-full rounded-lg border px-3 py-2 text-sm"
                  value={newDetailsText}
                  onChange={(e) => setNewDetailsText(e.target.value)}
                  placeholder={'A任务 ×1\nB任务 ×2'}
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="min-h-11 w-full rounded-lg bg-sky-600 text-white active:bg-sky-700 disabled:opacity-60 md:w-auto md:px-6"
              >
                {creating ? '创建中…' : '创建'}
              </button>
            </form>

            <SummarySearchBar
              term={searchTerm}
              setTerm={(v) => {
                setSearchTerm(v);
                setMatchIndex(0);
              }}
              matchCount={matchIds.length}
              onLocate={() => locateMatch(true)}
            />

            <SummaryEdit
              items={summaries}
              drafts={editDrafts}
              setDrafts={setEditDrafts}
              highlightId={highlightId}
              onSave={saveRow}
              onDelete={deleteRow}
              onOpenImage={setLightbox}
            />
          </div>
        )}

        {tab === 'export' && (
          <div className="rounded-xl border bg-slate-50 p-8 text-center">
            <p className="mb-4 text-slate-600">若未自动下载，请点击下方按钮</p>
            <button
              type="button"
              className="min-h-12 rounded-lg bg-sky-600 px-6 text-white active:bg-sky-700"
              onClick={downloadExport}
            >
              下载汇总表
            </button>
          </div>
        )}
      </main>

      <UploadModal
        open={uploadOpen}
        files={pendingFiles}
        token={token}
        onClose={() => setUploadOpen(false)}
        onDone={(msg) => {
          setToast(msg);
          loadSummaries();
          setTab('view');
        }}
        onError={(msg) => setToast(msg)}
      />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function SummarySearchBar({
  term,
  setTerm,
  matchCount,
  onLocate,
}: {
  term: string;
  setTerm: (v: string) => void;
  matchCount: number;
  onLocate: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        onLocate();
      }}
    >
      <input
        className="min-h-11 w-full flex-1 rounded-lg border px-3 text-base outline-none focus:border-sky-500"
        placeholder="搜索用户 ID / 子账号，回车定位"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-lg bg-sky-600 px-4 text-white active:bg-sky-700 sm:flex-none"
        >
          定位
        </button>
        <span className="whitespace-nowrap text-sm text-slate-500">
          {term.trim() ? `${matchCount} 个匹配` : '—'}
        </span>
      </div>
    </form>
  );
}

function SummaryView({
  items,
  expanded,
  setExpanded,
  highlightId,
  onOpenImage,
}: {
  items: SummaryItem[];
  expanded: number | null;
  setExpanded: (id: number | null) => void;
  highlightId: number | null;
  onOpenImage: (src: string) => void;
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            data-summary-id={item.id}
            className={`w-full rounded-xl border p-4 text-left active:bg-slate-50 ${
              highlightId === item.id ? 'bg-sky-50 ring-2 ring-sky-400' : ''
            }`}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium">
                #{idx + 1} {item.user_id}
                {item.manual && (
                  <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                    手动
                  </span>
                )}
              </span>
              <span className="text-sky-700">共 {item.total_times} 次</span>
            </div>
            {(item.sub_ids || []).length > 0 && (
              <div className="mb-2 text-xs text-slate-500">
                子账号：{item.sub_ids.join('、')}
              </div>
            )}
            <div className="space-y-2 text-sm text-slate-700">
              {(item.details || []).map((d) => (
                <div key={d.task}>
                  <div>
                    ├ {d.task} ×{d.times}
                  </div>
                  {expanded === item.id && (
                    <div className="mt-1 grid grid-cols-3 gap-1 pl-4">
                      {d.images?.map((img) => (
                        <span
                          key={img}
                          role="button"
                          tabIndex={0}
                          className="aspect-square overflow-hidden rounded border"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenImage(`/api/files/${encodeURIComponent(img)}`);
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/files/${encodeURIComponent(img)}`}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-slate-400">暂无汇总数据</p>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3">序号</th>
              <th className="px-3 py-3">用户ID</th>
              <th className="px-3 py-3">关联子账号</th>
              <th className="px-3 py-3">参与总次数</th>
              <th className="px-3 py-3">参与明细</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={item.id}
                data-summary-id={item.id}
                className={`cursor-pointer border-t align-top hover:bg-slate-50 ${
                  highlightId === item.id ? 'bg-sky-50 ring-2 ring-inset ring-sky-400' : ''
                }`}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <td className="px-3 py-3">{idx + 1}</td>
                <td className="px-3 py-3 font-medium">
                  {item.user_id}
                  {item.manual && (
                    <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                      手动
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {(item.sub_ids || []).join('、') || '—'}
                </td>
                <td className="px-3 py-3 text-sky-700">{item.total_times}</td>
                <td className="max-w-[480px] px-3 py-3">
                  <div className="whitespace-pre-wrap break-words">
                    {(item.details || []).map((d) => `${d.task} ×${d.times}`).join('、')}
                  </div>
                  {expanded === item.id && (
                    <div className="mt-3 space-y-2">
                      {(item.details || []).map((d) => (
                        <div key={d.task}>
                          <div className="text-xs text-slate-500">
                            {d.task}（{d.images?.length || 0} 张）
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {d.images?.map((img) => (
                              <button
                                key={img}
                                type="button"
                                className="h-14 w-14 overflow-hidden rounded border"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenImage(`/api/files/${encodeURIComponent(img)}`);
                                }}
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryEdit({
  items,
  drafts,
  setDrafts,
  highlightId,
  onSave,
  onDelete,
  onOpenImage,
}: {
  items: SummaryItem[];
  drafts: Record<number, { total_times: number; detailsText: string }>;
  setDrafts: React.Dispatch<
    React.SetStateAction<Record<number, { total_times: number; detailsText: string }>>
  >;
  highlightId: number | null;
  onSave: (item: SummaryItem) => void;
  onDelete: (id: number) => void;
  onOpenImage: (src: string) => void;
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, idx) => {
          const draft = drafts[item.id] || {
            total_times: item.total_times,
            detailsText: '',
          };
          return (
            <div
              key={item.id}
              data-summary-id={item.id}
              className={`rounded-xl border p-4 ${
                highlightId === item.id ? 'bg-sky-50 ring-2 ring-sky-400' : ''
              }`}
            >
              <div className="mb-3 font-medium">
                #{idx + 1} {item.user_id}
                {item.manual && (
                  <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                    手动
                  </span>
                )}
              </div>
              <label className="mb-1 block text-sm text-slate-500">参与总次数</label>
              <input
                type="number"
                className="mb-3 min-h-11 w-full rounded-lg border px-3"
                value={draft.total_times}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [item.id]: { ...draft, total_times: Number(e.target.value) || 0 },
                  }))
                }
              />
              <label className="mb-1 block text-sm text-slate-500">
                参与明细（每行：任务名 ×次数）
              </label>
              <textarea
                className="mb-3 min-h-[96px] w-full rounded-lg border px-3 py-2 text-sm"
                value={draft.detailsText}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [item.id]: { ...draft, detailsText: e.target.value },
                  }))
                }
              />
              <div className="mb-3 grid grid-cols-3 gap-1">
                {(item.details || []).flatMap((d) =>
                  (d.images || []).map((img) => (
                    <button
                      key={img}
                      type="button"
                      className="aspect-square overflow-hidden rounded border"
                      onClick={() => onOpenImage(`/api/files/${encodeURIComponent(img)}`)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${encodeURIComponent(img)}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-lg bg-sky-600 text-white active:bg-sky-700"
                  onClick={() => onSave(item)}
                >
                  保存
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg px-4 text-red-600 active:bg-red-50"
                  onClick={() => onDelete(item.id)}
                >
                  删除该行
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3">序号</th>
              <th className="px-3 py-3">用户ID</th>
              <th className="px-3 py-3">关联子账号</th>
              <th className="px-3 py-3">参与总次数</th>
              <th className="px-3 py-3">参与明细</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const draft = drafts[item.id] || {
                total_times: item.total_times,
                detailsText: '',
              };
              return (
                <tr
                  key={item.id}
                  data-summary-id={item.id}
                  className={`border-t align-top ${
                    highlightId === item.id ? 'bg-sky-50 ring-2 ring-inset ring-sky-400' : ''
                  }`}
                >
                  <td className="px-3 py-3">{idx + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    {item.user_id}
                    {item.manual && (
                      <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                        手动
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{(item.sub_ids || []).join('、') || '—'}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      className="min-h-10 w-24 rounded border px-2"
                      value={draft.total_times}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...draft,
                            total_times: Number(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </td>
                  <td className="max-w-[480px] px-3 py-3">
                    <textarea
                      className="min-h-[72px] w-full rounded border px-2 py-1 text-sm"
                      value={draft.detailsText}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, detailsText: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="min-h-10 rounded-lg bg-sky-600 px-3 text-white active:bg-sky-700"
                        onClick={() => onSave(item)}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        className="min-h-10 rounded-lg text-red-600 active:bg-red-50"
                        onClick={() => onDelete(item.id)}
                      >
                        删除该行
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
