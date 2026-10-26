// 💾 Saved results: when the same thing is checked again within a few hours,
// Vera answers from storage instead of paying for a whole new check.
// A miss costs one cheap read (a "simple operation") plus one save (an "advanced operation").
// We never use `list`, and the photo itself is never stored, only a fingerprint inside the key.
import { get, put } from '@vercel/blob';
import { cacheInput, cacheKey, isCacheable, cacheTtlMs, isFreshEntry } from './safety';

// Set to false to turn saved results off (for example if Blob's free-plan limits get tight)
export const RESULT_CACHE_ENABLED = true;

const pathFor = (key) => `cache/${key}.json`;

// kind: 'check' (Find the facts, Is this news credible?, the iPhone popup) or 'photo'
export function cacheKeyFor(kind, input) {
  if (!RESULT_CACHE_ENABLED || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    return cacheKey(cacheInput(kind, input));
  } catch {
    return null;
  }
}

// The saved result, or null if there isn't one or it's too old (old ones are simply overwritten later)
export async function readCached(key) {
  if (!key) return null;
  try {
    const res = await get(pathFor(key), { access: 'public', abortSignal: AbortSignal.timeout(3000) });
    if (!res || res.statusCode !== 200) return null;
    const entry = JSON.parse(await new Response(res.stream).text());
    if (!isFreshEntry(entry)) return null;
    return { ...entry.data, cached: true, checked_at: new Date(entry.saved_at).toISOString() };
  } catch {
    return null;
  }
}

// Saves a good, complete result (it keeps only what the result already contains)
export async function saveCached(key, data) {
  if (!key || !isCacheable(data)) return false;
  try {
    await put(pathFor(key), JSON.stringify({ v: 1, saved_at: Date.now(), ttl_ms: cacheTtlMs(data), data }), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return true;
  } catch (err) {
    console.error('Saving the result failed', err?.message || err);
    return false;
  }
}
