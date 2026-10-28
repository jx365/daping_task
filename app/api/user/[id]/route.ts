import { NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  ensureDataDirs();
  const db = getDb();
  const id = decodeURIComponent(params.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: '缺少 ID' }, { status: 400 });
  }

  let row = db.prepare('SELECT * FROM summary WHERE user_id = ?').get(id) as
    | SummaryRow
    | undefined;

  if (!row) {
    const link = db
      .prepare('SELECT main_id FROM account_links WHERE sub_id = ?')
      .get(id) as { main_id: string } | undefined;
    if (link) {
      row = db.prepare('SELECT * FROM summary WHERE user_id = ?').get(link.main_id) as
        | SummaryRow
        | undefined;
    }
  }

  if (!row) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    id: row.id,
    user_id: row.user_id,
    sub_ids: safeParse(row.sub_ids, []),
    total_times: row.total_times,
    details: safeParse(row.details, []),
    updated_at: row.updated_at,
  });
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
