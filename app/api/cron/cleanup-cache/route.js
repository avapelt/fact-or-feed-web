// 🧹 Daily cleanup (Vercel Cron, see vercel.json): deletes saved results older than 6 hours
// and any shared iPhone photos older than 1 hour that were never checked (and so never deleted).
// Only Vercel's cron can run it: it needs "Authorization: Bearer <CRON_SECRET>", and with no
// CRON_SECRET set it refuses everyone.
import { list, del } from '@vercel/blob';
import { blobsOlderThan, isCronAuthorized, CACHE_TTL_MS } from '../../check/safety';

export const maxDuration = 60;

// `list` is an "advanced operation" on the free plan, so each folder gets at most a few pages
// (1,000 files each). Deleting is free.
const MAX_PAGES = 3;

async function cleanFolder(prefix, maxAgeMs) {
  let cursor;
  let deleted = 0;
  let pages = 0;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    pages++;
    const old = blobsOlderThan(page.blobs, maxAgeMs).map((b) => b.url);
    for (let i = 0; i < old.length; i += 100) {
      await del(old.slice(i, i + 100));
      deleted += Math.min(100, old.length - i);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && pages < MAX_PAGES);
  return { deleted, pages, more: !!cursor };
}

export async function GET(req) {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const cache = await cleanFolder('cache/', CACHE_TTL_MS);
    const shares = await cleanFolder('shares/', 60 * 60 * 1000);
    return Response.json({ ok: true, cache, shares });
  } catch (err) {
    console.error('Cleanup failed', err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
