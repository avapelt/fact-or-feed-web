// 🛡️ Small safety helpers shared by the API routes.
// They are plain functions with no outside services, so they are easy to test.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// ── Our own photo storage ─────────────────────────────────────
// The Blob token looks like vercel_blob_rw_<storeId>_<secret>, and our public files live at
// https://<storeid>.public.blob.vercel-storage.com/...  If we can't work out our store, we say no.
export function ourStoreId(env = process.env) {
  const token = String(env.BLOB_READ_WRITE_TOKEN || '');
  const parts = token.split('_');
  let id = token.startsWith('vercel_blob_rw_') && parts.length >= 5 ? parts[3] : '';
  if (!id && env.BLOB_STORE_ID) id = String(env.BLOB_STORE_ID).replace(/^store_/, '');
  return /^[A-Za-z0-9]{6,64}$/.test(id) ? id.toLowerCase() : '';
}

// Only photos saved by our own /api/share upload (shares/photo-....jpg in OUR store) are allowed
export function isOurPhoto(url, env = process.env) {
  const store = ourStoreId(env);
  if (!store || typeof url !== 'string' || url.length > 500) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname === `${store}.public.blob.vercel-storage.com` &&
      !u.port &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      /^\/shares\/photo-[A-Za-z0-9-]+\.jpg$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// Downloads a shared photo from our store, refusing anything over about 4MB or not an image
export async function fetchOurPhoto(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw badRequest("I couldn't open that shared photo. Try sharing it again.");
  const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
  if (!IMAGE_TYPES.includes(type)) throw badRequest("That shared file doesn't look like a photo.");
  if (Number(res.headers.get('content-length') || 0) > MAX_PHOTO_BYTES) throw badRequest('That photo is too big. Try a screenshot instead.');
  const chunks = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_PHOTO_BYTES) {
      await reader.cancel().catch(() => {});
      throw badRequest('That photo is too big. Try a screenshot instead.');
    }
    chunks.push(value);
  }
  return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
}

// ── Photos sent straight to the API ───────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
export const MAX_IMAGE_CHARS = 6 * 1024 * 1024;
const IMAGE_RE = /^data:image\/(jpeg|png|webp|gif|heic);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidImageDataUrl(image) {
  return typeof image === 'string' && image.length <= MAX_IMAGE_CHARS && IMAGE_RE.test(image);
}

// Throws a friendly 400 if a photo was sent but isn't a normal image
export function checkImageField(image) {
  if (image == null || image === '') return null;
  if (!isValidImageDataUrl(image)) throw badRequest("I couldn't read that photo. Try a JPEG or PNG screenshot under 4MB.");
  return image;
}

export function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

// ── Signed result links (/#r=<payload>.<sig>) ─────────────────
// The key comes from a secret the server already has, so there's nothing new to set up.
export const MAX_PAYLOAD_CHARS = 200 * 1024;

function resultKey(env = process.env) {
  const secret = env.BLOB_READ_WRITE_TOKEN || env.TAVILY_API_KEY;
  if (!secret) return null;
  return createHash('sha256').update('fact-or-feed-result-v1:' + secret).digest();
}

export function signPayload(payload, env = process.env) {
  const key = resultKey(env);
  if (!key) return null;
  return createHmac('sha256', key).update(String(payload)).digest('base64url');
}

export function verifyPayload(payload, sig, env = process.env) {
  if (typeof payload !== 'string' || typeof sig !== 'string') return false;
  if (!payload || payload.length > MAX_PAYLOAD_CHARS || !/^[A-Za-z0-9_-]+$/.test(payload)) return false;
  const expected = signPayload(payload, env);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Enough evidence? ──────────────────────────────────────────
// A claim needs at least 3 sources from at least 2 different websites,
// and the web searches must mostly have worked. Otherwise we never guess.
export const NOT_ENOUGH_SOURCES =
  "I couldn't reach enough news sources to check this right now. Please try again in a few minutes.";

function domainOf(s) {
  if (s.domain) return String(s.domain).toLowerCase().replace(/^www\./, '');
  try {
    return new URL(s.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function hasEnoughEvidence(sources, { claims = 0, searchesTried = 0, searchesFailed = 0 } = {}) {
  if (!claims) return true; // nothing checkable: keep the normal behavior
  if (searchesTried > 0 && searchesFailed * 2 >= searchesTried) return false; // search was down
  const list = Array.isArray(sources) ? sources : [];
  const domains = new Set(list.map(domainOf).filter(Boolean));
  return list.length >= 3 && domains.size >= 2;
}

// Replaces a result that can't be trusted with an honest "Can't confirm yet"
export function forceCantConfirm(story, toolName) {
  const consensus = { level: 'None yet', explanation: NOT_ENOUGH_SOURCES };
  if (toolName === 'facts') {
    return {
      ...story,
      answer: NOT_ENOUGH_SOURCES,
      details: '',
      consensus,
      original_source: null,
      breakdown: [],
      disputed: [],
      key_source_ids: [],
      notebook_note: null,
      warning: NOT_ENOUGH_SOURCES,
    };
  }
  return {
    ...story,
    verdict: "Can't confirm yet",
    real_story: NOT_ENOUGH_SOURCES,
    consensus,
    right_and_wrong: [],
    disputed: [],
    origin_timeline: [],
    key_source_ids: [],
    notebook_note: null,
    reply_draft: null,
    // Keep any scam or safety warning; it doesn't depend on the news search
    warning: story?.warning ? `${NOT_ENOUGH_SOURCES} ${story.warning}` : NOT_ENOUGH_SOURCES,
  };
}

// ── Today's date for every agent ──────────────────────────────
export function dateRule(now = new Date()) {
  return `\n\nToday's date is ${now.toISOString().slice(0, 10)}. Your training data ends before today. Never call a claim false just because you don't remember it happening; rely on the dated sources.`;
}
