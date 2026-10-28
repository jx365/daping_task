import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { ensureDataDirs, DATA_DIR, UPLOAD_DIR, DB_PATH } from '@/lib/paths';
import { applyTimes, deleteTaskData, insertParsedRows, parseExcelBuffer } from '@/lib/excel';
import { rebuildSummary } from '@/lib/summary';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function fail(message: string, status = 500, detail?: unknown) {
  console.error('[upload]', message, detail ?? '');
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();

  const started = Date.now();
  try {
    ensureDataDirs();
    getDb();

    let form: FormData;
    try {
      form = await req.formData();
    } catch (e) {
      return fail('无法读取上传表单（文件可能过大或请求被中断）', 400, e);
    }

    const overwrite = String(form.get('overwrite') ?? '0') === '1';
    let taskNames: string[] = [];
    const rawNames = form.get('taskNames');
    if (typeof rawNames === 'string') {
      try {
        taskNames = JSON.parse(rawNames);
      } catch {
        return fail('taskNames 无效', 400);
      }
    }

    const files = [
      ...form.getAll('files'),
      ...form.getAll('files[]'),
    ].filter((f): f is File => typeof File !== 'undefined' && f instanceof File);

    // Node/undici 兜底：部分运行环境 instanceof File 失败
    const blobFiles = files.length
      ? files
      : [...form.getAll('files'), ...form.getAll('files[]')].filter(
          (f) => f && typeof f === 'object' && typeof (f as Blob).arrayBuffer === 'function'
        ) as Blob[];

    if (blobFiles.length === 0) {
      return fail('未选择文件', 400);
    }
    if (taskNames.length !== blobFiles.length) {
      return fail('任务名称数量与文件不一致', 400);
    }

    const nameSet = new Set<string>();
    for (const name of taskNames) {
      const t = String(name || '').trim();
      if (!t) return fail('任务名称不能为空', 400);
      if (nameSet.has(t)) return fail('任务名称重复，请修改', 400);
      nameSet.add(t);
    }

    let totalRecords = 0;
    const taskSummaries: { taskName: string; records: number }[] = [];

    for (let i = 0; i < blobFiles.length; i++) {
      const file = blobFiles[i];
      const taskName = String(taskNames[i]).trim();
      const size = 'size' in file ? Number((file as File).size) : 0;
      if (size > MAX_FILE_SIZE) {
        return fail('单文件过大，请拆分后上传', 400);
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(await file.arrayBuffer());
      } catch (e) {
        return fail(`读取文件失败：${taskName}`, 400, e);
      }

      if (overwrite) {
        try {
          deleteTaskData(taskName);
        } catch (e) {
          return fail(`清理旧数据失败：${taskName}`, 500, e);
        }
      }

      let parsed;
      try {
        parsed = await parseExcelBuffer(buf, taskName);
      } catch (e) {
        return fail(
          `Excel 解析失败：${e instanceof Error ? e.message : String(e)}`,
          500,
          e
        );
      }

      const withTimes = applyTimes(parsed).map((r) => ({ ...r, taskName }));
      try {
        insertParsedRows(withTimes, (file as File).name || `file-${i + 1}.xlsx`);
      } catch (e) {
        return fail(
          `写入数据库失败：${e instanceof Error ? e.message : String(e)}（DATA_DIR=${DATA_DIR}）`,
          500,
          e
        );
      }

      totalRecords += withTimes.length;
      taskSummaries.push({ taskName, records: withTimes.length });
    }

    try {
      rebuildSummary();
    } catch (e) {
      return fail(
        `汇总重建失败：${e instanceof Error ? e.message : String(e)}`,
        500,
        e
      );
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    return NextResponse.json({
      ok: true,
      tasks: taskSummaries.length,
      records: totalRecords,
      elapsed: Number(elapsed),
      message: `导入成功：共 ${taskSummaries.length} 个任务、${totalRecords} 条记录，用时 ${elapsed}s`,
      details: taskSummaries,
      paths: { DATA_DIR, UPLOAD_DIR, DB_PATH },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : '上传失败', 500, e);
  }
}
