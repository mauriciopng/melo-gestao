import { NextRequest, NextResponse } from 'next/server';
import { verifyPin, createSession, deleteSession, verifySession, extractToken, changePin } from '@/lib/melo/auth';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ error: 'PIN obrigatório' }, { status: 400 });
  if (!(await verifyPin(String(pin))))
    return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 });
  const token = await createSession();
  return NextResponse.json({ token });
}

export async function DELETE(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'));
  if (token) await deleteSession(token);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'));
  if (!token || !(await verifySession(token)))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { currentPin, newPin } = await req.json();
  if (!currentPin || !newPin)
    return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 });
  const ok = await changePin(String(currentPin), String(newPin));
  if (!ok) return NextResponse.json({ error: 'PIN atual incorreto' }, { status: 401 });
  return NextResponse.json({ ok: true });
}
