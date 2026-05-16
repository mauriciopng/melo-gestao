import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { FinanceEntry } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year  = searchParams.get('year');

  let entries = await readDb<FinanceEntry[]>('finances', []);

  if (month && year) {
    entries = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
    });
  }

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const entry: FinanceEntry = {
    id: crypto.randomUUID(),
    type: body.type,
    amount: parseFloat(body.amount),
    category: body.category || 'other',
    description: body.description || '',
    date: body.date,
    client: body.client || '',
    createdAt: new Date().toISOString(),
  };

  const entries = await readDb<FinanceEntry[]>('finances', []);
  entries.push(entry);
  await writeDb('finances', entries);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const entries = await readDb<FinanceEntry[]>('finances', []);
  await writeDb('finances', entries.filter(e => e.id !== id));
  return NextResponse.json({ ok: true });
}
