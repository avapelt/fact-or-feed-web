// 💾 Saved results: when the same thing is checked again within a few hours,
// Vera answers from storage instead of paying for a whole new check.
// A miss costs one cheap read (a "simple operation") plus one save (an "advanced operation").
// Checks never use `list` (only the daily cleanup does). The photo is never stored, only a
// fingerprint inside the keys.
// 🔒 Each saved result is locked (AES-256-GCM) with a key made from the exact input, so it can only
// be found and opened by someone who sends that same post, link, or photo again.
import { get, put } from '@vercel/blob';
import { cacheInput, cacheKeys, isCacheable, cacheTtlMs, isFreshEntry, encryptEntry, decryptEntry, restoreCached } from './safety';

// Set to false to turn saved results off (for example if Blob's free-plan limits get tight)
export const RESULT_CACHE_ENABLED = true;

const pathFor = (id) => `cache/${id}.txt`;

// kind: 'check' (Find the facts, Is this news credible?, the iPhone popup) or 'photo'
// Returns { id, encKey }, or null when saved results are off
export function cacheKeyFor(kind, input) {
  if (!RESULT_CACHE_ENABLED || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    return cacheKeys(cacheInput(kind, input));
  } catch {
    return null;
  }
}

// The saved result, or null if there isn't one, it can't be opened, or it's too old
// (old ones are simply overwritten later, and the daily cleanup deletes them)
export async function readCached(keys) {
  if (!keys) return null;
  try {
    const res = await get(pathFor(keys.id), { access: 'public', useCache: false, abortSignal: AbortSignal.timeout(3000) });
    if (!res || res.statusCode !== 200) return null;
    const entry = decryptEntry(await new Response(res.stream).text(), keys.encKey);
    if (!isFreshEntry(entry)) return null;
    return restoreCached(entry.data, entry.saved_at);
  } catch {
    return null;
  }
}

// Saves a good, complete result, locked with the input's own key
export async function saveCached(keys, data) {
  if (!keys || !isCacheable(data)) return false;
  try {
    const { cached, checked_at, ...result } = data;
    const entry = { v: 1, saved_at: Date.now(), ttl_ms: cacheTtlMs(data), data: result };
    await put(pathFor(keys.id), encryptEntry(entry, keys.encKey), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'text/plain',
      cacheControlMaxAge: 60,
    });
    return true;
  } catch (err) {
    console.error('Saving the result failed', err?.message || err);
    return false;
  }
}
