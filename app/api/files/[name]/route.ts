import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, ensureDataDirs } from '@/lib/paths';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  ensureDataDirs();
  const name = path.basename(decodeURIComponent(params.name || ''));
  if (!name || name === '.' || name === '..') {
    return NextResponse.json({ error: '无效文件名' }, { status: 400 });
  }
  const fp = path.join(UPLOAD_DIR, name);
  if (!fp.startsWith(UPLOAD_DIR) || !fs.existsSync(fp)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const type = MIME[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(fp);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
