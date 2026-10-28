import { NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { getLastUpdate } from '@/lib/summary';

export const runtime = 'nodejs';

export async function GET() {
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT user_id, total_times FROM summary ORDER BY total_times DESC, user_id ASC LIMIT 30'
    )
    .all() as Pick<SummaryRow, 'user_id' | 'total_times'>[];

  const list = rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    total_times: r.total_times,
  }));

  return NextResponse.json({
    list,
    last_update: getLastUpdate(),
  });
}
