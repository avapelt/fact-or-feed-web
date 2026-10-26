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
// Fixed messages the code writes itself, in every language the app supports
export const MESSAGES = {
  en: {
    search_down: "I couldn't reach enough news sources right now. Please try again in a few minutes.",
    thin: "I couldn't find enough reliable sources on this yet, so I can't confirm it.",
    thin_facts: "I couldn't find enough reliable sources to answer this right now.",
    future: "Nobody can know who will win or how this will turn out yet. Here's what I can check right now:",
  },
  es: {
    search_down: 'No pude acceder a suficientes fuentes de noticias en este momento. Inténtalo de nuevo en unos minutos.',
    thin: 'Todavía no encontré suficientes fuentes confiables sobre esto, así que no puedo confirmarlo.',
    thin_facts: 'No encontré suficientes fuentes confiables para responder esto ahora mismo.',
    future: 'Nadie puede saber todavía quién ganará ni cómo terminará esto. Esto es lo que puedo comprobar ahora mismo:',
  },
  ht: {
    search_down: 'M pa t ka jwenn ase sous nouvèl kounye a. Tanpri eseye ankò nan kèk minit.',
    thin: 'M poko jwenn ase sous serye sou sa, kidonk m pa ka konfime l.',
    thin_facts: 'M pa t jwenn ase sous serye pou m reponn sa kounye a.',
    future: 'Pèsonn pa ka konnen kounye a kiyès ki pral genyen oswa kijan sa pral fini. Men sa m ka verifye kounye a:',
  },
  zh: {
    search_down: '我现在无法访问足够多的新闻来源。请过几分钟再试一次。',
    thin: '我还没有找到足够可靠的来源，所以无法证实这一点。',
    thin_facts: '我现在找不到足够可靠的来源来回答这个问题。',
    future: '现在还没有人能知道谁会赢，或者结果会怎样。以下是我现在能核实的内容：',
  },
  hi: {
    search_down: 'मैं अभी पर्याप्त समाचार स्रोतों तक नहीं पहुँच पाई। कृपया कुछ मिनट बाद फिर से कोशिश करें।',
    thin: 'मुझे इस पर अभी पर्याप्त भरोसेमंद स्रोत नहीं मिले, इसलिए मैं इसकी पुष्टि नहीं कर सकती।',
    thin_facts: 'मुझे अभी इसका जवाब देने के लिए पर्याप्त भरोसेमंद स्रोत नहीं मिले।',
    future: 'अभी कोई नहीं जान सकता कि कौन जीतेगा या इसका नतीजा क्या होगा। मैं अभी यह जाँच सकती हूँ:',
  },
  ar: {
    search_down: 'لم أتمكن من الوصول إلى عدد كافٍ من مصادر الأخبار الآن. يُرجى المحاولة مرة أخرى بعد بضع دقائق.',
    thin: 'لم أجد بعد مصادر موثوقة كافية حول هذا الأمر، لذلك لا يمكنني تأكيده.',
    thin_facts: 'لم أجد مصادر موثوقة كافية للإجابة عن هذا الآن.',
    future: 'لا أحد يستطيع أن يعرف بعد من سيفوز أو كيف ستنتهي الأمور. إليك ما يمكنني التحقق منه الآن:',
  },
  fr: {
    search_down: "Je n'ai pas pu accéder à assez de sources d'information pour le moment. Réessaie dans quelques minutes.",
    thin: "Je n'ai pas encore trouvé assez de sources fiables à ce sujet, donc je ne peux pas le confirmer.",
    thin_facts: "Je n'ai pas trouvé assez de sources fiables pour répondre à cela pour le moment.",
    future: "Personne ne peut encore savoir qui va gagner ni comment cela va tourner. Voici ce que je peux vérifier pour l'instant :",
  },
  bn: {
    search_down: 'আমি এখন যথেষ্ট খবরের সূত্রে পৌঁছাতে পারিনি। কয়েক মিনিট পরে আবার চেষ্টা করো।',
    thin: 'এ বিষয়ে এখনো যথেষ্ট নির্ভরযোগ্য সূত্র পাইনি, তাই আমি এটা নিশ্চিত করতে পারছি না।',
    thin_facts: 'এই মুহূর্তে এর উত্তর দেওয়ার মতো যথেষ্ট নির্ভরযোগ্য সূত্র পাইনি।',
    future: 'কে জিতবে বা শেষ পর্যন্ত কী হবে, তা এখনো কেউ জানতে পারে না। এই মুহূর্তে আমি যা যাচাই করতে পারি:',
  },
  it: {
    search_down: 'Al momento non sono riuscita a raggiungere abbastanza fonti di notizie. Riprova tra qualche minuto.',
    thin: 'Non ho ancora trovato abbastanza fonti affidabili su questo, quindi non posso confermarlo.',
    thin_facts: 'Al momento non ho trovato abbastanza fonti affidabili per rispondere.',
    future: 'Nessuno può ancora sapere chi vincerà o come andrà a finire. Ecco cosa posso verificare in questo momento:',
  },
};

// The language the user picked, else the one the Reader detected, else English
export function pickLang(requested, detected) {
  if (MESSAGES[requested]) return requested;
  if (MESSAGES[detected]) return detected;
  return 'en';
}

const msgs = (lang) => MESSAGES[lang] || MESSAGES.en;
export const SEARCH_DOWN = MESSAGES.en.search_down;
export const THIN_SOURCES = MESSAGES.en.thin;
export const THIN_SOURCES_FACTS = MESSAGES.en.thin_facts;

function messageFor(reason, toolName, lang) {
  const m = msgs(lang);
  if (reason === 'search_down') return m.search_down;
  return toolName === 'facts' ? m.thin_facts : m.thin;
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
export function forceCantConfirm(story, toolName, reason = 'search_down', lang = 'en') {
  const msg = messageFor(reason, toolName, lang);
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
export const FUTURE_OPENER = MESSAGES.en.future;

// A bare yes/no (in any of our languages) right before punctuation, like "Yes," "No." "Sí," "Oui,"
// "Nein," "是的，" "نعم،". Longer words come first. A dash only counts with a space after it,
// so "No-one knows" is left alone. Hedge words like "likely" or "probably" are never removed.
const YES_NO_RE =
  /^(?:yes|no|sí|sì|si|oui|non|wi|nein|ja|हाँ|हां|नहीं|نعم|كلا|لا|হ্যাঁ|না|是的|不是|不会|会的|不|是)\s*(?:[,.:;!，。：；！،।]|[-–—]\s)\s*/iu;

export function stripPrediction(answer) {
  let a = String(answer || '').normalize('NFC').trim();
  for (const m of Object.values(MESSAGES)) {
    if (a.startsWith(m.future)) a = a.slice(m.future.length).trim();
  }
  const stripped = a.replace(YES_NO_RE, '').trim();
  if (stripped === a) return a;
  // "No, polls show..." becomes "Polls show..."
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

// The final say on a "Find the facts" answer, after the Writer and Reviewer are done
export function finalizeFacts(story, { questionType, problem, lang = 'en' } = {}) {
  if (problem) return forceCantConfirm(story, 'facts', problem, lang);
  if (questionType === 'future_outcome') {
    const opener = msgs(lang).future;
    const rest = stripPrediction(story?.answer);
    return { ...story, answer: rest ? `${opener} ${rest}` : opener };
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

// ── Models that don't take a temperature setting ──────────────
// The newer Claude models on the AI Gateway reject a temperature, so we only send one when it's allowed.
const NO_TEMPERATURE = ['anthropic/claude-sonnet-5.5', 'anthropic/claude-haiku-5.5'];
export function withTemperature(model, value) {
  return NO_TEMPERATURE.includes(model) ? {} : { temperature: value };
}

// ── Fewer, smarter searches ───────────────────────────────────
// Two queries count as the same search when they use (almost) the same words,
// in any order, ignoring tiny words, punctuation, case, and plural "s".
const QUERY_STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'did', 'does', 'do', 'it', 'this', 'that', 'with', 'about', 'by']);

function queryWords(query) {
  const words = String(query || '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return new Set(
    words
      .filter((w) => !QUERY_STOP_WORDS.has(w))
      .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
  );
}

export function similarQueries(a, b) {
  const A = queryWords(a);
  const B = queryWords(b);
  if (!A.size || !B.size) return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both) >= 0.8;
}

// Removes near-identical queries, keeping the first of each
export function dedupeQueries(list) {
  const kept = [];
  for (const q of Array.isArray(list) ? list : []) {
    const text = String(q || '').trim();
    if (text && !kept.some((k) => similarQueries(k, text))) kept.push(text);
  }
  return kept;
}

// Picks which searches to run, at most `cap` in total, with no near-duplicates.
// groups: [{ name, queries, weight }] in order of importance. Each round, every group
// takes `weight` queries in turn, so the most important searches always make the cut.
export function planSearches(groups, cap) {
  const out = {};
  const queues = (groups || []).map((g) => {
    out[g.name] = [];
    return { name: g.name, weight: Math.max(1, g.weight || 1), list: (g.queries || []).map((q) => String(q || '').trim()).filter(Boolean) };
  });
  const picked = [];
  let progress = true;
  while (picked.length < cap && progress) {
    progress = false;
    for (const q of queues) {
      for (let taken = 0; taken < q.weight && picked.length < cap && q.list.length; ) {
        const next = q.list.shift();
        if (picked.some((p) => similarQueries(p, next))) continue;
        picked.push(next);
        out[q.name].push(next);
        taken++;
        progress = true;
      }
    }
  }
  return out;
}

// ── Saved results (the same check isn't paid for twice) ───────
// A result is kept for 6 hours, or 1 hour for recent or breaking news.
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const CACHE_TTL_RECENT_MS = 60 * 60 * 1000;

export function normalizeText(text) {
  return String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Tracking bits that don't change what a link shows
const TRACKING_PARAM = /^(utm_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igsh|igshid|ref_src|ref_url|_ga|si)$/i;

export function normalizeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAM.test(k)) u.searchParams.delete(k);
    u.searchParams.sort();
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
}

// A fingerprint of the photo's bytes (the photo itself is never stored)
export function imageFingerprint(image) {
  if (!image) return '';
  const s = String(image);
  const comma = s.indexOf(',');
  return createHash('sha256').update(Buffer.from(comma >= 0 ? s.slice(comma + 1) : s, 'base64')).digest('hex');
}

// Everything that changes the answer: the input, the tool and mode, the language, and the level
export function cacheInput(kind, input = {}) {
  const base = {
    language: String(input.language || 'auto').slice(0, 10).toLowerCase(),
    audience: String(input.audience || 'everyone').slice(0, 20).toLowerCase(),
    image: imageFingerprint(input.image),
  };
  if (kind === 'photo') return { ...base, tool: 'photo', text: normalizeText(String(input.text || '').slice(0, 1000)) };
  return {
    ...base,
    tool: input.tool === 'facts' ? 'facts' : 'credible',
    mode: input.mode === 'fact' ? 'fact' : 'full',
    fast: !!input.fast,
    text: normalizeText(String(input.text || '').slice(0, 6000)),
    url: normalizeUrl(input.url),
  };
}

// Keyed with the same secret as the signed result links, so nobody can guess a key
export function cacheKey(parts, env = process.env) {
  const key = resultKey(env);
  if (!key) return null;
  const p = parts || {};
  const canonical = JSON.stringify(['v1', p.tool, p.mode || '', !!p.fast, p.language, p.audience, p.text || '', p.url || '', p.image || '']);
  return createHmac('sha256', key).update('fact-or-feed-cache-v1:' + canonical).digest('hex');
}

// Only good, complete results are saved: never a forced "Can't confirm yet",
// never one made while searches were failing, and never a half-finished one.
export function isCacheable(data) {
  if (!data || typeof data !== 'object' || data.error || data.cached) return false;
  const t = data.trace || {};
  if (t.complete === false) return false;
  if (t.search?.forced) return false;
  if ((t.search?.failed || 0) > 0) return false;
  if ((t.search?.photo?.failed || 0) > 0) return false;
  if (data.photo) return true;
  const r = data.result;
  if (!r) return false;
  if (r.verdict === "Can't confirm yet") return false;
  if (data.tool === 'facts' && r.consensus?.level === 'None yet') return false;
  return true;
}

export function cacheTtlMs(data) {
  const t = data?.trace || {};
  return t.plan?.is_recent || t.recent ? CACHE_TTL_RECENT_MS : CACHE_TTL_MS;
}

export function isFreshEntry(entry, now = Date.now()) {
  if (!entry || typeof entry !== 'object' || entry.v !== 1 || !entry.data) return false;
  const saved = Number(entry.saved_at);
  const ttl = Math.min(Number(entry.ttl_ms) || 0, CACHE_TTL_MS);
  if (!Number.isFinite(saved) || ttl <= 0) return false;
  const age = now - saved;
  return age >= -60 * 1000 && age < ttl;
}

// ── Saved results never keep the user's own words ─────────────
// Before saving, everything that holds what the user sent (their question, the post's text or
// claims, who posted it, the link, words quoted from the photo or post) is removed.
// Only Vera's own verdict, explanation, sources, and scores are kept.
export function stripForCache(data) {
  const d = JSON.parse(JSON.stringify(data || {}));
  delete d.cached;
  delete d.checked_at;
  d.outlet = null; // rebuilt from the current request's link
  const r = d.result;
  if (r && typeof r === 'object') {
    if (r.who_posted) r.who_posted = { ...r.who_posted, name: null };
    if (Array.isArray(r.right_and_wrong)) r.right_and_wrong = [];
    if (Array.isArray(r.persuasion_tactics)) r.persuasion_tactics = r.persuasion_tactics.map((t) => ({ ...t, where: '' }));
    if ('reply_draft' in r) r.reply_draft = null;
    if ('clarifying_question' in r) r.clarifying_question = null;
    if ('reframed' in r) r.reframed = null;
  }
  if (d.review && Array.isArray(d.review.issues)) d.review = { ...d.review, issues: [] };
  for (const check of [d.imageCheck, d.photo]) {
    if (!check || typeof check !== 'object') continue;
    if ('description' in check) check.description = null;
    if (check.comparison) delete check.comparison.query;
  }
  if (d.trace) {
    const t = d.trace;
    const plan = t.plan
      ? {
          analysis: '',
          reasons: [],
          original_source: null,
          news_search: t.plan.news_search,
          official_sources: !!t.plan.official_sources,
          research_papers: !!t.plan.research_papers,
          persuasion: !!t.plan.persuasion,
          photo_comparison: !!t.plan.photo_comparison,
          emergency_mode: !!t.plan.emergency_mode,
          go_to_original: !!t.plan.go_to_original,
          is_recent: !!t.plan.is_recent,
        }
      : undefined;
    d.trace = {
      plan,
      topic: t.topic,
      question_type: t.question_type,
      recent: t.recent,
      search: t.search,
      complete: t.complete,
      // The Manager's step label quotes its analysis of the post, so only its first words are kept
      timings: (t.timings || []).map((x) => ({ seconds: x.seconds, label: String(x.label || '').startsWith('Manager made a game plan') ? 'Manager made a game plan' : x.label })),
    };
  }
  return d;
}

// Puts back only what we can rebuild from the CURRENT request (the cache key proves it's the same input)
export function restoreCached(saved, { question = null, outlet = null, savedAt } = {}) {
  const d = { ...saved, cached: true, checked_at: new Date(savedAt).toISOString() };
  if (d.tool !== 'photo') {
    d.outlet = outlet;
    if (d.trace) d.trace = { ...d.trace, question: d.tool === 'facts' ? question : null };
  }
  return d;
}

// ── Daily cleanup: which stored files are old enough to delete ─
export function blobsOlderThan(blobs, maxAgeMs, now = Date.now()) {
  return (Array.isArray(blobs) ? blobs : []).filter((b) => {
    const at = new Date(b?.uploadedAt).getTime();
    return b?.url && Number.isFinite(at) && now - at > maxAgeMs;
  });
}

// The standard Vercel Cron check: "Authorization: Bearer <CRON_SECRET>". No secret set means no access.
export function isCronAuthorized(header, env = process.env) {
  const secret = env.CRON_SECRET;
  if (!secret || typeof header !== 'string') return false;
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
