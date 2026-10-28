import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { rebuildSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();
  const id = Number(params.id);
  const info = db.prepare('DELETE FROM account_links WHERE id = ?').run(id);
  if (info.changes === 0) {
    return NextResponse.json({ error: '未找到' }, { status: 404 });
  }
  rebuildSummary();
  return NextResponse.json({ ok: true });
}
