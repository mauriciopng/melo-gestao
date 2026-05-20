import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { Service } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const status   = new URL(req.url).searchParams.get('status');
  let services   = await readDb<Service[]>('services', []);
  if (status) services = services.filter(s => s.status === status);
  services.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json();
  const service: Service = {
    id:           crypto.randomUUID(),
    name:         body.name,
    client:       body.client        || '',
    clientPhone:  body.clientPhone   || '',
    clientEmail:  body.clientEmail   || '',
    address:      body.address       || '',
    type:         body.type          || 'other',
    status:       body.status        || 'proposal',
    value:        parseFloat(body.value) || 0,
    startDate:    body.startDate     || new Date().toISOString().split('T')[0],
    deadline:     body.deadline      || '',
    progress:     parseInt(body.progress) || 0,
    currentStep:  parseInt(body.currentStep) || 0,
    notes:          body.notes           || '',
    createdAt:      new Date().toISOString(),
    clientToken:    crypto.randomUUID(),
    stages:         body.stages          || [],
    comments:       body.comments        || [],
    paymentType:    body.paymentType     || 'total',
    signalValue:    body.signalValue     ? parseFloat(body.signalValue)    : undefined,
    signalDate:     body.signalDate      || undefined,
    remainingValue: body.remainingValue  ? parseFloat(body.remainingValue) : undefined,
    remainingDate:  body.remainingDate   || undefined,
  };

  const services = await readDb<Service[]>('services', []);
  services.push(service);
  await writeDb('services', services);
  return NextResponse.json(service, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body     = await req.json();
  const services = await readDb<Service[]>('services', []);
  const idx      = services.findIndex(s => s.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  // Preserve clientToken and ensure arrays exist
  services[idx] = {
    ...services[idx],
    ...body,
    clientToken: services[idx].clientToken || crypto.randomUUID(),
    stages:      body.stages   !== undefined ? body.stages   : (services[idx].stages   || []),
    comments:    body.comments !== undefined ? body.comments : (services[idx].comments || []),
  };
  await writeDb('services', services);
  return NextResponse.json(services[idx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  await writeDb('services', services.filter(s => s.id !== id));
  return NextResponse.json({ ok: true });
}
