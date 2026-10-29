import { NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

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

  const totalTimes = row.total_times;
  const userId = row.user_id;

  // 行号位次：与排行榜一致（同分按 user_id 升序占不同名次）
  const rankRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM summary
       WHERE total_times > ?
          OR (total_times = ? AND user_id < ?)`
    )
    .get(totalTimes, totalTimes, userId) as { c: number };
  const rank = Number(rankRow?.c ?? 0) + 1;

  const totalRow = db.prepare('SELECT COUNT(*) AS c FROM summary').get() as { c: number };
  const total_players = Number(totalRow?.c ?? 0);

  const nextRow = db
    .prepare('SELECT MIN(total_times) AS n FROM summary WHERE total_times > ?')
    .get(totalTimes) as { n: number | null };
  const next_score =
    nextRow?.n == null || nextRow.n === undefined ? null : Number(nextRow.n);

  let times_needed: number | null = null;
  let target_rank: number | null = null;
  if (next_score != null) {
    times_needed = next_score - totalTimes;
    // next_score 分段的头名位次 = 分数严格更高的人数 + 1
    const targetRow = db
      .prepare('SELECT COUNT(*) AS c FROM summary WHERE total_times > ?')
      .get(next_score) as { c: number };
    target_rank = Number(targetRow?.c ?? 0) + 1;
  }

  return NextResponse.json({
    found: true,
    id: row.id,
    user_id: row.user_id,
    sub_ids: safeParse(row.sub_ids, []),
    total_times: row.total_times,
    details: safeParse(row.details, []),
    updated_at: row.updated_at,
    rank,
    total_players,
    next_score,
    times_needed,
    target_rank,
  });
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
