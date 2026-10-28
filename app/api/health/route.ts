import { NextResponse } from 'next/server';
import { ensureDataDirs, DATA_DIR, UPLOAD_DIR, DB_PATH } from '@/lib/paths';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, unknown> = {
    ok: true,
    time: new Date().toISOString(),
    paths: { DATA_DIR, UPLOAD_DIR, DB_PATH },
  };

  try {
    ensureDataDirs();
    checks.dirs = true;
  } catch (e) {
    checks.dirs = false;
    checks.dirsError = e instanceof Error ? e.message : String(e);
    checks.ok = false;
  }

  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS c FROM summary').get() as { c: number };
    checks.db = true;
    checks.summaryCount = row.c;
  } catch (e) {
    checks.db = false;
    checks.dbError = e instanceof Error ? e.message : String(e);
    checks.ok = false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('exceljs');
    checks.exceljs = true;
  } catch (e) {
    checks.exceljs = false;
    checks.exceljsError = e instanceof Error ? e.message : String(e);
    checks.ok = false;
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 500 });
}
