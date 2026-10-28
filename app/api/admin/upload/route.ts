import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { ensureDataDirs } from '@/lib/paths';
import { applyTimes, deleteTaskData, insertParsedRows, parseExcelBuffer } from '@/lib/excel';
import { rebuildSummary } from '@/lib/summary';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  getDb();

  const started = Date.now();
  try {
    const form = await req.formData();
    const overwrite = String(form.get('overwrite') ?? '0') === '1';
    let taskNames: string[] = [];
    const rawNames = form.get('taskNames');
    if (typeof rawNames === 'string') {
      try {
        taskNames = JSON.parse(rawNames);
      } catch {
        return NextResponse.json({ error: 'taskNames 无效' }, { status: 400 });
      }
    }

    const files = [
      ...form.getAll('files'),
      ...form.getAll('files[]'),
    ].filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }
    if (taskNames.length !== files.length) {
      return NextResponse.json({ error: '任务名称数量与文件不一致' }, { status: 400 });
    }

    const nameSet = new Set<string>();
    for (const name of taskNames) {
      const t = String(name || '').trim();
      if (!t) {
        return NextResponse.json({ error: '任务名称不能为空' }, { status: 400 });
      }
      if (nameSet.has(t)) {
        return NextResponse.json({ error: '任务名称重复，请修改' }, { status: 400 });
      }
      nameSet.add(t);
    }

    let totalRecords = 0;
    const taskSummaries: { taskName: string; records: number }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const taskName = String(taskNames[i]).trim();
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: '单文件过大，请拆分后上传' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (overwrite) {
        deleteTaskData(taskName);
      }
      const parsed = await parseExcelBuffer(buf, taskName);
      const withTimes = applyTimes(parsed).map((r) => ({ ...r, taskName }));
      insertParsedRows(withTimes, file.name || `file-${i + 1}.xlsx`);
      totalRecords += withTimes.length;
      taskSummaries.push({ taskName, records: withTimes.length });
    }

    rebuildSummary();

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    return NextResponse.json({
      ok: true,
      tasks: taskSummaries.length,
      records: totalRecords,
      elapsed: Number(elapsed),
      message: `导入成功：共 ${taskSummaries.length} 个任务、${totalRecords} 条记录，用时 ${elapsed}s`,
      details: taskSummaries,
    });
  } catch (e) {
    console.error('upload error', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '上传失败' },
      { status: 500 }
    );
  }
}
