'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/melo/AppShell';
import { useTheme } from '@/lib/melo/theme';
import { Bell, Plus, Trash, CheckCircle, Clock, Warning, X } from '@phosphor-icons/react';
import type { Reminder } from '@/lib/melo/types';

function tk() { return localStorage.getItem('melo_token') || ''; }

const TYPE_ICONS: Record<string, string> = {
  manual: '⏰', agenda: '📅', service: '💼', finance: '💰',
};

const EMPTY = {
  title: '',
  body: '',
  datetime: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // +1h
  type: 'manual' as Reminder['type'],
};

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date();
}

export default function RemindersPage() {
  const { c, isDark } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  /* Notification permission state */
  const [notifStatus, setNotifStatus] = useState<'default'|'granted'|'denied'|'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [testMsg, setTestMsg] = useState<string>('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/melo/reminders', { headers: { Authorization: `Bearer ${tk()}` } })
      .then(r => r.json()).then(d => { setReminders(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Check notification support & permission */
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifStatus('unsupported'); return;
    }
    setNotifStatus(Notification.permission as 'default'|'granted'|'denied');
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
      });
    }
  }, []);

  /* Register SW + subscribe to push */
  async function enableNotifications() {
    if (!('serviceWorker' in navigator)) return;
    setSubLoading(true);
    setTestMsg('');
    try {
      // Register SW
      const reg = await navigator.serviceWorker.register('/melo-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setNotifStatus(perm as 'default'|'granted'|'denied');
      if (perm !== 'granted') { setSubLoading(false); return; }

      // Get VAPID key
      const vapidRes = await fetch('/api/melo/notifications/vapid-key');
      const { publicKey } = await vapidRes.json();

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey) as unknown as string,
      });

      // Save to server
      await fetch('/api/melo/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
        body: JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);
      setTestMsg('Notificações ativadas! Enviando notificação de teste...');

      // Send test
      await fetch('/api/melo/notifications/test', {
        method: 'POST', headers: { Authorization: `Bearer ${tk()}` },
      });
      setTestMsg('Notificações ativas! Você receberá um teste agora.');
    } catch (err) {
      console.error(err);
      setTestMsg('Erro ao ativar notificações. Tente novamente.');
    }
    setSubLoading(false);
  }

  async function disableNotifications() {
    setSubLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/melo/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setTestMsg('Notificações desativadas.');
    } catch {}
    setSubLoading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.datetime) return;
    setSaving(true);
    await fetch('/api/melo/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}` },
      body: JSON.stringify({ ...form, datetime: new Date(form.datetime).toISOString() }),
    });
    setSaving(false); setModal(false); setForm(EMPTY); load();
  }

  async function del(id: string) {
    if (!confirm('Remover este lembrete?')) return;
    await fetch(`/api/melo/reminders?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk()}` } });
    load();
  }

  const inputStyle = { background: c.ib, border: `1px solid ${c.ibr}`, color: c.it, width: '100%', boxSizing: 'border-box' as const };
  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D6EF7] transition-all';

  const pending = reminders.filter(r => !r.sent && !isOverdue(r.datetime));
  const past = reminders.filter(r => r.sent || isOverdue(r.datetime));

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

        {/* ── Notification permission card ── */}
        <div className="rounded-2xl p-5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={18} weight="fill" style={{ color: subscribed ? '#16A34A' : '#1D6EF7' }} />
                <h3 className="font-semibold text-[15px]" style={{ color: c.t1 }}>
                  {subscribed ? 'Notificações ativas' : 'Ativar notificações push'}
                </h3>
              </div>
              <p className="text-[13px]" style={{ color: c.muted }}>
                {notifStatus === 'unsupported'
                  ? 'Seu dispositivo não suporta notificações push. Instale o app na tela inicial (iOS 16.4+).'
                  : notifStatus === 'denied'
                  ? 'Permissão negada. Ative nas configurações do Safari → Configurações do Site → Notificações.'
                  : subscribed
                  ? 'Você receberá alarmes de agenda, serviços e lembretes manuais.'
                  : 'Instale o app na tela inicial e ative para receber alarmes mesmo com o app fechado.'}
              </p>
              {testMsg && <p className="text-[13px] mt-2 font-medium" style={{ color: '#16A34A' }}>{testMsg}</p>}
            </div>

            {notifStatus !== 'unsupported' && notifStatus !== 'denied' && (
              <button
                onClick={subscribed ? disableNotifications : enableNotifications}
                disabled={subLoading}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 transition-all active:scale-95"
                style={{ background: subscribed ? '#E5484D' : 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 8px rgba(29,110,247,0.3)' }}
              >
                {subLoading ? '...' : subscribed ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        </div>

        {/* ── Automáticos ── */}
        <div className="rounded-2xl p-5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <h3 className="font-semibold text-[15px] mb-3" style={{ color: c.t1 }}>Alarmes automáticos</h3>
          <div className="space-y-3">
            {[
              { icon: '📅', title: 'Compromissos na agenda', desc: 'Notificação 1 dia antes de cada evento confirmado' },
              { icon: '💼', title: 'Prazo de serviços', desc: 'Alerta quando o prazo de um serviço é hoje, amanhã ou em 2 dias' },
              { icon: '🎬', title: 'Etapas de serviço', desc: 'Lembrete automático quando o prazo de cada etapa se aproxima' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${c.border}` }}>
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: c.t1 }}>{item.title}</p>
                  <p className="text-[12px]" style={{ color: c.muted }}>{item.desc}</p>
                </div>
                <CheckCircle size={18} weight="fill" className="ml-auto flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Lembretes manuais ── */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[15px]" style={{ color: c.t1 }}>Lembretes manuais</h3>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 8px rgba(29,110,247,0.3)' }}
          >
            <Plus size={15} weight="bold" /> Novo
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: c.card, border: `1px solid ${c.border}`, color: c.muted }}>
            Carregando...
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: c.muted }}>Pendentes</p>
                {pending.map(r => (
                  <div key={r.id} className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: c.card, border: `1px solid ${c.border}` }}>
                    <span className="text-xl flex-shrink-0">{TYPE_ICONS[r.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: c.t1 }}>{r.title}</p>
                      {r.body && <p className="text-[12px] truncate" style={{ color: c.muted }}>{r.body}</p>}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={12} style={{ color: '#1D6EF7' }} />
                        <span className="text-[11px] font-medium" style={{ color: '#1D6EF7' }}>{fmtDt(r.datetime)}</span>
                      </div>
                    </div>
                    <button onClick={() => del(r.id)} className="flex-shrink-0" style={{ color: c.muted }}>
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: c.muted }}>Enviados / Passados</p>
                {past.map(r => (
                  <div key={r.id} className="rounded-2xl p-4 flex items-start gap-3 opacity-60"
                    style={{ background: c.card, border: `1px solid ${c.border}` }}>
                    <span className="text-xl flex-shrink-0">{TYPE_ICONS[r.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: c.t2 }}>{r.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {r.sent
                          ? <CheckCircle size={12} style={{ color: '#16A34A' }} />
                          : <Warning size={12} style={{ color: '#E5484D' }} />}
                        <span className="text-[11px]" style={{ color: c.muted }}>
                          {r.sent ? 'Enviado' : 'Expirado'} · {fmtDt(r.datetime)}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => del(r.id)} className="flex-shrink-0" style={{ color: c.muted }}>
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {reminders.length === 0 && (
              <div className="rounded-2xl p-8 text-center" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                <Bell size={28} className="mx-auto mb-2 opacity-30" style={{ color: c.muted } as React.CSSProperties} />
                <p className="text-[13px]" style={{ color: c.muted }}>Nenhum lembrete cadastrado</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal novo lembrete ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onTouchMove={e => e.stopPropagation()}>
          <div className="w-full sm:max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl"
            style={{ background: isDark ? '#141412' : '#FEFEFE', border: `1px solid ${c.border}`, maxHeight: 'calc(88dvh - env(safe-area-inset-bottom))', overflow: 'hidden' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${c.border}` }}>
              <h3 className="font-semibold text-[16px]" style={{ color: c.t1 }}>Novo Lembrete</h3>
              <button onClick={() => setModal(false)}><X size={20} style={{ color: c.muted }} /></button>
            </div>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', flex: 1, width: '100%', boxSizing: 'border-box' } as React.CSSProperties}>
              <form onSubmit={save} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, width: '100%', boxSizing: 'border-box' }}>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Título *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Cobrar cliente X" required className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Mensagem</label>
                  <input type="text" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Detalhes opcionais..." className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Data e hora *</label>
                  <input type="datetime-local" value={form.datetime} onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))}
                    required className={inputCls} style={{ ...inputStyle, minWidth: 0 }} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: c.muted }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Reminder['type'] }))}
                    className={inputCls} style={inputStyle}>
                    <option value="manual">⏰ Lembrete manual</option>
                    <option value="finance">💰 Cobrança / Financeiro</option>
                    <option value="service">💼 Serviço / Etapa</option>
                    <option value="agenda">📅 Compromisso</option>
                  </select>
                </div>
                <div style={{ paddingTop: 8, paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
                  <button type="submit" disabled={saving}
                    className="w-full text-white py-3.5 rounded-xl font-semibold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 12px rgba(29,110,247,0.35)' }}>
                    {saving ? 'Salvando...' : 'Criar Lembrete'}
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

/* Converte base64url para Uint8Array (necessário para Web Push) */
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char: string) => char.charCodeAt(0)));
}
