import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/melo/db';
import { sendPush } from '@/lib/melo/webpush';
import type { AgendaEvent, Service, Reminder } from '@/lib/melo/types';

/* Verifica se a request vem do Vercel Cron ou de um usuário autenticado */
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return req.headers.get('Authorization') === `Bearer ${cronSecret}`;
  }
  // Em dev ou se CRON_SECRET não estiver configurado, permite
  return true;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = addDays(now, 1).toISOString().split('T')[0];
  const in2days = addDays(now, 2).toISOString().split('T')[0];

  let notificationsCount = 0;

  /* ── 1. Eventos da Agenda: 1 dia antes ── */
  const events = await readDb<AgendaEvent[]>('agenda', []);
  const tomorrowEvents = events.filter(e =>
    e.date === tomorrow && e.status !== 'cancelled' && e.status !== 'completed'
  );
  for (const ev of tomorrowEvents) {
    await sendPush(
      `📅 Amanhã: ${ev.title}`,
      `${ev.time}${ev.client ? ` — ${ev.client}` : ''}`,
      '/melo/agenda',
      `agenda-${ev.id}`
    );
    notificationsCount++;
  }

  /* ── 2. Serviços com prazo se aproximando ── */
  const services = await readDb<Service[]>('services', []);
  const urgentServices = services.filter(s => {
    if (!s.deadline || s.status === 'completed' || s.status === 'cancelled') return false;
    return s.deadline === tomorrow || s.deadline === today || s.deadline === in2days;
  });
  for (const sv of urgentServices) {
    const daysLabel = sv.deadline === today ? 'hoje' : sv.deadline === tomorrow ? 'amanhã' : 'em 2 dias';
    await sendPush(
      `💼 Prazo ${daysLabel}: ${sv.name}`,
      `${sv.client ? sv.client + ' · ' : ''}${sv.progress}% concluído`,
      '/melo/services',
      `service-${sv.id}`
    );
    notificationsCount++;
  }

  /* ── 3. Lembretes manuais pendentes ── */
  const reminders = await readDb<Reminder[]>('reminders', []);
  const pendingReminders = reminders.filter(r => {
    if (r.sent) return false;
    const dt = new Date(r.datetime);
    // Envia se o horário já passou ou está dentro dos próximos 60 minutos
    return dt <= new Date(now.getTime() + 60 * 60 * 1000);
  });

  const updatedReminders = [...reminders];
  for (const r of pendingReminders) {
    const sent = await sendPush(r.title, r.body, '/melo/reminders', `reminder-${r.id}`);
    if (sent > 0) {
      const idx = updatedReminders.findIndex(x => x.id === r.id);
      if (idx >= 0) updatedReminders[idx] = { ...updatedReminders[idx], sent: true };
      notificationsCount++;
    }
  }
  if (pendingReminders.length > 0) {
    await writeDb('reminders', updatedReminders);
  }

  /* ── 4. Cobranças financeiras futuras (Finance entries como receitas esperadas) ── */
  // Envia lembrete se há uma entrada agendada para amanhã
  // (Por ora, reminders manuais cobrem esse caso)

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    notificationsCount,
    details: {
      agendaReminders: tomorrowEvents.length,
      serviceDeadlines: urgentServices.length,
      manualReminders: pendingReminders.length,
    }
  });
}
