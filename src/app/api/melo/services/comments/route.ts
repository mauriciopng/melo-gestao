import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readDb, writeDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { Service, ServiceComment } from '@/lib/melo/types';

async function auth(req: NextRequest): Promise<boolean> {
  return verifySession(extractToken(req.headers.get('Authorization')));
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { serviceId, text, isPublic } = await req.json();
  if (!serviceId || !text) return NextResponse.json({ error: 'serviceId e text obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.id === serviceId);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  const comment: ServiceComment = {
    id:        crypto.randomUUID(),
    text,
    isPublic:  !!isPublic,
    createdAt: new Date().toISOString(),
  };

  if (!svc.comments) svc.comments = [];
  svc.comments.push(comment);
  await writeDb('services', services);
  return NextResponse.json(comment, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { serviceId, commentId, ...updates } = await req.json();
  if (!serviceId || !commentId) return NextResponse.json({ error: 'IDs obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.id === serviceId);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  const cIdx = (svc.comments || []).findIndex(c => c.id === commentId);
  if (cIdx === -1) return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });

  svc.comments[cIdx] = { ...svc.comments[cIdx], ...updates };
  await writeDb('services', services);
  return NextResponse.json(svc.comments[cIdx]);
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceId  = searchParams.get('serviceId');
  const commentId  = searchParams.get('commentId');
  if (!serviceId || !commentId) return NextResponse.json({ error: 'IDs obrigatórios' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.id === serviceId);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  svc.comments = (svc.comments || []).filter(c => c.id !== commentId);
  await writeDb('services', services);
  return NextResponse.json({ ok: true });
}
