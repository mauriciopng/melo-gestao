'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/melo/AppShell';
import { TrendingUp, TrendingDown, Award, BarChart2 } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function tk() { return localStorage.getItem('melo_token') || ''; }

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CAT_COLORS: Record<string, string> = {
  design: '#4C82FF', filming: '#FF9F0A', web: '#32D74B',
  consulting: '#BF5AF2', photo: '#FF375F', other: '#8E8E93',
};
const CAT_LABELS: Record<string, string> = {
  design: 'Design', filming: 'Filmagem', web: 'Web',
  consulting: 'Consultoria', photo: 'Foto', other: 'Outro',
};

interface MonthData { month: number; income: number; expenses: number; }
interface StatsData {
  monthly: MonthData[];
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  servicesByStatus: Record<string, number>;
  totalRevenue: number; totalExpenses: number; netProfit: number; completedValue: number;
}

function BarChart({ data, isDark }: { data: MonthData[]; isDark: boolean }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const H = 100;
  return (
    <div className="mt-4">
      <div className="flex items-end gap-1 h-28">
        {data.map(d => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: H }}>
              <div className="w-[42%] rounded-t transition-all"
                style={{ height: `${Math.max((d.income / maxVal) * H, d.income > 0 ? 4 : 0)}px`, background: '#32D74B', boxShadow: d.income > 0 ? '0 0 8px rgba(50,215,75,0.4)' : 'none' }} />
              <div className="w-[42%] rounded-t transition-all"
                style={{ height: `${Math.max((d.expenses / maxVal) * H, d.expenses > 0 ? 4 : 0)}px`, background: '#FF453A', boxShadow: d.expenses > 0 ? '0 0 8px rgba(255,69,58,0.4)' : 'none' }} />
            </div>
            <span style={{ fontSize: 8 }} className={isDark ? 'text-[#3A3A60]' : 'text-[#C7C7CC]'}>{MONTH_NAMES[d.month - 1]}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#32D74B]" /><span className="text-xs text-[#8E8E93]">Receita</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#FF453A]" /><span className="text-xs text-[#8E8E93]">Despesa</span></div>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <p className="text-[#6868A0] text-sm text-center py-4">Sem dados ainda</p>;
  const SIZE = 120; const CX = 60; const CY = 60; const R = 42; const SW = 18;
  let angle = -Math.PI / 2;
  const arcs = entries.map(([key, val]) => {
    const pct = val / total;
    const a = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    angle += a;
    const x2 = CX + R * Math.cos(angle);
    const y2 = CY + R * Math.sin(angle);
    return { key, val, large: a > Math.PI ? 1 : 0, x1, y1, x2, y2 };
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} className="overflow-visible drop-shadow-md">
        {arcs.map(a => (
          <path key={a.key} fill="none" stroke={CAT_COLORS[a.key] || '#8E8E93'}
            strokeWidth={SW} strokeLinecap="butt"
            d={`M ${a.x1} ${a.y1} A ${R} ${R} 0 ${a.large} 1 ${a.x2} ${a.y2}`}
            style={{ filter: `drop-shadow(0 0 4px ${CAT_COLORS[a.key] || '#8E8E93'}66)` }} />
        ))}
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="9" fill="#8E8E93" fontWeight="600">
          {fmt(total)}
        </text>
      </svg>
      <div className="mt-3 space-y-1.5 w-full">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[key] || '#8E8E93', boxShadow: `0 0 4px ${CAT_COLORS[key] || '#8E8E93'}80` }} />
              <span className="text-xs text-[#8E8E93]">{CAT_LABELS[key] || key}</span>
            </div>
            <span className="text-xs font-semibold text-[#8E8E93]">{fmt(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const { v, isDark } = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/melo/statistics?year=${year}`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [year]);

  const svcColors: Record<string, string> = {
    proposal: '#FF9F0A', in_progress: '#4C82FF', review: '#BF5AF2', completed: '#32D74B',
  };
  const svcLabels: Record<string, string> = {
    proposal: 'Proposta', in_progress: 'Em andamento', review: 'Revisão', completed: 'Concluído',
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        {/* Year selector */}
        <div className="flex items-center gap-3">
          <button onClick={() => setYear(y => y - 1)}
            className={`w-8 h-8 rounded-xl ${v.card} ${v.shadow} flex items-center justify-center ${v.t2} ${v.hover} font-medium`}>‹</button>
          <span className={`font-bold ${v.t1}`}>{year}</span>
          <button onClick={() => setYear(y => y + 1)}
            className={`w-8 h-8 rounded-xl ${v.card} ${v.shadow} flex items-center justify-center ${v.t2} ${v.hover} font-medium`}>›</button>
        </div>

        {loading ? (
          <div className="space-y-4">{[0, 1, 2].map(i => <div key={i} className={`h-40 ${v.card} rounded-2xl animate-pulse`} />)}</div>
        ) : (
          <>
            {/* Annual KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #0066FF, #003ECC)', boxShadow: '0 4px 16px rgba(0,102,255,0.35)' }}>
                <TrendingUp size={16} className="mb-2 opacity-80" />
                <p className="text-lg font-bold">{fmt(data?.totalRevenue || 0)}</p>
                <p className="text-xs opacity-70 mt-0.5">Receita Anual</p>
              </div>
              <div className={`${v.card} rounded-2xl p-4 ${v.shadow}`}>
                <TrendingDown size={16} className="mb-2 text-[#FF453A]" />
                <p className={`text-lg font-bold ${v.t1}`}>{fmt(data?.totalExpenses || 0)}</p>
                <p className={`text-xs ${v.muted} mt-0.5`}>Despesas Anuais</p>
              </div>
              <div className={`${v.card} rounded-2xl p-4 ${v.shadow}`}>
                <BarChart2 size={16} className={`mb-2 ${(data?.netProfit || 0) >= 0 ? 'text-[#32D74B]' : 'text-[#FF453A]'}`} />
                <p className={`text-lg font-bold ${(data?.netProfit || 0) >= 0 ? 'text-[#32D74B]' : 'text-[#FF453A]'}`}>{fmt(data?.netProfit || 0)}</p>
                <p className={`text-xs ${v.muted} mt-0.5`}>Lucro Líquido</p>
              </div>
              <div className={`${v.card} rounded-2xl p-4 ${v.shadow}`}>
                <Award size={16} className="mb-2 text-[#FF9F0A]" />
                <p className={`text-lg font-bold ${v.t1}`}>{fmt(data?.completedValue || 0)}</p>
                <p className={`text-xs ${v.muted} mt-0.5`}>Serviços Concluídos</p>
              </div>
            </div>

            {/* Monthly chart */}
            <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
              <h3 className={`font-semibold ${v.t1}`}>Receita vs Despesa</h3>
              <p className={`text-xs ${v.muted} mt-0.5`}>Mensal em {year}</p>
              {data && <BarChart data={data.monthly} isDark={isDark} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
                <h3 className={`font-semibold ${v.t1}`}>Despesas</h3>
                <p className={`text-xs ${v.muted} mt-0.5 mb-3`}>Por categoria</p>
                {data && <DonutChart data={data.expensesByCategory} />}
              </div>
              <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
                <h3 className={`font-semibold ${v.t1}`}>Receitas</h3>
                <p className={`text-xs ${v.muted} mt-0.5 mb-3`}>Por categoria</p>
                {data && <DonutChart data={data.incomeByCategory} />}
              </div>
            </div>

            {/* Services by status */}
            <div className={`${v.card} rounded-2xl p-5 ${v.shadow}`}>
              <h3 className={`font-semibold ${v.t1} mb-4`}>Status dos Serviços</h3>
              <div className="space-y-3">
                {Object.entries(svcLabels).map(([key, label]) => {
                  const val = (data?.servicesByStatus as Record<string, number>)?.[key] || 0;
                  const total = Object.values(data?.servicesByStatus || {}).reduce((s: number, v: number) => s + v, 0);
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm ${v.t2}`}>{label}</span>
                        <span className={`text-sm font-semibold ${v.t1}`}>{val}</span>
                      </div>
                      <div className={`${isDark ? 'bg-[#1E1E38]' : 'bg-[#F2F2F7]'} rounded-full h-2`}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: svcColors[key], boxShadow: `0 0 6px ${svcColors[key]}66` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
