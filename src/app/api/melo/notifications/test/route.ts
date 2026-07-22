import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';
import { sendPush } from '@/lib/melo/webpush';

export async function POST(req: NextRequest) {
  if (!(await verifySession(extractToken(req.headers.get('Authorization')))))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const sent = await sendPush(
    'Alfa Glass',
    'Notificações funcionando! Seus alarmes estão ativos.',
    '/melo/dashboard',
    'test'
  );
  return NextResponse.json({ sent });
}
