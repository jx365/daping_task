'use client';

import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  files: File[];
  token: string;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

function stripExt(name: string) {
  return name.replace(/\.(xlsx|xls)$/i, '');
}

export default function UploadModal({ open, files, token, onClose, onDone, onError }: Props) {
  const [mode, setMode] = useState<'filename' | 'custom'>('filename');
  const [names, setNames] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setMode('filename');
    setNames(files.map((f) => stripExt(f.name)));
    setOverwrite(true);
    setUploading(false);
    setProgress(0);
  }, [open, files]);

  if (!open) return null;

  const resolvedNames =
    mode === 'filename' ? files.map((f) => stripExt(f.name)) : names.map((n) => n.trim());

  const emptyCustom = mode === 'custom' && resolvedNames.some((n) => !n);
  const nonEmpty = resolvedNames.filter(Boolean);
  const dup = nonEmpty.length > 0 && new Set(nonEmpty).size !== nonEmpty.length;

  const canUpload = !uploading && !emptyCustom && !dup && files.length > 0;

  async function startUpload() {
    if (!canUpload) return;
    if (dup) {
      onError('任务名称重复，请修改');
      return;
    }
    if (emptyCustom) {
      onError('请填写所有任务名称');
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('taskNames', JSON.stringify(resolvedNames));
      form.append('overwrite', overwrite ? '1' : '0');

      setProgress(40);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: form,
      });
      setProgress(85);
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || '上传失败');
        setUploading(false);
        return;
      }
      setProgress(100);
      onDone(data.message || '导入成功');
      onClose();
    } catch {
      onError('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl md:max-h-[90vh] md:max-w-lg md:rounded-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">任务命名设置</h2>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="radio"
              className="mt-1 h-5 w-5"
              checked={mode === 'filename'}
              onChange={() => setMode('filename')}
            />
            <span>
              <span className="block text-slate-900">使用文件名作为任务名称</span>
              <span className="text-sm text-slate-500">
                （文件名去扩展名作为任务名，如 A任务.xlsx → 「A任务」）
              </span>
            </span>
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="radio"
              className="mt-1 h-5 w-5"
              checked={mode === 'custom'}
              onChange={() => setMode('custom')}
            />
            <span className="text-slate-900">自定义重命名</span>
          </label>

          {mode === 'custom' && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="space-y-1">
                  <div className="text-sm text-slate-600">
                    文件 {i + 1}：{f.name}
                  </div>
                  <input
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-sky-500"
                    value={names[i] ?? ''}
                    placeholder="请输入任务名称"
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {emptyCustom && (
            <p className="text-sm text-red-600">自定义模式下任务名称不能为空</p>
          )}
          {dup && <p className="text-sm text-red-600">任务名称重复，请修改</p>}

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            <span>
              <span className="block text-slate-900">覆盖同名任务的已有数据</span>
              <span className="text-sm text-slate-500">
                （勾选后若已存在同名任务，先清旧数据再导入）
              </span>
            </span>
          </label>

          {uploading && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">上传解析中…</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t px-4 py-3">
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 text-slate-700 active:bg-slate-100"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </button>
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg bg-sky-600 text-white active:bg-sky-700 disabled:opacity-50"
            onClick={startUpload}
            disabled={!canUpload}
          >
            开始上传
          </button>
        </div>
      </div>
    </div>
  );
}
