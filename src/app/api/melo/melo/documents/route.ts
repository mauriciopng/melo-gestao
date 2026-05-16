import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { MeloDocument, DocumentContent } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q         = searchParams.get('q')?.toLowerCase();
  const serviceId = searchParams.get('serviceId');

  let docs = await readDb<MeloDocument[]>('documents', []);
  if (serviceId) docs = docs.filter(d => d.serviceId === serviceId);
  if (q) docs = docs.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.clientName.toLowerCase().includes(q)
  );
  docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const now  = new Date().toISOString();

  const content: DocumentContent = body.content || {
    number:       body.number       || `ORC-${Date.now()}`,
    clientName:   body.clientName   || '',
    clientAddress:body.clientAddress|| '',
    clientPhone:  body.clientPhone  || '',
    serviceName:  body.serviceName  || '',
    description:  body.description  || '',
    items:        body.items        || [],
    totalValue:   body.totalValue   || 0,
    deadline:     body.deadline     || '',
    paymentTerms: body.paymentTerms || '',
    validity:     body.validity     || '15 dias',
    notes:        body.notes        || '',
  };

  const doc: MeloDocument = {
    id:            crypto.randomUUID(),
    name:          body.name        || `Orçamento — ${content.clientName || 'Cliente'}`,
    type:          body.type        || 'orcamento',
    clientName:    content.clientName,
    serviceId:     body.serviceId   || undefined,
    content,
    status:        'rascunho',
    oneDriveId:    body.oneDriveId  || undefined,
    oneDrivePath:  body.oneDrivePath|| undefined,
    createdAt:     now,
    updatedAt:     now,
  };

  const docs = await readDb<MeloDocument[]>('documents', []);
  docs.push(doc);
  await writeDb('documents', docs);
  return NextResponse.json(doc, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const docs = await readDb<MeloDocument[]>('documents', []);
  const idx  = docs.findIndex(d => d.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });

  docs[idx] = { ...docs[idx], ...body, updatedAt: new Date().toISOString() };
  await writeDb('documents', docs);
  return NextResponse.json(docs[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const docs = await readDb<MeloDocument[]>('documents', []);
  await writeDb('documents', docs.filter(d => d.id !== id));
  return NextResponse.json({ ok: true });
}
