import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/melo/db';
import type { Service } from '@/lib/melo/types';

// Public endpoint — no authentication required
// Returns only public data for a specific service by clientToken
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

  const services = await readDb<Service[]>('services', []);
  const svc = services.find(s => s.clientToken === token);
  if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

  // Return only public-safe fields — never expose private data
  return NextResponse.json({
    id:        svc.id,
    name:      svc.name,
    client:    svc.client,
    status:    svc.status,
    progress:  svc.progress,
    startDate: svc.startDate,
    deadline:  svc.deadline,
    stages:    svc.stages  || [],
    comments:  (svc.comments || []).filter(c => c.isPublic),
  });
}
