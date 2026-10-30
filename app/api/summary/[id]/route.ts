import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { rebuildSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: '无效 ID' }, { status: 400 });
  }

  const existing = db.prepare('SELECT * FROM summary WHERE id = ?').get(id) as
    | SummaryRow
    | undefined;
  if (!existing) {
    return NextResponse.json({ error: '未找到' }, { status: 404 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: Array<string | number> = [];

  const currentOffset = Number(existing.manual_offset_times) || 0;
  const currentAuto = Number(existing.total_times) - currentOffset;

  if (typeof body.total_times === 'number') {
    const desired = Math.max(0, Math.floor(body.total_times));
    // 偏移量 = 期望展示值 - 当前自动计算值；后续 rebuild 用 auto + offset
    const newOffset = desired - currentAuto;
    updates.push('total_times = ?');
    values.push(desired);
    updates.push('manual_offset_times = ?');
    values.push(newOffset);
  }
  if (body.details !== undefined) {
    updates.push('details = ?');
    values.push(typeof body.details === 'string' ? body.details : JSON.stringify(body.details));
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: '无更新字段' }, { status: 400 });
  }

  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const updatedAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  updates.push('updated_at = ?');
  values.push(updatedAt);
  values.push(id);

  db.prepare(`UPDATE summary SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();
  const id = Number(params.id);

  const row = db.prepare('SELECT user_id FROM summary WHERE id = ?').get(id) as
    | { user_id: string }
    | undefined;
  if (!row) {
    return NextResponse.json({ error: '未找到' }, { status: 404 });
  }

  const manualIds = db
    .prepare(
      `SELECT id FROM records
       WHERE (user_id = ? OR owner_id = ?) AND IFNULL(is_manual, 0) = 1`
    )
    .all(row.user_id, row.user_id) as { id: number }[];
  const delImg = db.prepare('DELETE FROM images WHERE record_id = ?');
  for (const rec of manualIds) {
    delImg.run(rec.id);
  }
  db.prepare(
    `DELETE FROM records WHERE (user_id = ? OR owner_id = ?) AND IFNULL(is_manual, 0) = 1`
  ).run(row.user_id, row.user_id);

  // 删除 summary 行（含偏移量）；若还有 Excel 行，rebuild 会重建且 offset 清零
  db.prepare('DELETE FROM summary WHERE id = ?').run(id);

  rebuildSummary();

  return NextResponse.json({ ok: true });
}
