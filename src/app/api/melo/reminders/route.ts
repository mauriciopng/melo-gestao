import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { Reminder } from '@/lib/melo/types';

async function auth(req: NextRequest) {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const reminders = await readDb<Reminder[]>('reminders', []);
  reminders.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  return NextResponse.json(reminders);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await req.json();
  const reminder: Reminder = {
    id: crypto.randomUUID(),
    type: body.type ?? 'manual',
    title: body.title,
    body: body.body ?? '',
    datetime: body.datetime,
    relatedId: body.relatedId,
    sent: false,
    createdAt: new Date().toISOString(),
  };
  const reminders = await readDb<Reminder[]>('reminders', []);
  reminders.push(reminder);
  await writeDb('reminders', reminders);
  return NextResponse.json(reminder, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const reminders = await readDb<Reminder[]>('reminders', []);
  await writeDb('reminders', reminders.filter(r => r.id !== id));
  return NextResponse.json({ ok: true });
}
