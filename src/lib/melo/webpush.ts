import webpush from 'web-push';
import { readDb, writeDb } from './db';

export interface PushSub {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

function setup() {
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_EMAIL ?? 'mailto:admin@melo.digital';
  if (!pub || !priv) throw new Error('VAPID keys missing — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to environment variables');
  webpush.setVapidDetails(mail, pub, priv);
}

export async function saveSub(sub: Omit<PushSub, 'createdAt'>): Promise<void> {
  const subs = await readDb<PushSub[]>('push_subscriptions', []);
  const idx = subs.findIndex(s => s.endpoint === sub.endpoint);
  const full: PushSub = { ...sub, createdAt: new Date().toISOString() };
  if (idx >= 0) subs[idx] = full; else subs.push(full);
  await writeDb('push_subscriptions', subs);
}

export async function removeSub(endpoint: string): Promise<void> {
  const subs = await readDb<PushSub[]>('push_subscriptions', []);
  await writeDb('push_subscriptions', subs.filter(s => s.endpoint !== endpoint));
}

export async function sendPush(title: string, body: string, url = '/melo/dashboard', tag = 'melo'): Promise<number> {
  setup();
  const subs = await readDb<PushSub[]>('push_subscriptions', []);
  if (subs.length === 0) return 0;

  const payload = JSON.stringify({ title, body, url, tag });
  const expired: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async s => {
      try {
        await webpush.sendNotification(s as Parameters<typeof webpush.sendNotification>[0], payload);
        sent++;
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 410 || e.statusCode === 404) expired.push(s.endpoint);
      }
    })
  );

  if (expired.length) {
    await writeDb('push_subscriptions', subs.filter(s => !expired.includes(s.endpoint)));
  }
  return sent;
}
