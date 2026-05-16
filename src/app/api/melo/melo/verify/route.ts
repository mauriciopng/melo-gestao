import { NextRequest, NextResponse } from 'next/server';
import { verifySession, extractToken } from '@/lib/melo/auth';

export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'));
  if (!(await verifySession(token)))
    return NextResponse.json({ valid: false }, { status: 401 });
  return NextResponse.json({ valid: true });
}
