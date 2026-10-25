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
  // The iPhone Shortcut sometimes labels photos as application/octet-stream, so we check the bytes
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type && !IMAGE_TYPES.includes(type) && type !== 'application/octet-stream') throw badRequest("That shared file doesn't look like a photo.");
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
  const buf = Buffer.concat(chunks);
  const sniffed = sniffImageType(buf);
  if (!sniffed) throw badRequest("That shared file doesn't look like a photo.");
  return `data:${sniffed};base64,${buf.toString('base64')}`;
}

// Works out the real image type from the first bytes of the file (its "magic bytes")
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];
export function sniffImageType(bytes) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString('latin1'))) return 'image/gif';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b.length >= 12 && b.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.includes(b.subarray(8, 12).toString('latin1'))) return 'image/heic';
  return null;
}

// ── Photos sent straight to the API ───────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
// One cap for both: a file up to MAX_IMAGE_BYTES always fits in MAX_IMAGE_CHARS once turned into base64
export const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;
export const MAX_IMAGE_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 100; // about 6MB of text
const IMAGE_RE = /^data:image\/(jpeg|png|webp|gif|heic);base64,[A-Za-z0-9+/]+={0,2}$/;
const OCTET_PREFIX = 'data:application/octet-stream;base64,';
const TOO_BIG = 'That photo is too big. Try a screenshot instead.';

export function isValidImageDataUrl(image) {
  return typeof image === 'string' && image.length <= MAX_IMAGE_CHARS && IMAGE_RE.test(image);
}

export function photoTooBig() {
  return badRequest(TOO_BIG);
}

// Throws a friendly 400 if a photo was sent but isn't a normal image.
// Returns the photo, relabeled with its real type if it came in as application/octet-stream.
export function checkImageField(image) {
  if (image == null || image === '') return null;
  if (typeof image === 'string' && image.length > MAX_IMAGE_CHARS) throw photoTooBig();
  if (isValidImageDataUrl(image)) return image;
  if (typeof image === 'string' && image.startsWith(OCTET_PREFIX)) {
    const data = image.slice(OCTET_PREFIX.length);
    if (data && /^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      const type = sniffImageType(Buffer.from(data.slice(0, 64), 'base64'));
      if (type) return `data:${type};base64,${data}`;
    }
  }
  throw badRequest("I couldn't read that photo. Try a JPEG or PNG screenshot under 4MB.");
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
export const SEARCH_DOWN = "I couldn't reach enough news sources right now. Please try again in a few minutes.";
export const THIN_SOURCES = "I couldn't find enough reliable sources on this yet, so I can't confirm it.";
export const THIN_SOURCES_FACTS = "I couldn't find enough reliable sources to answer this right now.";

function messageFor(reason, toolName) {
  if (reason === 'search_down') return SEARCH_DOWN;
  return toolName === 'facts' ? THIN_SOURCES_FACTS : THIN_SOURCES;
}

function domainOf(s) {
  if (s.domain) return String(s.domain).toLowerCase().replace(/^www\./, '');
  try {
    return new URL(s.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// null when there's enough evidence; otherwise why not: 'search_down' or 'thin'.
// A failed search only matters when it left us short of sources: with enough good sources,
// the real verdict ships.
export function evidenceProblem(sources, { claims = 0, searchesFailed = 0 } = {}) {
  if (!claims) return null; // nothing checkable: keep the normal behavior
  const list = Array.isArray(sources) ? sources : [];
  const domains = new Set(list.map(domainOf).filter(Boolean));
  if (list.length >= 3 && domains.size >= 2) return null;
  return searchesFailed > 0 ? 'search_down' : 'thin';
}

export function hasEnoughEvidence(sources, opts) {
  return !evidenceProblem(sources, opts);
}

// Replaces a result that can't be trusted with an honest "Can't confirm yet"
export function forceCantConfirm(story, toolName, reason = 'search_down') {
  const msg = messageFor(reason, toolName);
  const consensus = { level: 'None yet', explanation: msg };
  if (toolName === 'facts') {
    return {
      ...story,
      answer: msg,
      details: '',
      consensus,
      original_source: null,
      reframed: null,
      disputed: [],
      key_source_ids: [],
      notebook_note: null,
    };
  }
  return {
    ...story,
    verdict: "Can't confirm yet",
    real_story: msg,
    consensus,
    right_and_wrong: [],
    disputed: [],
    origin_timeline: [],
    key_source_ids: [],
    notebook_note: null,
    reply_draft: null,
    // Keep any scam or safety warning; it doesn't depend on the news search
    warning: story?.warning ? `${msg} ${story.warning}` : msg,
  };
}

// ── Future outcomes (who will win, what will happen) ──────────
// Vera never predicts. The code always opens with this sentence and removes any yes/no.
export const FUTURE_OPENER = "Nobody can know who will win or how this will turn out yet. Here's what I can check right now:";

export function stripPrediction(answer) {
  let a = String(answer || '').trim();
  if (a.startsWith(FUTURE_OPENER)) a = a.slice(FUTURE_OPENER.length).trim();
  return a.replace(/^(yes|no|probably|probably not|likely|unlikely|maybe)\b[\s,.!:;—–-]*/i, '').trim();
}

// The final say on a "Find the facts" answer, after the Writer and Reviewer are done
export function finalizeFacts(story, { questionType, problem } = {}) {
  if (problem) return forceCantConfirm(story, 'facts', problem);
  if (questionType === 'future_outcome') {
    const rest = stripPrediction(story?.answer);
    return { ...story, answer: rest ? `${FUTURE_OPENER} ${rest}` : FUTURE_OPENER };
  }
  return story;
}

// ── Wikipedia is never used as a source ───────────────────────
export const EXCLUDED_DOMAINS = ['wikipedia.org', 'wikimedia.org', 'wikidata.org'];

export function isBlockedSource(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase().replace(/\.$/, '');
    return EXCLUDED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

// ── Today's date for every agent ──────────────────────────────
// Most users are in Florida, so we use US Eastern time.
export function todayEastern(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function dateRule(now = new Date()) {
  return `\n\nToday's date is ${todayEastern(now)} (US Eastern time; dates may be up to a day off by timezone). Your training data ends before today. Never call a claim false just because you don't remember it happening; rely on the dated sources.`;
}
