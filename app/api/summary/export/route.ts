import { NextResponse } from 'next/server';
import { getDb, type SummaryRow } from '@/lib/db';
import { ensureDataDirs } from '@/lib/paths';
import { buildExportBuffer, exportFileName } from '@/lib/excel';
import type { DetailItem } from '@/lib/summary';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET() {
  ensureDataDirs();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM summary ORDER BY total_times DESC, user_id ASC')
    .all() as SummaryRow[];

  const summaries = rows.map((r) => {
    let sub_ids: string[] = [];
    let details: DetailItem[] = [];
    try {
      sub_ids = JSON.parse(r.sub_ids || '[]');
    } catch {
      sub_ids = [];
    }
    try {
      details = JSON.parse(r.details || '[]');
    } catch {
      details = [];
    }
    return {
      user_id: r.user_id,
      sub_ids,
      total_times: r.total_times,
      details,
    };
  });

  const buf = await buildExportBuffer(summaries);
  const filename = exportFileName();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
