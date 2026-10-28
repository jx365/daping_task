import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_TOKEN, getAdminPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password !== getAdminPassword()) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }
    return NextResponse.json({ token: ADMIN_TOKEN });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
