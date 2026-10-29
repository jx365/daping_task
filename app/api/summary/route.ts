import { NextRequest, NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { rebuildSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM summary ORDER BY total_times DESC, user_id ASC')
    .all() as SummaryRow[];

  const manualStmt = db.prepare(
    `SELECT 1 AS x FROM records WHERE user_id = ? AND IFNULL(is_manual, 0) = 1 LIMIT 1`
  );

  const data = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    sub_ids: safeJsonArray(r.sub_ids),
    total_times: r.total_times,
    details: safeJsonDetails(r.details),
    updated_at: r.updated_at,
    manual: !!manualStmt.get(r.user_id),
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();

  let body: {
    user_id?: string;
    details?: { task?: string; times?: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体无效' }, { status: 400 });
  }

  const user_id = String(body.user_id || '').trim();
  if (!user_id) {
    return NextResponse.json({ error: '用户 ID 不能为空' }, { status: 400 });
  }

  const details = Array.isArray(body.details)
    ? body.details
        .map((d) => ({
          task: String(d?.task || '').trim(),
          times: Math.max(0, Math.floor(Number(d?.times) || 0)),
        }))
        .filter((d) => d.task && d.times > 0)
    : [];

  if (details.length === 0) {
    return NextResponse.json({ error: '请至少填写一条有效明细（任务名 ×次数）' }, { status: 400 });
  }

  const asSub = db
    .prepare('SELECT id FROM account_links WHERE sub_id = ?')
    .get(user_id) as { id: number } | undefined;
  if (asSub) {
    return NextResponse.json({ error: '该 ID 已是其他账号的子账号，不能作为主账号新增' }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO records (user_id, owner_id, task_name, image_count, times, source_file, row_index, created_at, is_manual)
     VALUES (?, ?, ?, ?, ?, 'manual', NULL, ?, 1)`
  );

  const run = db.transaction(() => {
    // 先清掉该用户旧手动行，再写入新明细（等同覆盖该用户的手动部分）
    const oldManual = db
      .prepare('SELECT id FROM records WHERE user_id = ? AND IFNULL(is_manual, 0) = 1')
      .all(user_id) as { id: number }[];
    const delImg = db.prepare('DELETE FROM images WHERE record_id = ?');
    for (const rec of oldManual) {
      delImg.run(rec.id);
    }
    db.prepare('DELETE FROM records WHERE user_id = ? AND IFNULL(is_manual, 0) = 1').run(user_id);

    for (const d of details) {
      insert.run(user_id, user_id, d.task, d.times, d.times, createdAt);
    }
  });
  run();

  rebuildSummary();

  const summary = db.prepare('SELECT total_times FROM summary WHERE user_id = ?').get(user_id) as
    | { total_times: number }
    | undefined;

  return NextResponse.json({
    ok: true,
    user_id,
    total_times: summary?.total_times ?? details.reduce((s, d) => s + d.times, 0),
  });
}

function safeJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function safeJsonDetails(raw: string) {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
