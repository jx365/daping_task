import { NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM summary ORDER BY total_times DESC, user_id ASC')
    .all() as SummaryRow[];

  const data = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    sub_ids: safeJsonArray(r.sub_ids),
    total_times: r.total_times,
    details: safeJsonDetails(r.details),
    updated_at: r.updated_at,
  }));

  return NextResponse.json(data);
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
