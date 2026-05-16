import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { Service, ServiceStage } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

// POST /api/melo/services/stages  — add stage
// PUT  /api/melo/services/stages  — update stage
// DELETE /api/melo/services/stages?serviceId=x&stageId=y — delete stage

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { serviceId, name, description, status, order } = await req.json();
  if (!serviceId || !name) return NextResponse.json({ error: 'serviceId e name obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const idx = services.findIndex(s => s.id === serviceId);
  if (idx === -1) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  const stage: ServiceStage = {
    id:          crypto.randomUUID(),
    name,
    description: description || '',
    status:      status      || 'pendente',
    order:       order       ?? (services[idx].stages || []).length,
    createdAt:   new Date().toISOString(),
  };

  if (!services[idx].stages) services[idx].stages = [];
  services[idx].stages.push(stage);
  await writeDb('services', services);
  return NextResponse.json(stage, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { serviceId, stageId, ...updates } = await req.json();
  if (!serviceId || !stageId) return NextResponse.json({ error: 'serviceId e stageId obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.id === serviceId);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  const stageIdx = (svc.stages || []).findIndex(st => st.id === stageId);
  if (stageIdx === -1) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 });

  svc.stages[stageIdx] = {
    ...svc.stages[stageIdx],
    ...updates,
    completedAt: updates.status === 'concluido' && !svc.stages[stageIdx].completedAt
      ? new Date().toISOString()
      : svc.stages[stageIdx].completedAt,
  };
  await writeDb('services', services);
  return NextResponse.json(svc.stages[stageIdx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId');
  const stageId   = searchParams.get('stageId');
  if (!serviceId || !stageId) return NextResponse.json({ error: 'serviceId e stageId obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.id === serviceId);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  svc.stages = (svc.stages || []).filter(st => st.id !== stageId);
  await writeDb('services', services);
  return NextResponse.json({ ok: true });
}
