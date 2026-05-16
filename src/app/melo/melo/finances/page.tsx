'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/melo/AppShell';
import { Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign, ChatCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import { Check } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';
import type { FinanceEntry } from '@/lib/melo/types';

/* ── Categories ── */
const INCOME_CATS = [
  { value: 'design',      label: 'Design' },
  { value: 'filming',     label: 'Filmagem' },
  { value: 'web',         label: 'Web' },
  { value: 'consulting',  label: 'Consultoria' },
  { value: 'photo',       label: 'Fotografia' },
  { value: 'other',       label: 'Outro' },
];
const EXPENSE_CATS = [
  { value: 'contas',       label: 'Contas & Serviços' },
  { value: 'alimentacao',  label: 'Alimentação' },
  { value: 'locomocao',    label: 'Locomoção' },
  { value: 'cartao',       label: 'Cartão de Crédito' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'marketing',    label: 'Marketing' },
  { value: 'aluguel',      label: 'Aluguel' },
  { value: 'outros',       label: 'Outros' },
];

/* New business expense categories (chat mode) */
const CHAT_CATS: Record<string, { label: string; color: string }> = {
  MATERIAL:      { label: 'Material',      color: '#FF9F0A' },
  'ALIMENTAÇÃO': { label: 'Alimentação',   color: '#32D74B' },
  FIXAS:         { label: 'Fixas',         color: '#BF5AF2' },
  'COMBUSTÍVEL': { label: 'Combustível',   color: '#FF453A' },
  'PEDÁGIO':     { label: 'Pedágio',       color: '#64D2FF' },
  'FUNCIONÁRIOS':{ label: 'Funcionários',  color: '#FFD60A' },
  CONTAS:        { label: 'Contas',        color: '#0A84FF' },
  MARCELO:       { label: 'Marcelo',       color: '#FF375F' },
};

const CATEGORY_PARSE: [RegExp, string][] = [
  [/\bmaterial\b|\bmateriais\b/i,                           'MATERIAL'],
  [/\balimenta[cç][aã]o\b|\bcomida\b|\balmoc\b|\blanche\b|\bjantar\b|\bmerenda\b|\bgeneros\b/i, 'ALIMENTAÇÃO'],
  [/\bfix[ao]s?\b/i,                                        'FIXAS'],
  [/\bcombust[ií]v[ei]l\b|\bgasolina\b|\b[aá]lcool\b|\bdiesel\b|\betanol\b/i, 'COMBUSTÍVEL'],
  [/\bped[aá]gio\b|\bpedagios\b/i,                          'PEDÁGIO'],
  [/\bfuncion[aá]rio\b|\bfuncionarios\b|\bsalario\b|\bsal[aá]rio\b|\bfuncion[aá]rios\b|\bfuncion[aá]r\b/i, 'FUNCIONÁRIOS'],
  [/\bcontas?\b|\bboleto\b|\bfatura\b/i,                    'CONTAS'],
  [/\bmarcelo\b|\bpessoal\b|\beu\b/i,                       'MARCELO'],
];

function parseExpense(text: string): { amount: number; category: string; description: string } | null {
  const clean = text.trim();
  // Match value: R$150, 150,50, 150.50, 150
  const numMatch = clean.match(/r?\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if (!numMatch) return null;
  const amount = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return null;

  let category = '';
  for (const [re, cat] of CATEGORY_PARSE) {
    if (re.test(clean)) { category = cat; break; }
  }
  if (!category) return null;

  return { amount, category, description: clean };
}

const CAT_LABEL: Record<string, string> = {
  design: 'Design', filming: 'Filmagem', web: 'Web', consulting: 'Consultoria',
  photo: 'Fotografia', other: 'Outro',
  contas: 'Contas & Serviços', alimentacao: 'Alimentação', locomocao: 'Locomoção',
  cartao: 'Cartão de Crédito', equipamentos: 'Equipamentos', marketing: 'Marketing',
  aluguel: 'Aluguel', outros: 'Outros',
  ...Object.fromEntries(Object.entries(CHAT_CATS).map(([k, v]) => [k, v.label])),
};

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function tk() { return localStorage.getItem('melo_token') || ''; }

const EMPTY = {
  type: 'income' as 'income' | 'expense',
  amount: '', category: 'design',
  description: '', date: new Date().toISOString().split('T')[0], client: '',
};

type Tab = 'list' | 'chat';

interface ChatMsg {
  id: string;
  role: 'user' | 'system';
  text: string;
  parsed?: { amount: number; category: string };
  saved?: boolean;
  error?: boolean;
}

export default function FinancesPage() {
  const { c, isDark } = useTheme();
  const now = new Date();
  const [tab, setTab]       = useState<Tab>('list');
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(now.getFullYear());
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  /* Chat state */
  const [chatInput, setChatInput] = useState('');
  const [chatMsgs, setChatMsgs]   = useState<ChatMsg[]>([
    { id: '0', role: 'system', text: 'Olá! Envie seus gastos no formato: valor categoria\nEx: 150 combustivel, 85,50 alimentacao, 200 material' },
  ]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/melo/finances?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); });
  }, [month, year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  function setType(type: 'income' | 'expense') {
    setForm(f => ({ ...f, type, category: type === 'income' ? 'design' : 'contas' }));
  }

  const totalIncome   = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense  = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    setSaving(true);
    await fetch('/api/melo/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), source: 'form' }),
    });
    setSaving(false); setModal(false); setForm(EMPTY); load();
  }

  async function del(id: string) {
    if (!confirm('Remover esta movimentação?')) return;
    await fetch(`/api/melo/finances?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    load();
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text };
    setChatMsgs(m => [...m, userMsg]);
    setChatInput('');
    setChatSending(true);

    const parsed = parseExpense(text);
    if (!parsed) {
      setChatMsgs(m => [...m, {
        id: Date.now() + 'r', role: 'system',
        text: 'Não entendi. Tente: 150 combustivel ou 85,50 alimentacao',
        error: true,
      }]);
      setChatSending(false);
      return;
    }

    const entry: ChatMsg = {
      id: Date.now() + 'p', role: 'system',
      text: `${fmt(parsed.amount)} → ${CHAT_CATS[parsed.category]?.label || parsed.category}`,
      parsed,
    };
    setChatMsgs(m => [...m, entry]);

    await fetch('/api/melo/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({
        type: 'expense',
        amount: parsed.amount,
        category: parsed.category,
        description: text,
        date: new Date().toISOString().split('T')[0],
        client: '',
        source: 'chat',
      }),
    });

    setChatMsgs(m => m.map(msg => msg.id === entry.id ? { ...msg, saved: true } : msg));
    setChatSending(false);
    if (month === now.getMonth() + 1 && year === now.getFullYear()) load();
  }

  /* Category summary for chat entries */
  const chatEntries = entries.filter(e => e.source === 'chat' || Object.keys(CHAT_CATS).includes(e.category));
  const catTotals = Object.keys(CHAT_CATS).map(cat => ({
    cat,
    total: chatEntries.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const inputCls = `w-full px-4 py-2.5 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D6EF7] transition-all`;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-medium"
              style={{ background: c.card, color: c.t2, border: `1px solid ${c.border}` }}>‹</button>
            <span className="font-semibold min-w-[100px] text-center text-[15px]" style={{ color: c.t1 }}>{MONTHS[month-1]} {year}</span>
            <button onClick={() => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-medium"
              style={{ background: c.card, color: c.t2, border: `1px solid ${c.border}` }}>›</button>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.35)' }}>
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4 text-white"
            style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
            <TrendingUp size={15} className="mb-2 opacity-80" />
            <p className="text-[14px] font-bold leading-tight" style={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{fmt(totalIncome)}</p>
            <p className="text-[10px] opacity-75 mt-1">Receitas</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <TrendingDown size={15} className="mb-2 text-[#E5484D]" />
            <p className="text-[14px] font-bold leading-tight" style={{ color: c.t1, fontVariantNumeric: 'tabular-nums', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{fmt(totalExpense)}</p>
            <p className="text-[10px] mt-1" style={{ color: c.muted }}>Despesas</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <DollarSign size={15} className={`mb-2 ${totalIncome-totalExpense>=0?'text-[#1D6EF7]':'text-[#E5484D]'}`} />
            <p className="text-[14px] font-bold leading-tight" style={{ color: totalIncome-totalExpense>=0?c.t1:'#E5484D', fontVariantNumeric: 'tabular-nums', overflowWrap: 'break-word', wordBreak: 'break-all' }}>{fmt(totalIncome-totalExpense)}</p>
            <p className="text-[10px] mt-1" style={{ color: c.muted }}>Saldo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          {([['list','Movimentações'],['chat','Chat de Gastos']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{ background: tab===t?(isDark?'#1D6EF7':'#1D6EF7'):(isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'),
                       color: tab===t?'#fff':(c.muted) }}>
              {t==='chat' && <ChatCircle size={14} />}
              {label}
            </button>
          ))}
        </div>

        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            {loading ? (
              <div className="p-8 text-center text-sm" style={{ color: c.muted }}>Carregando...</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign size={28} className="mx-auto mb-2 opacity-30" style={{ color: c.muted } as React.CSSProperties} />
                <p className="text-sm" style={{ color: c.muted }}>Nenhuma movimentação neste mês</p>
                <button onClick={() => setModal(true)} className="mt-2 text-[#1D6EF7] text-sm hover:opacity-80">+ Adicionar</button>
              </div>
            ) : (
              entries.map((e, i) => {
                const catCfg = CHAT_CATS[e.category];
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderTop: i !== 0 ? `1px solid ${c.border}` : 'none' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: catCfg ? catCfg.color + '22' : (e.type==='income'?'rgba(22,163,74,0.12)':'rgba(229,72,77,0.12)'),
                               color: catCfg ? catCfg.color : (e.type==='income'?'#16A34A':'#E5484D') }}>
                      {catCfg ? catCfg.label[0] : (e.type==='income'?'↑':'↓')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: c.t1 }}>{e.description || CAT_LABEL[e.category] || e.category}</p>
                      <p className="text-xs" style={{ color: c.muted }}>
                        {new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR')}
                        {e.client && ` · ${e.client}`} · {CAT_LABEL[e.category] || e.category}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums"
                      style={{ color: catCfg ? catCfg.color : (e.type==='income'?'#16A34A':'#E5484D'), fontVariantNumeric: 'tabular-nums' }}>
                      {e.type==='income'?'+':'-'}{fmt(e.amount)}
                    </span>
                    <button onClick={() => del(e.id)} className="ml-1 hover:text-[#E5484D] transition-colors" style={{ color: c.muted }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div className="space-y-4">
            {/* Category totals */}
            {catTotals.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: c.muted }}>Resumo por Categoria</p>
                <div className="grid grid-cols-2 gap-2">
                  {catTotals.map(({ cat, total }) => {
                    const cfg = CHAT_CATS[cat];
                    const pct = totalExpense > 0 ? (total / totalExpense) * 100 : 0;
                    return (
                      <div key={cat} className="rounded-xl p-3" style={{ background: cfg.color + '18', border: `1px solid ${cfg.color}33` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[10px]" style={{ color: c.muted }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="text-[13px] font-bold" style={{ color: c.t1 }}>{fmt(total)}</div>
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: c.border }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: c.card, border: `1px solid ${c.border}`, minHeight: 280 }}>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 340 }}>
                {chatMsgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed`}
                      style={{
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg,#1D6EF7,#1249C2)'
                          : msg.error
                            ? (isDark ? 'rgba(229,72,77,0.15)' : 'rgba(229,72,77,0.1)')
                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        color: msg.role === 'user' ? '#fff' : msg.error ? '#E5484D' : c.t1,
                        border: msg.role === 'system' && !msg.error ? `1px solid ${c.border}` : 'none',
                      }}>
                      <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                      {msg.parsed && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-3 h-3 rounded-full"
                            style={{ background: CHAT_CATS[msg.parsed.category]?.color || '#888' }} />
                          <span className="text-[11px] font-semibold opacity-80">
                            {CHAT_CATS[msg.parsed.category]?.label || msg.parsed.category}
                          </span>
                          {msg.saved && <Check size={11} className="text-[#32D74B] ml-1" />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-2" style={{ borderTop: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Ex: 150 combustivel  ou  85,50 alimentacao"
                    className="flex-1 py-2.5 px-4 rounded-xl text-[13px] outline-none"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: c.t1, border: `1px solid ${c.border}` }}
                    autoCapitalize="none" inputMode="text"
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim() || chatSending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
                    <PaperPlaneTilt size={17} weight="fill" />
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 text-center" style={{ color: c.muted }}>
                  Categorias: Material · Alimentação · Fixas · Combustível · Pedágio · Funcionários · Contas · Marcelo
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onTouchMove={e => e.stopPropagation()}
        >
          <div
            className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl"
            style={{
              background: isDark ? '#141412' : '#FEFEFE',
              border: `1px solid ${c.border}`,
              maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${c.border}` }}>
              <h3 className="font-semibold text-[16px]" style={{ color: c.t1 }}>Nova Movimentação</h3>
              <button onClick={() => setModal(false)}><X size={20} style={{ color: c.muted }} /></button>
            </div>
            <div style={{ overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain',
                WebkitOverflowScrolling:'touch', touchAction:'pan-y', flex:1, width:'100%', boxSizing:'border-box' } as React.CSSProperties}>
              <form onSubmit={save} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16, width:'100%', boxSizing:'border-box' }}>
                <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
                  {(['income','expense'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className="flex-1 py-2.5 text-sm font-semibold transition-all"
                      style={{ background: form.type===t?(t==='income'?'#16A34A':'#E5484D'):c.ib, color: form.type===t?'#fff':c.muted }}>
                      {t==='income'?'Receita':'Despesa'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" value={form.amount}
                    onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0,00" required
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Data *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} required
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>
                    {form.type==='income'?'Categoria de Receita':'Categoria de Despesa'}
                  </label>
                  <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }}>
                    {cats.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Descrição</label>
                  <input type="text" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                    placeholder="Ex: Compra de materiais"
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Cliente</label>
                  <input type="text" value={form.client} onChange={e => setForm(f=>({...f,client:e.target.value}))}
                    placeholder="Nome do cliente"
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it, width:'100%', boxSizing:'border-box', minWidth:0 }} />
                </div>
                <div style={{ paddingTop:8, paddingBottom:'calc(5rem + env(safe-area-inset-bottom))' }}>
                  <button type="submit" disabled={saving}
                    className="w-full text-white py-3.5 rounded-xl font-semibold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-all"
                    style={{ background:'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow:'0 2px 12px rgba(29,110,247,0.35)' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
