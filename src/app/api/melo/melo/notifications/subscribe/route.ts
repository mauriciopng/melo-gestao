import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';
import { saveSub, removeSub } from '@/lib/melo/webpush';

function auth(req: NextRequest) {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const sub = await req.json();
  if (!sub?.endpoint) return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 });
  await saveSub(sub);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { endpoint } = await req.json();
  if (endpoint) await removeSub(endpoint);
  return NextResponse.json({ ok: true });
}
