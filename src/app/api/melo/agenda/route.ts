import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { AgendaEvent } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year  = searchParams.get('year');

  let events = await readDb<AgendaEvent[]>('agenda', []);

  if (month && year) {
    events = events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
    });
  }

  events.sort((a, b) =>
    new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
  );
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const event: AgendaEvent = {
    id: crypto.randomUUID(),
    title:    body.title,
    date:     body.date,
    time:     body.time     || '09:00',
    duration: parseInt(body.duration) || 60,
    type:     body.type     || 'other',
    client:   body.client   || '',
    notes:    body.notes    || '',
    status:   body.status   || 'pending',
    createdAt: new Date().toISOString(),
  };

  const events = await readDb<AgendaEvent[]>('agenda', []);
  events.push(event);
  await writeDb('agenda', events);
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body   = await req.json();
  const events = await readDb<AgendaEvent[]>('agenda', []);
  const idx    = events.findIndex(e => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  events[idx] = { ...events[idx], ...body };
  await writeDb('agenda', events);
  return NextResponse.json(events[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const events = await readDb<AgendaEvent[]>('agenda', []);
  await writeDb('agenda', events.filter(e => e.id !== id));
  return NextResponse.json({ ok: true });
}
