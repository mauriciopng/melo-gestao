'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/melo/AppShell';
import { Plus, X, ChatCircle, PaperPlaneTilt, ClipboardText, PencilSimple } from '@phosphor-icons/react';
import { Trash2, TrendingUp, TrendingDown, DollarSign, Check } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';
import type { FinanceEntry } from '@/lib/melo/types';

/* ── Form categories ── */
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

/* ── Chat / business expense categories ── */
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
  [/\balimenta[cç][aã]o\b|\bcomida\b|\balmoc\b|\blanche\b|\bjantar\b|\bmerenda\b/i, 'ALIMENTAÇÃO'],
  [/\bfix[ao]s?\b/i,                                        'FIXAS'],
  [/\bcombust[ií]v[ei]l\b|\bgasolina\b|\b[aá]lcool\b|\bdiesel\b|\betanol\b/i, 'COMBUSTÍVEL'],
  [/\bped[aá]gio\b|\bpedagios\b/i,                          'PEDÁGIO'],
  [/\bfuncion[aá]rio\b|\bfuncionarios\b|\bsal[aá]rio\b|\bfuncion[aá]rios\b/i, 'FUNCIONÁRIOS'],
  [/\bcontas?\b|\bboleto\b|\bfatura\b/i,                    'CONTAS'],
  [/\bmarcelo\b|\bpessoal\b/i,                              'MARCELO'],
];

interface CustomCategory { id: string; name: string; label: string; color: string; }

const PRESET_COLORS = [
  '#1D6EF7','#32D74B','#FF453A','#FF9F0A','#BF5AF2','#64D2FF',
  '#FFD60A','#FF375F','#10B981','#F97316','#8B5CF6','#EC4899',
  '#14B8A6','#6366F1','#84CC16','#A78BFA',
];

function parseExpense(text: string, customCats: CustomCategory[] = []): { amount: number; category: string } | null {
  const numMatch = text.match(/r?\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if (!numMatch) return null;
  const amount = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return null;
  for (const [re, cat] of CATEGORY_PARSE) {
    if (re.test(text)) return { amount, category: cat };
  }
  // Verifica categorias personalizadas
  for (const cc of customCats) {
    if (text.toLowerCase().includes(cc.label.toLowerCase()) ||
        text.toLowerCase().includes(cc.name.toLowerCase())) {
      return { amount, category: cc.name };
    }
  }
  return null;
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
function tk()  { return localStorage.getItem('melo_token') || ''; }

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const EMPTY_FORM = {
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
  const [tab, setTab]         = useState<Tab>('list');
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  /* Edit state */
  const [editEntry, setEditEntry]   = useState<FinanceEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCat, setEditCat]       = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* Summary */
  const [showSummary, setShowSummary] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  /* Chat */
  const [chatInput, setChatInput]   = useState('');
  const [chatMsgs, setChatMsgs]     = useState<ChatMsg[]>([
    { id: '0', role: 'system', text: 'Olá! Envie seus gastos no formato:\nvalor categoria\n\nEx: 150 combustivel\n85,50 alimentacao\n200 material' },
  ]);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Custom categories */
  const [customCats,   setCustomCats]   = useState<CustomCategory[]>([]);
  const [showNewCat,   setShowNewCat]   = useState(false);
  const [newCatLabel,  setNewCatLabel]  = useState('');
  const [newCatColor,  setNewCatColor]  = useState('#10B981');
  const [savingNewCat, setSavingNewCat] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/melo/finances?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); });
  }, [month, year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  useEffect(() => {
    fetch('/api/melo/categories', { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => setCustomCats(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  /* ── Totals ── */
  const totalIncome  = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  /* Merge built-in + custom categories */
  const allChatCats: Record<string, { label: string; color: string }> = {
    ...CHAT_CATS,
    ...Object.fromEntries(customCats.map(cc => [cc.name, { label: cc.label, color: cc.color }])),
  };

  /* Chat entries + category totals */
  const chatEntries = entries.filter(e => Object.keys(allChatCats).includes(e.category));
  const catTotals   = Object.entries(allChatCats).map(([cat, cfg]) => ({
    cat, cfg,
    total: chatEntries.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

  const totalChatExpense = catTotals.reduce((s, r) => s + r.total, 0);

  /* ── Create custom category ── */
  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    setSavingNewCat(true);
    const res = await fetch('/api/melo/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ label: newCatLabel.trim(), color: newCatColor }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCustomCats(prev => [...prev, cat]);
      setNewCatLabel('');
      setShowNewCat(false);
    }
    setSavingNewCat(false);
  }

  async function deleteCustomCategory(id: string) {
    if (!confirm('Remover esta categoria?')) return;
    await fetch(`/api/melo/categories?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    setCustomCats(prev => prev.filter(c => c.id !== id));
  }

  /* ── Delete ── */
  async function del(id: string) {
    if (!confirm('Remover este lançamento?')) return;
    await fetch(`/api/melo/finances?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    load();
  }

  /* ── Edit ── */
  function openEdit(e: FinanceEntry) {
    setEditEntry(e);
    setEditAmount(String(e.amount));
    setEditCat(e.category);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editEntry) return;
    setEditSaving(true);
    await fetch('/api/melo/finances', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ id: editEntry.id, amount: parseFloat(editAmount), category: editCat }),
    });
    setEditSaving(false);
    setEditEntry(null);
    load();
  }

  /* ── Form save ── */
  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    setSaving(true);
    await fetch('/api/melo/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), source: 'form' }),
    });
    setSaving(false); setModal(false); setForm(EMPTY_FORM); load();
  }

  /* ── Chat send ── */
  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatMsgs(m => [...m, { id: Date.now().toString(), role: 'user', text }]);
    setChatInput('');
    setChatSending(true);

    const parsed = parseExpense(text, customCats);
    if (!parsed) {
      const names = Object.values(allChatCats).map(c => c.label).join(', ');
      setChatMsgs(m => [...m, { id: Date.now() + 'e', role: 'system',
        text: `Não entendi. Tente: 150 combustivel\nCategorias: ${names}`, error: true }]);
      setChatSending(false);
      return;
    }

    const entry: ChatMsg = {
      id: Date.now() + 'p', role: 'system',
      text: `${fmt(parsed.amount)} → ${allChatCats[parsed.category]?.label || parsed.category}`,
      parsed,
    };
    setChatMsgs(m => [...m, entry]);

    await fetch('/api/melo/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ type: 'expense', amount: parsed.amount, category: parsed.category,
        description: text, date: new Date().toISOString().split('T')[0], client: '', source: 'chat' }),
    });

    setChatMsgs(m => m.map(msg => msg.id === entry.id ? { ...msg, saved: true } : msg));
    setChatSending(false);
    if (month === now.getMonth() + 1 && year === now.getFullYear()) load();
  }

  /* ── Monthly summary text ── */
  function buildSummaryText() {
    const lines = [
      `📊 RESUMO DE GASTOS — ${MONTHS[month - 1].toUpperCase()} ${year}`,
      `${'─'.repeat(36)}`,
    ];
    catTotals.forEach(({ cfg, total }) => {
      const pct = totalChatExpense > 0 ? ((total / totalChatExpense) * 100).toFixed(0) : '0';
      lines.push(`${cfg.label.padEnd(14)} ${fmt(total).padStart(12)}  (${pct}%)`);
    });
    lines.push('─'.repeat(36));
    lines.push(`TOTAL          ${fmt(totalChatExpense).padStart(12)}`);
    if (totalIncome > 0) {
      lines.push(`Receitas       ${fmt(totalIncome).padStart(12)}`);
      lines.push(`Saldo          ${fmt(totalIncome - totalExpense).padStart(12)}`);
    }
    return lines.join('\n');
  }

  async function copySummary() {
    await navigator.clipboard.writeText(buildSummaryText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  }

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
            <span className="font-semibold min-w-[100px] text-center text-[15px]" style={{ color: c.t1 }}>
              {MONTHS_SHORT[month-1]} {year}
            </span>
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
            <p className="text-[14px] font-bold leading-tight" style={{ fontVariantNumeric:'tabular-nums', wordBreak:'break-all' }}>{fmt(totalIncome)}</p>
            <p className="text-[10px] opacity-75 mt-1">Receitas</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <TrendingDown size={15} className="mb-2 text-[#E5484D]" />
            <p className="text-[14px] font-bold leading-tight" style={{ color: c.t1, fontVariantNumeric:'tabular-nums', wordBreak:'break-all' }}>{fmt(totalExpense)}</p>
            <p className="text-[10px] mt-1" style={{ color: c.muted }}>Despesas</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
            <DollarSign size={15} className={`mb-2 ${totalIncome-totalExpense>=0?'text-[#1D6EF7]':'text-[#E5484D]'}`} />
            <p className="text-[14px] font-bold leading-tight" style={{ color: totalIncome-totalExpense>=0?c.t1:'#E5484D', fontVariantNumeric:'tabular-nums', wordBreak:'break-all' }}>{fmt(totalIncome-totalExpense)}</p>
            <p className="text-[10px] mt-1" style={{ color: c.muted }}>Saldo</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          {([['list','Movimentações'],['chat','Chat de Gastos']] as [Tab,string][]).map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{ background: tab===t?'#1D6EF7':(isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'),
                       color: tab===t?'#fff':c.muted }}>
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
                <DollarSign size={28} className="mx-auto mb-2 opacity-30" style={{ color: c.muted }} />
                <p className="text-sm" style={{ color: c.muted }}>Nenhuma movimentação neste mês</p>
              </div>
            ) : (
              entries.map((e, i) => {
                const catCfg = allChatCats[e.category];
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderTop: i !== 0 ? `1px solid ${c.border}` : 'none' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: catCfg ? catCfg.color+'22' : (e.type==='income'?'rgba(22,163,74,0.12)':'rgba(229,72,77,0.12)'),
                               color: catCfg ? catCfg.color : (e.type==='income'?'#16A34A':'#E5484D') }}>
                      {catCfg ? catCfg.label[0] : (e.type==='income'?'↑':'↓')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: c.t1 }}>{e.description || CAT_LABEL[e.category] || e.category}</p>
                      <p className="text-xs" style={{ color: c.muted }}>
                        {new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR')} · {CAT_LABEL[e.category] || e.category}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums flex-shrink-0"
                      style={{ color: catCfg ? catCfg.color : (e.type==='income'?'#16A34A':'#E5484D') }}>
                      {e.type==='income'?'+':'-'}{fmt(e.amount)}
                    </span>
                    <button onClick={() => openEdit(e)} className="flex-shrink-0 hover:opacity-70 transition-opacity" style={{ color: c.muted }}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => del(e.id)} className="flex-shrink-0 hover:text-[#E5484D] transition-colors" style={{ color: c.muted }}>
                      <Trash2 size={14} />
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

            {/* ── Monthly Summary ── */}
            {catTotals.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <button onClick={() => setShowSummary(s => !s)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-70 transition-opacity"
                  style={{ borderBottom: showSummary ? `1px solid ${c.border}` : 'none' }}>
                  <div className="flex items-center gap-2">
                    <ClipboardText size={16} style={{ color: '#1D6EF7' }} />
                    <span className="font-semibold text-[14px]" style={{ color: c.t1 }}>
                      Resumo — {MONTHS[month-1]} {year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold" style={{ color: '#1D6EF7' }}>{fmt(totalChatExpense)}</span>
                    <span className="text-[11px]" style={{ color: c.muted }}>{showSummary ? '▲' : '▼'}</span>
                  </div>
                </button>

                {showSummary && (
                  <div className="px-4 pb-4 pt-2 space-y-2">
                    {catTotals.map(({ cat, cfg, total }) => {
                      const pct = totalChatExpense > 0 ? (total / totalChatExpense) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                              <span className="text-[13px] font-medium" style={{ color: c.t1 }}>{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px]" style={{ color: c.muted }}>{pct.toFixed(0)}%</span>
                              <span className="text-[13px] font-bold tabular-nums" style={{ color: cfg.color }}>{fmt(total)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.color }} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Totals row */}
                    <div className="pt-2 mt-1 flex items-center justify-between" style={{ borderTop: `1px solid ${c.border}` }}>
                      <span className="text-[12px] font-semibold" style={{ color: c.muted }}>TOTAL GASTOS</span>
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: '#E5484D' }}>{fmt(totalChatExpense)}</span>
                    </div>
                    {totalIncome > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold" style={{ color: c.muted }}>RECEITAS</span>
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: '#32D74B' }}>{fmt(totalIncome)}</span>
                      </div>
                    )}

                    {/* Copy button */}
                    <button onClick={copySummary}
                      className="w-full mt-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      style={{ background: copiedSummary ? 'rgba(50,215,75,0.15)' : (isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)'),
                               color: copiedSummary ? '#32D74B' : c.t1, border: `1px solid ${copiedSummary ? '#32D74B44' : c.border}` }}>
                      {copiedSummary ? <><Check size={14} /> Copiado!</> : <><ClipboardText size={14} /> Copiar Resumo</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Category bars */}
            {catTotals.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: c.muted }}>Por Categoria</p>
                <div className="grid grid-cols-2 gap-2">
                  {catTotals.map(({ cat, cfg, total }) => {
                    const pct = totalExpense > 0 ? (total / totalExpense) * 100 : 0;
                    return (
                      <div key={cat} className="rounded-xl p-3" style={{ background: cfg.color+'18', border: `1px solid ${cfg.color}33` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[10px]" style={{ color: c.muted }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="text-[13px] font-bold" style={{ color: c.t1 }}>{fmt(total)}</div>
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recent chat entries with edit/delete ── */}
            {chatEntries.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: c.muted }}>
                  Lançamentos via Chat
                </p>
                {chatEntries.slice().reverse().slice(0, 20).map((e, i, arr) => {
                  const cfg = allChatCats[e.category];
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: i !== 0 ? `1px solid ${c.border}` : 'none' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: cfg?.color+'22', color: cfg?.color }}>
                        {cfg?.label[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold truncate" style={{ color: c.t1 }}>{cfg?.label || e.category}</p>
                        <p className="text-[10px]" style={{ color: c.muted }}>
                          {new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR')}
                          {e.description && ` · ${e.description.substring(0, 30)}`}
                        </p>
                      </div>
                      <span className="text-[13px] font-bold tabular-nums flex-shrink-0" style={{ color: cfg?.color || '#E5484D' }}>
                        -{fmt(e.amount)}
                      </span>
                      <button onClick={() => openEdit(e)} className="flex-shrink-0 active:opacity-50 transition-opacity" style={{ color: c.muted }}>
                        <PencilSimple size={14} />
                      </button>
                      <button onClick={() => del(e.id)} className="flex-shrink-0 active:opacity-50 hover:text-[#E5484D] transition-colors" style={{ color: c.muted }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Category chips ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: c.muted }}>Categorias</p>
                <button onClick={() => { setShowNewCat(v => !v); setNewCatLabel(''); }}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                  style={{ background: showNewCat ? '#1D6EF7' : c.accentMuted, color: showNewCat ? '#fff' : '#1D6EF7' }}>
                  <Plus size={11} /> Nova
                </button>
              </div>

              {/* Chips row */}
              <div className="px-3 pb-3" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
                  {Object.entries(allChatCats).map(([key, cfg]) => {
                    const customEntry = customCats.find(cc => cc.name === key);
                    return (
                      <button key={key} type="button"
                        onClick={() => setChatInput(`0 ${cfg.label.toLowerCase()}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 20,
                          background: cfg.color + '18', border: `1px solid ${cfg.color}44`,
                          cursor: 'pointer', flexShrink: 0,
                          fontFamily: 'inherit',
                        }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                        {customEntry && (
                          <span onClick={e => { e.stopPropagation(); deleteCustomCategory(customEntry.id); }}
                            style={{ marginLeft: 2, color: cfg.color, opacity: 0.6,
                              cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* New category form */}
              {showNewCat && (
                <form onSubmit={createCategory}
                  style={{ borderTop: `1px solid ${c.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: c.muted, marginBottom: 6 }}>Nome da categoria</label>
                    <input autoFocus value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                      placeholder="Ex: Ferramentas, Aluguel, Marketing..."
                      required maxLength={24}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13,
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        border: `1px solid ${c.border}`, color: c.t1, outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: c.muted, marginBottom: 8 }}>Cor</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {PRESET_COLORS.map(color => (
                        <button key={color} type="button" onClick={() => setNewCatColor(color)}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: 'none',
                            cursor: 'pointer', position: 'relative', flexShrink: 0,
                            boxShadow: newCatColor === color ? `0 0 0 3px ${isDark?'#1C1C18':'#F0F0EC'}, 0 0 0 5px ${color}` : 'none',
                            transform: newCatColor === color ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setShowNewCat(false)}
                      style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)',
                        border: `1px solid ${c.border}`, color: c.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={savingNewCat || !newCatLabel.trim()}
                      style={{ flex: 2, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        background: `linear-gradient(135deg, ${newCatColor}, ${newCatColor}cc)`,
                        border: 'none', color: '#fff', cursor: 'pointer',
                        opacity: savingNewCat || !newCatLabel.trim() ? 0.5 : 1,
                        fontFamily: 'inherit' }}>
                      {savingNewCat ? 'Criando...' : `Criar "${newCatLabel || 'categoria'}"`}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Chat messages */}
            <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: c.card, border: `1px solid ${c.border}`, minHeight: 200 }}>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 280 }}>
                {chatMsgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
                    <div className="max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                      style={{ background: msg.role==='user' ? 'linear-gradient(135deg,#1D6EF7,#1249C2)'
                        : msg.error ? (isDark?'rgba(229,72,77,0.15)':'rgba(229,72,77,0.1)')
                        : (isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'),
                        color: msg.role==='user'?'#fff':msg.error?'#E5484D':c.t1,
                        border: msg.role==='system'&&!msg.error?`1px solid ${c.border}`:'none' }}>
                      <p style={{ whiteSpace:'pre-line' }}>{msg.text}</p>
                      {msg.parsed && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ background: allChatCats[msg.parsed.category]?.color||'#888' }} />
                          <span className="text-[11px] font-semibold opacity-80">{allChatCats[msg.parsed.category]?.label||msg.parsed.category}</span>
                          {msg.saved && <Check size={11} className="text-[#32D74B] ml-1" />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="px-3 pb-3 pt-2" style={{ borderTop: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();} }}
                    placeholder="Ex: 150 combustivel  ou  85,50 alimentacao"
                    className="flex-1 py-2.5 px-4 rounded-xl text-[13px] outline-none"
                    style={{ background:isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)', color:c.t1, border:`1px solid ${c.border}` }}
                    autoCapitalize="none" />
                  <button onClick={sendChat} disabled={!chatInput.trim()||chatSending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all"
                    style={{ background:'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
                    <PaperPlaneTilt size={17} weight="fill" />
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 text-center" style={{ color: c.muted }}>
                  Digite: valor + nome da categoria · Ex: 150 combustivel
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add form modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)' }}>
          <div className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl"
            style={{ background:isDark?'#141412':'#FEFEFE', border:`1px solid ${c.border}`,
                     maxHeight:'calc(88dvh - env(safe-area-inset-bottom))', overflow:'hidden' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0"
              style={{ borderBottom:`1px solid ${c.border}` }}>
              <h3 className="font-semibold text-[16px]" style={{ color:c.t1 }}>Nova Movimentação</h3>
              <button onClick={() => setModal(false)}><X size={20} style={{ color:c.muted }} /></button>
            </div>
            <div style={{ overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain',
              WebkitOverflowScrolling:'touch', touchAction:'pan-y', flex:1 } as React.CSSProperties}>
              <form onSubmit={saveForm} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
                <div className="flex rounded-xl overflow-hidden" style={{ border:`1px solid ${c.border}` }}>
                  {(['income','expense'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f=>({...f,type:t,category:t==='income'?'design':'contas'}))}
                      className="flex-1 py-2.5 text-sm font-semibold transition-all"
                      style={{ background:form.type===t?(t==='income'?'#16A34A':'#E5484D'):c.ib, color:form.type===t?'#fff':c.muted }}>
                      {t==='income'?'Receita':'Despesa'}
                    </button>
                  ))}
                </div>
                {[
                  { key:'amount', label:'Valor (R$) *', type:'number', placeholder:'0,00', required:true },
                  { key:'date',   label:'Data *',       type:'date',   placeholder:'',     required:true },
                  { key:'description', label:'Descrição', type:'text', placeholder:'Ex: Compra de materiais' },
                  { key:'client',      label:'Cliente',   type:'text', placeholder:'Nome do cliente' },
                ].map(({ key, label, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color:c.muted }}>{label}</label>
                    <input type={type} required={!!required} placeholder={placeholder}
                      value={(form as Record<string,string>)[key]}
                      onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                      step={type==='number'?'0.01':undefined}
                      className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it }} />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color:c.muted }}>Categoria</label>
                  <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                    className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it }}>
                    {(form.type==='income'?INCOME_CATS:EXPENSE_CATS).map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div style={{ paddingBottom:'calc(4rem + env(safe-area-inset-bottom))' }}>
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

      {/* ── Edit modal ── */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)' }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl"
            style={{ background:isDark?'#141412':'#FEFEFE', border:`1px solid ${c.border}` }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom:`1px solid ${c.border}` }}>
              <h3 className="font-semibold text-[16px]" style={{ color:c.t1 }}>Editar Lançamento</h3>
              <button onClick={() => setEditEntry(null)}><X size={20} style={{ color:c.muted }} /></button>
            </div>
            <form onSubmit={saveEdit} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16,
              paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))' }}>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color:c.muted }}>Valor (R$) *</label>
                <input autoFocus type="number" step="0.01" min="0" required value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color:c.muted }}>Categoria</label>
                <select value={editCat} onChange={e => setEditCat(e.target.value)}
                  className={inputCls} style={{ background:c.ib, border:`1px solid ${c.ibr}`, color:c.it }}>
                  {Object.entries(CHAT_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  {EXPENSE_CATS.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditEntry(null)}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
                  style={{ background:c.card, border:`1px solid ${c.border}`, color:c.muted }}>
                  Cancelar
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-[2] py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-40 active:scale-[0.98] transition-all"
                  style={{ background:'linear-gradient(135deg,#1D6EF7,#1249C2)' }}>
                  {editSaving ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
