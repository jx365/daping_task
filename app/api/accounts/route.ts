import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { getDb, type AccountLinkRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { rebuildSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM account_links ORDER BY id DESC')
    .all() as AccountLinkRow[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  const db = getDb();

  const body = await req.json();
  const main_id = String(body?.main_id || '').trim();
  const sub_id = String(body?.sub_id || '').trim();

  if (!main_id || !sub_id) {
    return NextResponse.json({ error: '主账号与子账号均不能为空' }, { status: 400 });
  }
  if (main_id === sub_id) {
    return NextResponse.json({ error: '主账号与子账号不能相同' }, { status: 400 });
  }

  const subTaken = db
    .prepare('SELECT id FROM account_links WHERE sub_id = ?')
    .get(sub_id) as { id: number } | undefined;
  if (subTaken) {
    return NextResponse.json({ error: '该子账号已关联到其他主账号' }, { status: 400 });
  }

  const mainIsSub = db
    .prepare('SELECT id FROM account_links WHERE sub_id = ?')
    .get(main_id) as { id: number } | undefined;
  if (mainIsSub) {
    return NextResponse.json({ error: '主账号本身已是其他账号的子账号' }, { status: 400 });
  }

  try {
    const info = db
      .prepare('INSERT INTO account_links (main_id, sub_id) VALUES (?, ?)')
      .run(main_id, sub_id);
    rebuildSummary();
    return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '添加失败' },
      { status: 400 }
    );
  }
}
