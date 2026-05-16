import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/melo/db';
import { verifySession, extractToken } from '@/lib/melo/auth';
import type { FinanceEntry, Service } from '@/lib/melo/types';

export async function GET(req: NextRequest) {
  if (!(await verifySession(extractToken(req.headers.get('Authorization')))))
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const year = parseInt(new URL(req.url).searchParams.get('year') || String(new Date().getFullYear()));

  const [allFinances, allServices] = await Promise.all([
    readDb<FinanceEntry[]>('finances', []),
    readDb<Service[]>('services', []),
  ]);

  const yearFinances = allFinances.filter(e => new Date(e.date).getFullYear() === year);

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m       = i + 1;
    const entries = yearFinances.filter(e => new Date(e.date).getMonth() + 1 === m);
    return {
      month: m,
      income:   entries.filter(e => e.type === 'income').reduce((s, e)  => s + e.amount, 0),
      expenses: entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  });

  const expensesByCategory: Record<string, number> = {};
  yearFinances.filter(e => e.type === 'expense').forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
  });

  const incomeByCategory: Record<string, number> = {};
  yearFinances.filter(e => e.type === 'income').forEach(e => {
    incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
  });

  const servicesByStatus = {
    proposal:   allServices.filter(s => s.status === 'proposal').length,
    in_progress: allServices.filter(s => s.status === 'in_progress').length,
    review:     allServices.filter(s => s.status === 'review').length,
    completed:  allServices.filter(s => s.status === 'completed').length,
    cancelled:  allServices.filter(s => s.status === 'cancelled').length,
  };

  const totalRevenue  = yearFinances.filter(e => e.type === 'income').reduce((s, e)  => s + e.amount, 0);
  const totalExpenses = yearFinances.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const completedValue = allServices.filter(s => s.status === 'completed').reduce((s, sv) => s + sv.value, 0);

  return NextResponse.json({
    monthly, expensesByCategory, incomeByCategory, servicesByStatus,
    totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, completedValue,
  });
}
