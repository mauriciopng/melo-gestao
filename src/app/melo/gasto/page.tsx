'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PaperPlaneTilt, ArrowLeft } from '@phosphor-icons/react';
import { Check } from 'lucide-react';

const CHAT_CATS: Record<string, { label: string; color: string; emoji: string }> = {
  MATERIAL:       { label: 'Material',      color: '#FF9F0A', emoji: '🧱' },
  'ALIMENTAÇÃO':  { label: 'Alimentação',   color: '#32D74B', emoji: '🍽️' },
  FIXAS:          { label: 'Fixas',         color: '#BF5AF2', emoji: '🏠' },
  'COMBUSTÍVEL':  { label: 'Combustível',   color: '#FF453A', emoji: '⛽' },
  'PEDÁGIO':      { label: 'Pedágio',       color: '#64D2FF', emoji: '🛣️' },
  'FUNCIONÁRIOS': { label: 'Funcionários',  color: '#FFD60A', emoji: '👷' },
  CONTAS:         { label: 'Contas',        color: '#0A84FF', emoji: '📄' },
  MARCELO:        { label: 'Marcelo',       color: '#FF375F', emoji: '👤' },
};

const CATEGORY_PARSE: [RegExp, string][] = [
  [/\bmaterial\b|\bmateriais\b/i,                           'MATERIAL'],
  [/\balimenta[cç][aã]o\b|\bcomida\b|\balmoc\b|\blanche\b|\bjantar\b/i, 'ALIMENTAÇÃO'],
  [/\bfix[ao]s?\b/i,                                        'FIXAS'],
  [/\bcombust[ií]v[ei]l\b|\bgasolina\b|\b[aá]lcool\b|\bdiesel\b/i, 'COMBUSTÍVEL'],
  [/\bped[aá]gio\b/i,                                       'PEDÁGIO'],
  [/\bfuncion[aá]rio\b|\bfuncionarios\b|\bsal[aá]rio\b/i,  'FUNCIONÁRIOS'],
  [/\bcontas?\b|\bboleto\b/i,                               'CONTAS'],
  [/\bmarcelo\b|\bpessoal\b/i,                              'MARCELO'],
];

function parseExpense(text: string) {
  const m = text.match(/r?\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return null;
  for (const [re, cat] of CATEGORY_PARSE) {
    if (re.test(text)) return { amount, category: cat };
  }
  return null;
}

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function tk() { return typeof window !== 'undefined' ? localStorage.getItem('melo_token') || '' : ''; }

interface Entry { amount: number; category: string; text: string; ok: boolean }

export default function GastoRapido() {
  const router = useRouter();
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [checking, setChecking]   = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = tk();
    if (!token) { router.replace('/melo'); return; }
    fetch('/api/melo/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) { router.replace('/melo'); }
        else { setChecking(false); setTimeout(() => inputRef.current?.focus(), 100); }
      })
      .catch(() => router.replace('/melo'));
  }, [router]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const parsed = parseExpense(text);

    if (!parsed) {
      setEntries(e => [{ amount: 0, category: '', text, ok: false }, ...e]);
      setInput('');
      setSending(false);
      return;
    }

    await fetch('/api/melo/finances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({
        type: 'expense', amount: parsed.amount, category: parsed.category,
        description: text, date: new Date().toISOString().split('T')[0],
        client: '', source: 'chat',
      }),
    });

    setEntries(e => [{ amount: parsed.amount, category: parsed.category, text, ok: true }, ...e]);
    setInput('');
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (checking) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0f1e',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D6EF7',
              animation: 'pulse 1s ease-in-out infinite', animationDelay: `${i*150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #0d1a2f 0%, #091320 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        background: 'rgba(13,26,47,0.9)',
        flexShrink: 0,
      }}>
        <button onClick={() => router.push('/melo/finances')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: 13 }}>Finanças</span>
        </button>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>⚡ Gasto Rápido</span>
        <div style={{ width: 70 }} />
      </div>

      {/* Category chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 16px',
        overflowX: 'auto', flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {Object.entries(CHAT_CATS).map(([cat, cfg]) => (
          <button key={cat}
            onClick={() => setInput(v => v ? v : `0 ${cat.toLowerCase()}`)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 20,
              background: cfg.color + '22', border: `1px solid ${cfg.color}44`,
              color: cfg.color, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* Recent entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 14 }}>Digite o valor e a categoria</p>
            <p style={{ fontSize: 12, marginTop: 6, color: 'rgba(255,255,255,0.2)' }}>
              Ex: 150 combustivel  ·  85,50 alimentacao
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
            {entries.map((e, i) => {
              const cfg = CHAT_CATS[e.category];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: e.ok ? 'rgba(255,255,255,0.06)' : 'rgba(229,72,77,0.12)',
                  border: `1px solid ${e.ok ? 'rgba(255,255,255,0.1)' : 'rgba(229,72,77,0.25)'}`,
                  borderRadius: 16, padding: '12px 14px',
                }}>
                  {e.ok && cfg ? (
                    <>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>
                          -{fmt(e.amount)}
                        </p>
                        <p style={{ color: cfg.color, fontSize: 11, margin: 0, marginTop: 2 }}>
                          {cfg.label}
                        </p>
                      </div>
                      <Check size={16} color="#32D74B" />
                    </>
                  ) : (
                    <p style={{ color: '#FF453A', fontSize: 13, margin: 0 }}>
                      ⚠️ Não entendi: "{e.text}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(13,26,47,0.95)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder="150 combustivel"
            autoCapitalize="none"
            inputMode="text"
            style={{
              flex: 1, padding: '14px 16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14, color: '#fff', fontSize: 16,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: input.trim() && !sending
                ? 'linear-gradient(135deg,#1D6EF7,#1249C2)'
                : 'rgba(255,255,255,0.1)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: !input.trim() || sending ? 0.5 : 1,
            }}>
            <PaperPlaneTilt size={20} weight="fill" color="#fff" />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '8px 0 0' }}>
          Material · Alimentação · Fixas · Combustível · Pedágio · Funcionários · Contas · Marcelo
        </p>
      </div>
    </div>
  );
}
