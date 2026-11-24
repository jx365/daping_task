import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { deleteTaskData } from '@/lib/excel';
import { rebuildSummary } from '@/lib/summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT task_name AS task_name,
              COUNT(*) AS record_count,
              IFNULL(SUM(times), 0) AS total_times
       FROM records
       WHERE IFNULL(is_manual, 0) = 0
       GROUP BY task_name
       ORDER BY task_name ASC`
    )
    .all() as { task_name: string; record_count: number; total_times: number }[];

  return NextResponse.json({
    list: rows.map((r) => ({
      task_name: r.task_name,
      record_count: Number(r.record_count) || 0,
      total_times: Number(r.total_times) || 0,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();

  let body: { task_names?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体无效' }, { status: 400 });
  }

  const names = Array.isArray(body.task_names)
    ? body.task_names.map((n) => String(n || '').trim()).filter(Boolean)
    : [];
  if (names.length === 0) {
    return NextResponse.json({ error: '请选择要删除的任务' }, { status: 400 });
  }

  const unique = Array.from(new Set(names));
  for (const name of unique) {
    deleteTaskData(name);
  }
  rebuildSummary();

  return NextResponse.json({
    ok: true,
    deleted: unique.length,
    task_names: unique,
  });
}
