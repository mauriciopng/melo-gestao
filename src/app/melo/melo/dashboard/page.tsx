'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/melo/AppShell';
import { TrendUp, TrendDown, Briefcase, Clock, CaretRight, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTheme } from '@/lib/melo/theme';
import type { DashboardSummary } from '@/lib/melo/types';

const STATUS_COLORS: Record<string, string> = {
  proposal: 'bg-[#F59E0B]/12 text-[#D97706]',
  in_progress: 'bg-[#1D6EF7]/12 text-[#1D6EF7]',
  review: 'bg-[#8B5CF6]/12 text-[#7C3AED]',
  completed: 'bg-[#16A34A]/12 text-[#16A34A]',
  cancelled: 'bg-[#6B6B64]/12 text-[#6B6B64]',
};
const STATUS_LABELS: Record<string, string> = {
  proposal: 'Proposta', in_progress: 'Em andamento', review: 'Revisão',
  completed: 'Concluído', cancelled: 'Cancelado',
};
const EVENT_DOT: Record<string, string> = {
  meeting: '#1D6EF7', delivery: '#16A34A', shoot: '#D97706',
  call: '#7C3AED', edit: '#E5484D', other: '#6B6B64',
};

const ease = 'cubic-bezier(0.32,0.72,0,1)';
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function todayStr() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl animate-pulse ${className}`} />;
}

function BezelCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { isDark, c } = useTheme();
  return (
    <div
      className={`rounded-2xl p-[5px] ${className}`}
      style={{
        background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        ...style,
      }}
    >
      <div
        className="h-full rounded-[calc(1rem-5px)]"
        style={{
          background: c.card,
          color: c.t1,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
          boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { v, isDark, c } = useTheme();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('melo_token') || '';
    fetch('/api/melo/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const profit = data?.netProfit ?? 0;
  const isPositive = profit >= 0;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1"
            style={{ color: c.muted }}>
            {todayStr()}
          </p>
          <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight"
            style={{ color: c.t1 }}>
            {greeting()}, Mauricio
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0,1,2].map(i => <SkeletonCard key={i} className={`h-28 ${isDark ? 'bg-[#1C1C18]' : 'bg-[#EBEBEA]'}`} />)}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => <SkeletonCard key={i} className={`h-24 ${isDark ? 'bg-[#1C1C18]' : 'bg-[#EBEBEA]'}`} />)}
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Revenue — blue gradient */}
              <div
                className="rounded-[1.25rem] p-[5px]"
                style={{
                  background: 'linear-gradient(145deg, rgba(29,110,247,0.3), rgba(18,73,194,0.2))',
                  border: '1px solid rgba(29,110,247,0.2)',
                }}
              >
                <div
                  className="h-full rounded-[calc(1.25rem-5px)] px-5 py-4"
                  style={{
                    background: 'linear-gradient(145deg, #1D6EF7, #1249C2)',
                    boxShadow: '0 6px 24px rgba(29,110,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-[0.12em]">Receita</span>
                    <TrendUp size={15} className="text-blue-300" weight="bold" />
                  </div>
                  <p className="font-bold tracking-tight text-white truncate" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(14px,4.5vw,22px)' }}>
                    {fmt(data?.totalIncome ?? 0)}
                  </p>
                  <p className="text-blue-300 text-[11px] mt-1">Este mês</p>
                </div>
              </div>

              {/* Expenses */}
              <BezelCard>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${v.muted}`}>Despesas</span>
                    <TrendDown size={15} className="text-[#E5484D]" weight="bold" />
                  </div>
                  <p className="font-bold tracking-tight truncate" style={{ color: c.t1, fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(14px,4.5vw,22px)' }}>
                    {fmt(data?.totalExpenses ?? 0)}
                  </p>
                  <p className={`text-[11px] mt-1 ${v.muted}`}>Este mês</p>
                </div>
              </BezelCard>

              {/* Net Profit */}
              <BezelCard>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${v.muted}`}>Lucro líquido</span>
                    <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-[#16A34A]' : 'bg-[#E5484D]'}`}
                      style={{ boxShadow: `0 0 6px ${isPositive ? '#16A34A' : '#E5484D'}` }} />
                  </div>
                  <p className="font-bold tracking-tight truncate"
                    style={{ color: isPositive ? '#16A34A' : '#E5484D', fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(14px,4.5vw,22px)' }}>
                    {fmt(profit)}
                  </p>
                  <p className={`text-[11px] mt-1 ${v.muted}`}>Este mês</p>
                </div>
              </BezelCard>
            </div>

            {/* Service counters */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Briefcase, value: data?.activeServices ?? 0, label: 'Em andamento', color: '#1D6EF7', bg: isDark ? 'rgba(29,110,247,0.12)' : 'rgba(29,110,247,0.08)' },
                { icon: Clock, value: data?.pendingServices ?? 0, label: 'Propostas', color: '#D97706', bg: isDark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)' },
                { icon: CheckCircle, value: data?.completedServices ?? 0, label: 'Concluídos', color: '#16A34A', bg: isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)' },
              ].map(({ icon: Icon, value, label, color, bg }) => (
                <BezelCard key={label}>
                  <div className="px-3 py-4 text-center">
                    <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: bg }}>
                      <Icon size={18} style={{ color }} weight="fill" />
                    </div>
                    <p className={`text-[20px] font-bold tabular-nums ${v.t1}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                    <p className={`text-[10.5px] font-medium mt-0.5 ${v.muted}`}>{label}</p>
                  </div>
                </BezelCard>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Services */}
              <BezelCard>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-[13px] font-semibold ${v.t1}`}>Serviços ativos</p>
                    <Link href="/melo/services"
                      className={`flex items-center gap-0.5 text-[12px] font-medium text-[#1D6EF7] hover:opacity-70`}
                      style={{ transition: `opacity 180ms ${ease}` }}>
                      Ver todos <CaretRight size={12} weight="bold" />
                    </Link>
                  </div>
                  {(data?.activeServicesList?.length ?? 0) === 0 ? (
                    <div className="py-5 text-center">
                      <Briefcase size={24} className={`${v.muted} mx-auto mb-2 opacity-30`} />
                      <p className={`text-[13px] ${v.muted}`}>Nenhum serviço ativo</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data!.activeServicesList.map(s => (
                        <div key={s.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[13px] font-medium ${v.t1} truncate mr-2`}>{s.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[s.status] ?? ''}`}>
                              {STATUS_LABELS[s.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Progress track */}
                            <div className={`flex-1 h-1 rounded-full ${isDark ? 'bg-[#1C1C18]' : 'bg-[#F0F0EC]'}`}>
                              <div
                                className="h-1 rounded-full"
                                style={{
                                  width: `${s.progress}%`,
                                  background: 'linear-gradient(90deg, #1D6EF7, #3B82F6)',
                                  boxShadow: '0 0 6px rgba(29,110,247,0.4)',
                                  transition: `width 600ms ${ease}`,
                                }}
                              />
                            </div>
                            <span className={`text-[11px] tabular-nums font-medium ${v.muted}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {s.progress}%
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 ${v.muted}`}>{s.client}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </BezelCard>

              {/* Upcoming Events */}
              <BezelCard>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-[13px] font-semibold ${v.t1}`}>Próximos eventos</p>
                    <Link href="/melo/agenda"
                      className="flex items-center gap-0.5 text-[12px] font-medium text-[#1D6EF7] hover:opacity-70"
                      style={{ transition: `opacity 180ms ${ease}` }}>
                      Ver todos <CaretRight size={12} weight="bold" />
                    </Link>
                  </div>
                  {(data?.upcomingEvents?.length ?? 0) === 0 ? (
                    <div className="py-5 text-center">
                      <Clock size={24} className={`${v.muted} mx-auto mb-2 opacity-30`} />
                      <p className={`text-[13px] ${v.muted}`}>Nenhum evento próximo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data!.upcomingEvents.map(e => (
                        <div key={e.id} className="flex items-start gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-[5px] flex-shrink-0"
                            style={{ background: EVENT_DOT[e.type] ?? '#6B6B64', boxShadow: `0 0 6px ${EVENT_DOT[e.type] ?? '#6B6B64'}60` }}
                          />
                          <div className="min-w-0">
                            <p className={`text-[13px] font-medium ${v.t1} truncate`}>{e.title}</p>
                            <p className={`text-[11px] ${v.muted} tabular-nums`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · {e.time}
                              {e.client && ` · ${e.client}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </BezelCard>
            </div>

            {/* Recent Transactions */}
            <BezelCard>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-[13px] font-semibold ${v.t1}`}>Movimentações recentes</p>
                  <Link href="/melo/finances"
                    className="flex items-center gap-0.5 text-[12px] font-medium text-[#1D6EF7] hover:opacity-70"
                    style={{ transition: `opacity 180ms ${ease}` }}>
                    Ver todas <CaretRight size={12} weight="bold" />
                  </Link>
                </div>
                {(data?.recentFinances?.length ?? 0) === 0 ? (
                  <p className={`text-center text-[13px] py-4 ${v.muted}`}>Nenhuma movimentação ainda</p>
                ) : (
                  <div className="space-y-0.5">
                    {data!.recentFinances.map(f => (
                      <div key={f.id} className={`flex items-center gap-3 px-2 py-2.5 rounded-xl ${v.hover} transition-colors`}>
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[16px]"
                          style={{ background: f.type === 'income' ? 'rgba(22,163,74,0.1)' : 'rgba(229,72,77,0.1)' }}
                        >
                          {f.type === 'income' ? '↑' : '↓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${v.t1} truncate`}>{f.description || f.category}</p>
                          <p className={`text-[11px] ${v.muted}`}>
                            {new Date(f.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                            {f.client && ` · ${f.client}`}
                          </p>
                        </div>
                        <span
                          className={`text-[13px] font-semibold tabular-nums ${f.type === 'income' ? 'text-[#16A34A]' : 'text-[#E5484D]'}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {f.type === 'income' ? '+' : '-'}{fmt(f.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </BezelCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
