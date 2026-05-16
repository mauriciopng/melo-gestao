import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { FinanceEntry, AgendaEvent, Service } from '@/lib/melo/types';

export async function GET(req: NextRequest) {
  if (!(await verifySession(extractToken(req.headers.get('Authorization')))))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const q = (new URL(req.url).searchParams.get('q') || '').toLowerCase().trim();
  if (!q) return NextResponse.json({ finances: [], agenda: [], services: [] });

  const [allFinances, allAgenda, allServices] = await Promise.all([
    readDb<FinanceEntry[]>('finances', []),
    readDb<AgendaEvent[]>('agenda', []),
    readDb<Service[]>('services', []),
  ]);

  return NextResponse.json({
    finances: allFinances.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.client.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    ),
    agenda: allAgenda.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.client.toLowerCase().includes(q) ||
      e.notes.toLowerCase().includes(q)
    ),
    services: allServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.client.toLowerCase().includes(q) ||
      s.notes.toLowerCase().includes(q)
    ),
  });
}
