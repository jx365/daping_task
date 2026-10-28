import { NextRequest } from 'next/server';

export const ADMIN_TOKEN = 'admin-ok';

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'Lyt19951223';
}

export function isAdminAuthorized(req: NextRequest | Request): boolean {
  const token = req.headers.get('x-admin-token');
  return token === ADMIN_TOKEN;
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
