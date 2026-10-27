// 🛡️ Cheap abuse protection and private logging, shared by the API routes.
import { checkBotId } from 'botid/server';

// Logs only the error's name and message (never request bodies, photos, or whole error objects)
export function logError(label, err) {
  console.error(label, err?.name || 'Error', String(err?.message || '').slice(0, 300));
}

// BotID (free Basic mode). Returns a 403 Response for a bot, or null to continue.
// If the check itself fails, we let the request through rather than block real people.
export async function blockBots() {
  try {
    const verification = await checkBotId();
    if (verification?.isBot) return Response.json({ error: 'Access denied.' }, { status: 403 });
  } catch (err) {
    logError('BotID check failed', err);
  }
  return null;
}

// A best-effort per-IP limit kept in this server instance's memory.
// Limits: each Vercel instance has its own counter and it resets on a cold start,
// so this only slows down simple abuse. The Vercel Firewall rate-limit rule is the real one.
const buckets = new Map();
export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return (fwd.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim().slice(0, 64);
}

export function overLimit(key, { max = 10, windowMs = 60_000, now = Date.now() } = {}) {
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now - b.start > windowMs) buckets.delete(k);
    if (buckets.size > 5000) buckets.clear();
  }
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }
  b.count += 1;
  return b.count > max;
}
