import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { FinanceEntry, AgendaEvent, Service, DashboardSummary } from '@/lib/melo/types';

export async function GET(req: NextRequest) {
  if (!(await verifySession(extractToken(req.headers.get('Authorization')))))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const allFinances = await readDb<FinanceEntry[]>('finances', []);

  // Receitas do mês atual — SOMENTE confirmadas (não pendentes)
  const monthly = allFinances.filter(e => {
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalIncome   = monthly
    .filter(e => e.type === 'income' && !e.isPending)
    .reduce((s, e) => s + e.amount, 0);

  const totalExpenses = monthly
    .filter(e => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);

  // A Receber — soma de TODOS os pagamentos pendentes (qualquer mês)
  const totalPending  = allFinances
    .filter(e => e.isPending === true)
    .reduce((s, e) => s + e.amount, 0);

  const allServices       = await readDb<Service[]>('services', []);
  const activeServices    = allServices.filter(s => s.status === 'in_progress').length;
  const pendingServices   = allServices.filter(s => s.status === 'proposal').length;
  const completedServices = allServices.filter(s => s.status === 'completed').length;

  const today    = now.toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const allEvents = await readDb<AgendaEvent[]>('agenda', []);

  const upcomingEvents = allEvents
    .filter(e => e.date >= today && e.date <= nextWeek && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())
    .slice(0, 5);

  // Movimentações recentes — exclui pendentes do topo (ficam depois das confirmadas)
  const recentFinances = [...allFinances]
    .sort((a, b) => {
      if (a.isPending && !b.isPending) return 1;
      if (!a.isPending && b.isPending) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, 6);

  const activeServicesList = allServices
    .filter(s => s.status === 'in_progress' || s.status === 'review')
    .sort((a, b) => new Date(a.deadline || '9999').getTime() - new Date(b.deadline || '9999').getTime())
    .slice(0, 4);

  const summary: DashboardSummary = {
    totalIncome, totalExpenses,
    netProfit: totalIncome - totalExpenses,
    totalPending,
    activeServices, pendingServices, completedServices,
    upcomingEvents, recentFinances, activeServicesList,
  };

  return NextResponse.json(summary);
}
