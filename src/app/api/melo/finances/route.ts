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
  const month     = searchParams.get('month');
  const year      = searchParams.get('year');
  const serviceId = searchParams.get('serviceId'); // filtro por serviço vinculado

  let entries = await readDb<FinanceEntry[]>('finances', []);

  if (serviceId) {
    // Retorna todas as entradas vinculadas a um serviço específico (ignora filtro de mês)
    entries = entries.filter(e => e.serviceId === serviceId);
  } else if (month && year) {
    entries = entries.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
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
    id:          crypto.randomUUID(),
    type:        body.type,
    amount:      parseFloat(body.amount),
    category:    body.category  || 'other',
    description: body.description || '',
    date:        body.date,
    client:      body.client    || '',
    createdAt:   new Date().toISOString(),
    source:      body.source    || 'form',
    serviceId:   body.serviceId || undefined,
    isPending:   body.isPending ?? false,
  };

  const entries = await readDb<FinanceEntry[]>('finances', []);
  entries.push(entry);
  await writeDb('finances', entries);
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body    = await req.json();
  const entries = await readDb<FinanceEntry[]>('finances', []);

  // Suporta atualização por id OU por serviceId+isPending (para confirmar recebimento)
  let idx = -1;
  if (body.id) {
    idx = entries.findIndex(e => e.id === body.id);
  } else if (body.serviceId) {
    idx = entries.findIndex(e => e.serviceId === body.serviceId && e.isPending === true);
  }
  if (idx === -1) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  entries[idx] = { ...entries[idx], ...body };
  await writeDb('finances', entries);
  return NextResponse.json(entries[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id        = searchParams.get('id');
  const serviceId = searchParams.get('serviceId'); // apaga entradas vinculadas ao serviço

  const entries = await readDb<FinanceEntry[]>('finances', []);

  if (serviceId) {
    await writeDb('finances', entries.filter(e => e.serviceId !== serviceId));
  } else if (id) {
    await writeDb('finances', entries.filter(e => e.id !== id));
  } else {
    return NextResponse.json({ error: 'id ou serviceId obrigatório' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
