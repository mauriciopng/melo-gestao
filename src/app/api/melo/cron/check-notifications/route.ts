import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/melo/db';
import { sendPush } from '@/lib/melo/webpush';
import type { AgendaEvent, Service, Reminder } from '@/lib/melo/types';

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) return req.headers.get('Authorization') === `Bearer ${cronSecret}`;
  return true;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Registro de notificações enviadas: { [key: string]: number (timestamp) }
type SentRecord = Record<string, number>;
const SENT_TTL_MS = 23 * 60 * 60 * 1000; // 23h — evita reenvio no mesmo dia

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const now     = new Date();
  const today   = now.toISOString().split('T')[0];
  const tomorrow  = addDays(now, 1).toISOString().split('T')[0];
  const in2days   = addDays(now, 2).toISOString().split('T')[0];

  // Carrega registro de notificações já enviadas hoje
  const sent = await readDb<SentRecord>('notif_sent', {});
  // Remove entradas antigas (> 23h)
  const nowMs = Date.now();
  const cleanSent: SentRecord = {};
  for (const [k, ts] of Object.entries(sent)) {
    if (nowMs - ts < SENT_TTL_MS) cleanSent[k] = ts;
  }

  let notificationsCount = 0;

  /* ── 1. Eventos da Agenda — apenas 1 vez por evento por dia ── */
  const events = await readDb<AgendaEvent[]>('agenda', []);
  const upcomingEvents = events.filter(e =>
    (e.date === tomorrow || e.date === today) &&
    e.status !== 'cancelled' && e.status !== 'completed'
  );
  for (const ev of upcomingEvents) {
    const key = `agenda-${ev.id}-${today}`;
    if (cleanSent[key]) continue; // já enviado hoje
    const daysLabel = ev.date === today ? 'Hoje' : 'Amanhã';
    const sent_ = await sendPush(
      `📅 ${daysLabel}: ${ev.title}`,
      `${ev.time ? ev.time + ' — ' : ''}${ev.client || ''}`,
      '/melo/agenda',
      key,
    );
    if (sent_ > 0) { cleanSent[key] = nowMs; notificationsCount++; }
  }

  /* ── 2. Serviços com prazo se aproximando — 1 vez por prazo ── */
  const services = await readDb<Service[]>('services', []);
  const urgentServices = services.filter(s => {
    if (!s.deadline || s.status === 'completed' || s.status === 'cancelled') return false;
    return s.deadline === today || s.deadline === tomorrow || s.deadline === in2days;
  });
  for (const sv of urgentServices) {
    const key = `service-${sv.id}-${sv.deadline}`;
    if (cleanSent[key]) continue;
    const daysLabel = sv.deadline === today ? 'hoje' : sv.deadline === tomorrow ? 'amanhã' : 'em 2 dias';
    const sent_ = await sendPush(
      `💼 Prazo ${daysLabel}: ${sv.name}`,
      `${sv.client ? sv.client + ' · ' : ''}${sv.progress}% concluído`,
      '/melo/services',
      key,
    );
    if (sent_ > 0) { cleanSent[key] = nowMs; notificationsCount++; }
  }

  /* ── 3. Lembretes manuais pendentes ── */
  const reminders = await readDb<Reminder[]>('reminders', []);
  const pendingReminders = reminders.filter(r => {
    if (r.sent) return false;
    const dt = new Date(r.datetime);
    return dt <= new Date(nowMs + 60 * 60 * 1000);
  });

  const updatedReminders = [...reminders];
  for (const r of pendingReminders) {
    const sent_ = await sendPush(r.title, r.body, '/melo/reminders', `reminder-${r.id}`);
    if (sent_ > 0) {
      const idx = updatedReminders.findIndex(x => x.id === r.id);
      if (idx >= 0) updatedReminders[idx] = { ...updatedReminders[idx], sent: true };
      notificationsCount++;
    }
  }
  if (pendingReminders.length > 0) {
    await writeDb('reminders', updatedReminders);
  }

  // Persiste registro de enviados
  await writeDb('notif_sent', cleanSent);

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    notificationsCount,
    details: {
      agendaReminders: upcomingEvents.length,
      serviceDeadlines: urgentServices.length,
      manualReminders: pendingReminders.length,
    }
  });
}
