'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/melo/AppShell';
import { TrendUp, TrendDown, Briefcase, Clock, CaretRight, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTheme } from '@/lib/melo/theme';
import type { DashboardSummary } from '@/lib/melo/types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  proposal:    { bg: 'rgba(29,110,247,0.1)',   text: '#1D6EF7' },
  in_progress: { bg: 'rgba(29,110,247,0.12)',  text: '#1D6EF7' },
  review:      { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6' },
  completed:   { bg: 'rgba(22,163,74,0.12)',  text: '#16A34A' },
  cancelled:   { bg: 'rgba(107,114,128,0.1)', text: '#6B7280' },
};
const STATUS_LABELS: Record<string, string> = {
  proposal: 'Proposta', in_progress: 'Em andamento',
  review: 'Revisão', completed: 'Concluído', cancelled: 'Cancelado',
};
const EVENT_DOT: Record<string, string> = {
  meeting: '#1D6EF7', delivery: '#16A34A', shoot: '#D97706',
  call: '#8B5CF6', edit: '#EF4444', other: '#6B7280',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function todayStr() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Skeleton({ w = '100%', h = 80, r = 16 }: { w?: string | number; h?: number; r?: number }) {
  const { isDark } = useTheme();
  return (
    <div className="animate-pulse" style={{
      width: w, height: h, borderRadius: r,
      background: isDark ? '#1C1C18' : '#EBEBEA',
    }} />
  );
}

/* ── Surface card ── */
function Card({ children, style = {}, onClick }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const { isDark, c } = useTheme();
  return (
    <div onClick={onClick} style={{
      borderRadius: 18,
      background: c.card,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      boxShadow: isDark
        ? '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { isDark, c } = useTheme();
  const [data,    setData]    = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('melo_token') || '';
    fetch('/api/melo/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const profit     = data?.netProfit   ?? 0;
  const pending    = data?.totalPending ?? 0;
  const isPositive = profit >= 0;

  return (
    <AppShell>
      <div style={{ padding: '20px 16px 8px', maxWidth: 720, margin: '0 auto' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: c.muted, marginBottom: 4 }}>
            {todayStr()}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
            color: c.t1, lineHeight: 1.2 }}>
            {greeting()}, Maurício
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton h={112} />
              <div className="flex flex-col gap-2">
                <Skeleton h={52} />
                <Skeleton h={52} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton h={88} /><Skeleton h={88} /><Skeleton h={88} />
            </div>
            <Skeleton h={180} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">

            {/* ── Row 1: KPIs ── */}
            <div className="grid grid-cols-2 gap-3">

              {/* Revenue — Blue accent card */}
              <div style={{
                borderRadius: 18, padding: '20px 20px 18px',
                background: 'linear-gradient(145deg, #1D6EF7, #1249C2)',
                boxShadow: '0 6px 24px rgba(29,110,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.14em', color: 'rgba(191,219,254,0.85)' }}>
                    Receita
                  </span>
                  <div style={{ width: 26, height: 26, borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center' }}>
                    <TrendUp size={13} color="white" weight="bold" />
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em',
                  color: '#fff', fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1, marginBottom: 6, wordBreak: 'break-all' }}>
                  {fmt(data?.totalIncome ?? 0)}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(191,219,254,0.7)' }}>Este mês</p>
              </div>

              {/* Expenses + Profit + A Receber stacked */}
              <div className="flex flex-col gap-2 min-w-0">
                <Card style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: c.muted }}>Despesas</span>
                    <TrendDown size={11} color="#EF4444" weight="bold" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em',
                    color: c.t1, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
                    {fmt(data?.totalExpenses ?? 0)}
                  </p>
                </Card>

                <Card style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: c.muted }}>Saldo</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%',
                      background: isPositive ? '#16A34A' : '#EF4444',
                      boxShadow: `0 0 5px ${isPositive ? '#16A34A88' : '#EF444488'}` }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em',
                    color: isPositive ? '#16A34A' : '#EF4444',
                    fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
                    {fmt(profit)}
                  </p>
                </Card>

                {/* A Receber */}
                <div style={{
                  borderRadius: 14, padding: '12px 14px',
                  background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: '#B45309' }}>A Receber</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%',
                      background: '#F59E0B', boxShadow: '0 0 5px rgba(245,158,11,0.6)' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em',
                    color: '#F59E0B', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
                    {fmt(pending)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Row 2: Service counters strip ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Briefcase,   value: data?.activeServices  ?? 0, label: 'Em andamento', color: '#1D6EF7' },
                { icon: Clock,       value: data?.pendingServices ?? 0, label: 'Propostas',    color: '#8B5CF6' },
                { icon: CheckCircle, value: data?.completedServices ?? 0, label: 'Concluídos', color: '#16A34A' },
              ].map(({ icon: Icon, value, label, color }) => (
                <Card key={label} style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, margin: '0 auto 8px',
                    background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} weight="fill" color={color} />
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: c.t1,
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {value}
                  </p>
                  <p style={{ fontSize: 10, color: c.muted, marginTop: 4, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}>
                    {label}
                  </p>
                </Card>
              ))}
            </div>

            {/* ── Row 3: Services (top) + Events (below on mobile, side by side on desktop) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Active Services */}
              <Card style={{ padding: '18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.t1 }}>Serviços</span>
                  <Link href="/melo/services"
                    style={{ display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 12, fontWeight: 600, color: c.accent,
                      textDecoration: 'none', opacity: 0.9 }}>
                    Ver <CaretRight size={11} weight="bold" />
                  </Link>
                </div>

                {(data?.activeServicesList?.length ?? 0) === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center' }}>
                    <Briefcase size={22} color={c.muted} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 12, color: c.muted }}>Nenhum ativo</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data!.activeServicesList.slice(0, 3).map(s => {
                      const sc = STATUS_COLORS[s.status];
                      return (
                        <div key={s.id}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: c.t1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              maxWidth: '60%' }}>
                              {s.name}
                            </span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20,
                              fontWeight: 700, background: sc?.bg, color: sc?.text, flexShrink: 0 }}>
                              {STATUS_LABELS[s.status]}
                            </span>
                          </div>
                          <div style={{ height: 3, borderRadius: 9999,
                            background: isDark ? '#1C1C18' : '#F0F0EC', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 9999,
                              width: `${s.progress}%`,
                              background: 'linear-gradient(90deg, #1D6EF7, #3B82F6)',
                              transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                            }} />
                          </div>
                          <p style={{ fontSize: 10, color: c.muted, marginTop: 3 }}>{s.client}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Upcoming Events */}
              <Card style={{ padding: '18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.t1 }}>Agenda</span>
                  <Link href="/melo/agenda"
                    style={{ display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 12, fontWeight: 600, color: c.accent,
                      textDecoration: 'none', opacity: 0.9 }}>
                    Ver <CaretRight size={11} weight="bold" />
                  </Link>
                </div>

                {(data?.upcomingEvents?.length ?? 0) === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center' }}>
                    <Clock size={22} color={c.muted} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 12, color: c.muted }}>Sem eventos</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data!.upcomingEvents.slice(0, 4).map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                          background: EVENT_DOT[e.type] ?? '#6B7280',
                          boxShadow: `0 0 6px ${(EVENT_DOT[e.type] ?? '#6B7280') + '55'}`,
                        }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: c.t1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.title}
                          </p>
                          <p style={{ fontSize: 10, color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',
                              { day: 'numeric', month: 'short' })} · {e.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Row 4: Recent transactions ── */}
            <Card>
              <div style={{ padding: '18px 18px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.t1 }}>Movimentações recentes</span>
                  <Link href="/melo/finances"
                    style={{ display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 12, fontWeight: 600, color: c.accent,
                      textDecoration: 'none', opacity: 0.9 }}>
                    Ver <CaretRight size={11} weight="bold" />
                  </Link>
                </div>
              </div>

              {(data?.recentFinances?.length ?? 0) === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 13, padding: '16px 0 24px', color: c.muted }}>
                  Nenhuma movimentação ainda
                </p>
              ) : (
                <div>
                  {data!.recentFinances.map((f, i) => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 18px',
                      borderTop: i === 0 ? `1px solid ${c.border}` : 'none',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        background: f.type === 'income' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                        color: f.type === 'income' ? '#16A34A' : '#EF4444',
                      }}>
                        {f.type === 'income' ? '↑' : '↓'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: c.t1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.description || f.category}
                        </p>
                        <p style={{ fontSize: 11, color: c.muted }}>
                          {new Date(f.date+'T12:00:00').toLocaleDateString('pt-BR',
                            { day: 'numeric', month: 'short' })}
                          {f.client && ` · ${f.client}`}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: f.type === 'income' ? '#16A34A' : '#EF4444', flexShrink: 0,
                      }}>
                        {f.type === 'income' ? '+' : '-'}{fmt(f.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        )}
      </div>
    </AppShell>
  );
}
