import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, unauthorized } from '@/lib/auth';
import { ensureDataDirs } from '@/lib/paths';
import { getScoringConfig, setScoringConfig, type ScoringConfig } from '@/lib/scoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();
  return NextResponse.json(getScoringConfig());
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  ensureDataDirs();

  let body: Partial<ScoringConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体无效' }, { status: 400 });
  }

  const cfg = setScoringConfig(body);
  return NextResponse.json({ ok: true, config: cfg });
}
