'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/melo/AppShell';
import { Plus, Trash2, X, Calendar, Clock, User } from 'lucide-react';
import { useTheme } from '@/lib/melo/theme';
import type { AgendaEvent } from '@/lib/melo/types';

const EVENT_TYPES = ['meeting', 'delivery', 'shoot', 'call', 'edit', 'other'];
const TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunião', delivery: 'Entrega', shoot: 'Gravação/Foto', call: 'Ligação', edit: 'Edição', other: 'Outro',
};
const TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-[#0066FF]', delivery: 'bg-[#32D74B]', shoot: 'bg-[#FF9F0A]',
  call: 'bg-[#BF5AF2]', edit: 'bg-[#FF375F]', other: 'bg-[#8E8E93]',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#FF9F0A]/15 text-[#FF9F0A]', confirmed: 'bg-[#0066FF]/15 text-[#4C82FF]',
  completed: 'bg-[#32D74B]/15 text-[#32D74B]', cancelled: 'bg-[#8E8E93]/15 text-[#8E8E93]',
};
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function tk() { return localStorage.getItem('melo_token') || ''; }
const EMPTY = { title: '', date: new Date().toISOString().split('T')[0], time: '09:00', duration: '60', type: 'meeting', client: '', notes: '', status: 'pending' };

export default function AgendaPage() {
  const { v, isDark } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/melo/agenda?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); });
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = now.toISOString().split('T')[0];

  const eventsByDay: Record<string, AgendaEvent[]> = {};
  events.forEach(e => { if (!eventsByDay[e.date]) eventsByDay[e.date] = []; eventsByDay[e.date].push(e); });

  const displayedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : events;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setSaving(true);
    await fetch('/api/melo/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify(form),
    });
    setSaving(false); setModal(false); setForm(EMPTY); load();
  }

  async function del(id: string) {
    if (!confirm('Remover este evento?')) return;
    await fetch(`/api/melo/agenda?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/melo/agenda', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const inputCls = `w-full px-4 py-2.5 rounded-xl border ${v.ibr} ${v.ib} ${v.it} placeholder-[#6868A0] focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all`;
  const selectCls = `w-full px-4 py-2.5 rounded-xl border ${v.ibr} ${v.ib} ${v.it} focus:outline-none focus:ring-2 focus:ring-[#0066FF] transition-all`;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
              className={`w-8 h-8 rounded-xl ${v.card} ${v.shadow} flex items-center justify-center ${v.t2} ${v.hover} font-medium`}>‹</button>
            <span className={`font-semibold ${v.t1} min-w-[130px] text-center`}>{MONTHS[month - 1]} {year}</span>
            <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
              className={`w-8 h-8 rounded-xl ${v.card} ${v.shadow} flex items-center justify-center ${v.t2} ${v.hover} font-medium`}>›</button>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #0066FF, #003ECC)', boxShadow: '0 2px 12px rgba(0,102,255,0.4)' }}>
            <Plus size={15} /> Evento
          </button>
        </div>

        {/* Calendar */}
        <div className={`${v.card} rounded-2xl p-4 ${v.shadow}`}>
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d, i) => (
              <div key={i} className={`text-center text-xs font-semibold ${v.muted} py-1`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasEvents = (eventsByDay[dateStr]?.length || 0) > 0;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDay;
              return (
                <button key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative
                    ${isSelected ? 'bg-[#0066FF] text-white shadow-[0_2px_8px_rgba(0,102,255,0.4)]' :
                      isToday ? (isDark ? 'bg-[#0066FF]/20 text-[#4C82FF] font-bold' : 'bg-[#0066FF]/10 text-[#0066FF] font-bold') :
                        `${v.t1} ${v.hover}`}`}>
                  {day}
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {(eventsByDay[dateStr] || []).slice(0, 3).map((ev, j) => (
                        <div key={j} className={`w-1 h-1 rounded-full ${TYPE_COLORS[ev.type] || 'bg-[#8E8E93]'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${v.t1} capitalize`}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <button onClick={() => setSelectedDay(null)} className="text-[#4C82FF] text-sm hover:opacity-80">Ver todos</button>
          </div>
        )}

        {/* Events */}
        <div className="space-y-3">
          {loading ? (
            <div className={`${v.card} rounded-2xl p-8 text-center ${v.muted} text-sm`}>Carregando...</div>
          ) : displayedEvents.length === 0 ? (
            <div className={`${v.card} rounded-2xl p-8 text-center ${v.shadow}`}>
              <Calendar size={28} className={`${v.muted} mx-auto mb-2 opacity-40`} />
              <p className={`text-sm ${v.muted}`}>{selectedDay ? 'Nenhum evento neste dia' : 'Nenhum evento neste mês'}</p>
            </div>
          ) : (
            displayedEvents.map(e => (
              <div key={e.id} className={`${v.card} rounded-2xl p-4 ${v.shadow}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${TYPE_COLORS[e.type]} shadow-sm`} />
                    <div className="min-w-0">
                      <p className={`font-semibold ${v.t1} truncate`}>{e.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className={`text-xs ${v.muted} flex items-center gap-1`}><Calendar size={11} />
                          {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs ${v.muted} flex items-center gap-1`}><Clock size={11} /> {e.time} ({e.duration}min)</span>
                        {e.client && <span className={`text-xs ${v.muted} flex items-center gap-1`}><User size={11} /> {e.client}</span>}
                      </div>
                      {e.notes && <p className={`text-xs ${v.muted} mt-1`}>{e.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={e.status} onChange={ev => updateStatus(e.id, ev.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${STATUS_COLORS[e.status]}`}
                      style={{ background: 'transparent' }}>
                      {Object.entries(STATUS_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                    </select>
                    <button onClick={() => del(e.id)} className={`${v.muted} hover:text-[#FF453A] transition-colors`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onTouchMove={e => e.stopPropagation()}
        >
          <div className={`w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl ${v.modal}`}
            style={{ maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))', overflow: 'hidden', border: `1px solid rgba(128,128,128,0.15)` }}>
            <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b ${v.border} flex-shrink-0 ${v.modal}`}>
              <h3 className={`font-semibold ${v.t1}`}>Novo Evento</h3>
              <button onClick={() => setModal(false)}><X size={20} className={v.muted} /></button>
            </div>
            <div style={{
                overflowY: 'auto', overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', flex: 1,
                width: '100%', boxSizing: 'border-box',
              } as React.CSSProperties}>
              <form onSubmit={save} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box' }}>

                <div>
                  <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Título *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Reunião com cliente" required className={inputCls}
                    style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                </div>

                {/* Grid com minWidth:0 em cada célula para evitar overflow */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Data *</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                      className={inputCls} style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Hora</label>
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className={inputCls} style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Tipo</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className={selectCls} style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Duração (min)</label>
                    <input type="number" min="15" step="15" value={form.duration}
                      onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                      className={inputCls} style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Cliente</label>
                  <input type="text" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    placeholder="Nome do cliente" className={inputCls}
                    style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                </div>

                <div>
                  <label className={`block text-xs font-medium ${v.muted} mb-1.5`}>Observações</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Detalhes do evento..." className={`${inputCls} resize-none`}
                    style={{ width: '100%', boxSizing: 'border-box', minWidth: 0 }} />
                </div>

                <div style={{ paddingTop: 8, paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
                  <button type="submit" disabled={saving}
                    className="w-full text-white py-3.5 rounded-xl font-semibold disabled:opacity-40 active:scale-98 transition-all"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.35)' }}>
                    {saving ? 'Salvando...' : 'Salvar Evento'}
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
