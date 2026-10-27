import { generateText, Output } from 'ai';
import { z } from 'zod';
import { FRONT_DESK_PROMPT, MANAGER_PROMPT, RULES, READER_PROMPT, PERSUASION_PROMPT, IMAGE_PROMPT, STORY_PROMPT, REVIEWER_PROMPT, COMPARE_PROMPT, FACTS_PROMPT, EMERGENCY_NOTE, UNTRUSTED_RULE } from './prompts';
import { categorize } from './bias';
import { logError } from './guard';
import { detectGreeting, greetingReply } from './frontdesk';
import { loadNotebook, notebookForPrompt, lessonsFor, approvedLessonCount } from './notebook';
import { dateRule, todayEastern, evidenceProblem, forceCantConfirm, finalizeFacts, isBlockedSource, EXCLUDED_DOMAINS, pickLang, withTemperature, planSearches, untrusted, stripHidden, VERDICT_LIST, applyReview, skipsEvidenceRule } from './safety';
import { safeFetch } from './fetchsafe';


// 💰 The strong model only writes the verdict or answer (and judges a photo's AI warning signs).
// Every helper step (Manager, Planner, Persuasion, Comparison, Photo Finder, Photo Writer) uses the cheap one.
// Both are the newest Claude models on the AI Gateway, at a lower price per token than the 4.5 ones.
export const MODEL = 'anthropic/claude-sonnet-5.5';
export const FAST_MODEL = 'anthropic/claude-haiku-5.5';

// Always added (in full) to a reply for someone who may be thinking about hurting themselves
const CRISIS_LINE = '📞 If you are in the US, call or text 988 (Suicide & Crisis Lifeline), any time. Anywhere else, find a free helpline at findahelpline.com. If you are in danger right now, call your local emergency number.';

// Most Tavily searches one check may run (each basic search costs 1 credit)
const MAX_SEARCHES = { full: 6, fast: 3 };

// Language codes the app supports, and the names the AI is told to write in
const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  ht: 'Haitian Creole',
  zh: 'Simplified Chinese (Mandarin)',
  hi: 'Hindi',
  ar: 'Arabic',
  fr: 'French',
  bn: 'Bengali',
  it: 'Italian',
};

const FrontDeskSchema = z.object({
  intent: z.enum(['check', 'chat', 'blocked', 'self_harm']),
  chat_reply: z.string().nullable(),
});

const ManagerSchema = z.object({
  analysis: z.string(),
  news_search: z.enum(['none', 'light', 'full']),
  official_sources: z.boolean(),
  research_papers: z.boolean(),
  persuasion: z.boolean(),
  photo_comparison: z.boolean(),
  emergency_mode: z.boolean(),
  go_to_original: z.boolean(),
  original_source: z.string().nullable(),
  is_recent: z.boolean(),
  reasons: z.array(z.string()),
});

const ReaderSchema = z.object({
  user_question: z.string().nullable(),
  question_type: z.enum(['fact', 'future_outcome', 'opinion']),
  language: z.enum(['en', 'es', 'ht', 'zh', 'hi', 'ar', 'fr', 'bn', 'it']),
  content_summary: z.string(),
  posted_by: z.string().nullable(),
  photo_search_query: z.string().nullable(),
  claims: z.array(z.string()),
  topic_type: z.enum(['breaking_news', 'science_health', 'politics', 'scam', 'other']),
  news_queries: z.array(z.string()),
  official_queries: z.array(z.string()),
  original_queries: z.array(z.string()),
  academic_queries: z.array(z.string()),
});

// One image check: the AI scores the evidence; the code turns scores into a level (so it's consistent)
const ImageSchema = z.object({
  visual_signs_score: z.number(),
  plausibility: z.enum(['Plausible', 'Unusual', 'Very unlikely']),
  plausibility_reason: z.string(),
  signs: z.array(z.string()),
  note: z.string(),
});

const CompareSchema = z.object({
  match: z.enum(['Same photo found', 'Similar real photos found', 'No similar real photos']),
  reused_old_photo: z.boolean(),
  effect: z.enum(['More likely real', 'No change', 'More likely fake']),
  comparison: z.string(),
});

const ReviewSchema = z.object({
  approved: z.boolean(),
  confidence: z.enum(['High', 'Medium', 'Low']),
  issues: z.array(z.string()),
  corrected_verdict: z
    .enum(VERDICT_LIST)
    .nullable(),
  corrected_real_story: z.string().nullable(),
  review_note: z.string(),
});

const StorySchema = z.object({
  warning: z.string().nullable(),
  notebook_note: z.string().nullable(),
  clarifying_question: z.string().nullable(),
  who_posted: z.object({
    name: z.string().nullable(),
    type: z.enum([
      'News outlet',
      'Official source',
      'Satire site',
      'Influencer or creator',
      'Personal or anonymous account',
      'Known unreliable site',
      'Unknown',
    ]),
    trust_note: z.string(),
  }),
  bias_note: z.string().nullable(),
  verdict: z.enum(VERDICT_LIST),
  real_story: z.string(),
  consensus: z.object({
    level: z.enum(['Strong', 'Mixed', 'Weak', 'None yet']),
    explanation: z.string(),
  }),
  right_and_wrong: z.array(z.object({ post_says: z.string(), actually: z.string() })),
  disputed: z.array(z.string()),
  unknown: z.array(z.string()),
  origin_timeline: z.array(z.object({ when: z.string(), what: z.string() })),
  persuasion_tactics: z.array(z.object({ tactic: z.string(), where: z.string(), explanation: z.string() })),
  reply_draft: z.string(),
  key_source_ids: z.array(z.number()),
});

// "Find the facts" answers a question instead of judging a post
const FactsSchema = z.object({
  answer: z.string(),
  details: z.string(),
  consensus: z.object({
    level: z.enum(['Strong', 'Mixed', 'Weak', 'None yet']),
    explanation: z.string(),
  }),
  original_source: z
    .object({ name: z.string(), what_it_says: z.string(), source_id: z.number().nullable() })
    .nullable(),
  reframed: z.string().nullable(),
  disputed: z.array(z.string()),
  unknown: z.array(z.string()),
  key_source_ids: z.array(z.number()),
  clarifying_question: z.string().nullable(),
  notebook_note: z.string().nullable(),
});

// Searches the web with Tavily. If a `track` object is passed, it counts how many searches
// were tried and how many failed (no key, an error, a timeout, or a broken answer),
// so the check can say "I couldn't reach enough sources" instead of guessing.
export async function searchWeb(query, extra = {}, track = null) {
  if (track) track.tried = (track.tried || 0) + 1;
  const failed = (why) => {
    if (track) track.failed = (track.failed || 0) + 1;
    console.error('Search failed:', why);
    return [];
  };
  if (!process.env.TAVILY_API_KEY) return failed('missing TAVILY_API_KEY');
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      // Wikipedia and other wikis are never used as sources
      body: JSON.stringify({ query, max_results: 10, search_depth: 'basic', ...extra, exclude_domains: EXCLUDED_DOMAINS }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return failed(`status ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return failed('no results list');
    return data.results.filter((r) => r && r.url && !isBlockedSource(r.url)).map((r) => ({
      title: stripHidden(r.title || r.url).slice(0, 300),
      url: r.url,
      snippet: stripHidden(r.content || '').slice(0, 500),
      date: r.published_date || null,
    }));
  } catch (err) {
    return failed(err?.name || 'error');
  }
}

// Finds real photos online of the same scene, so the Comparison agent can compare
// (a failed search is counted in `track`, so a result made while search was down is never saved)
async function searchPhotos(query, track = null) {
  if (track) track.tried = (track.tried || 0) + 1;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5, search_depth: 'basic', include_images: true, include_image_descriptions: true, exclude_domains: EXCLUDED_DOMAINS }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return (data.images || [])
      .map((img) => (typeof img === 'string' ? { url: img, description: '' } : img))
      .filter((img) => img && img.url && !isBlockedSource(img.url));
  } catch (err) {
    if (track) track.failed = (track.failed || 0) + 1;
    logError('Photo search failed', err);
    return [];
  }
}

// Downloads a found photo so the AI can look at it (skips anything slow, huge, or not an image)
async function fetchImageAsDataUrl(url) {
  try {
    // Only public addresses, with a size cap and one timeout (see fetchsafe.js)
    const res = await safeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FactOrFeed/1.0)' }, maxBytes: 2_500_000, timeoutMs: 5000 });
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || res.truncated || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = res.bytes;
    if (buf.length < 2000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function compareWithRealPhotos(image, query, model, lessons = '', track = null) {
  const found = await searchPhotos(query, track);
  const downloaded = await Promise.all(
    found.slice(0, 8).map(async (img) => ({ ...img, dataUrl: await fetchImageAsDataUrl(img.url) }))
  );
  const picked = downloaded.filter((img) => img.dataUrl).slice(0, 4);
  if (!picked.length) {
    return { match: 'No similar real photos', reused_old_photo: false, effect: 'No change', comparison: "We couldn't find real photos online to compare with.", compared: [], query };
  }
  const { output } = await generateText({
    model,
    system: COMPARE_PROMPT + lessons,
    ...withTemperature(model, 0.2),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Photo the user was sent:` },
          { type: 'image', image },
          { type: 'text', text: `${picked.length} photos found online by searching "${query}":` },
          ...picked.map((p) => ({ type: 'image', image: p.dataUrl })),
        ],
      },
    ],
    output: Output.object({ schema: CompareSchema }),
  });
  return { ...output, compared: picked.map((p) => ({ url: p.url, description: p.description || '' })), query };
}

function rebuildAbstract(inverted) {
  if (!inverted) return '';
  const words = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const p of positions) words[p] = word;
  }
  return words.join(' ');
}

// Searches published research with OpenAlex. Withdrawn (retracted) papers are never used.
// The OPENALEX_API_KEY gives the site its own daily allowance; without it, the free one is shared
// with everyone on the same server and can run out. Failures are counted in `track`, like news searches.
async function searchResearch(query, track = null) {
  if (track) track.tried = (track.tried || 0) + 1;
  const failed = (why) => {
    if (track) track.failed = (track.failed || 0) + 1;
    console.error('Research search failed:', why);
    return [];
  };
  try {
    const key = process.env.OPENALEX_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENALEX_API_KEY)}` : '';
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=is_retracted:false&per-page=6${key}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return failed(`status ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return failed('no results list');
    return data.results
      .filter((w) => w.type === 'article')
      .map((w) => ({
        title: w.display_name,
        url: w.doi || w.id,
        snippet: rebuildAbstract(w.abstract_inverted_index).slice(0, 600),
        date: w.publication_year ? String(w.publication_year) : null,
        journal: w.primary_location?.source?.display_name || null,
        research: true,
      }));
  } catch (err) {
    return failed(err?.name || 'error');
  }
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Pulls the preview text (title, caption, description) that most sites put in their page tags.
function readMetaTags(html) {
  const found = [];
  const re = /<meta[^>]+(?:property|name)=["'](og:title|og:description|twitter:title|twitter:description|description)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const content = m[0].match(/content=["']([^"']*)["']/i);
    if (content && content[1] && !found.includes(content[1])) found.push(content[1]);
  }
  return decodeEntities(found.join('\n'));
}


const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
};

async function readArticle(url) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'This does not look like a valid link.';
  }

  const parts = [];

  // Read the page itself (this also follows short links like vm.tiktok.com to the real post)
  let finalUrl = url;
  try {
    // Only http(s) links to public addresses; redirects re-checked (max 3); about 2MB; 8 seconds in all
    const res = await safeFetch(url, { headers: BROWSER_HEADERS });
    finalUrl = res.url || url;
    // Hidden text tricks (HTML comments, zero-width characters) are removed first
    const html = stripHidden(res.bytes.toString('utf8'));
    const meta = readMetaTags(html);
    if (meta) parts.push(`Page preview: ${meta}`);
    const body = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 10000);
    if (body.trim()) parts.push(`Page text: ${body}`);
  } catch {}

  // TikTok shares each video's caption and creator publicly
  if (host.endsWith('tiktok.com')) {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.title) parts.unshift(`TikTok caption: ${data.title}`);
      if (data.author_name) parts.unshift(`TikTok video posted by: ${data.author_name}`);
    } catch {}
  }

  if (/instagram\.com|tiktok\.com|facebook\.com|x\.com|twitter\.com/.test(host)) {
    parts.push(
      'Note: this is a social media link. These sites often hide posts behind a login, so the content above may be incomplete. If you cannot tell what the post says, say so and suggest the user share a screenshot instead.'
    );
  }

  return parts.length ? parts.join('\n\n') : 'Could not open this link.';
}

const PLAUSIBILITY_SCORE = { Plausible: 0, Unusual: 4, 'Very unlikely': 8 };

function imageScore(run) {
  const visual = Math.max(0, Math.min(10, Number(run.visual_signs_score) || 0));
  return Math.max(visual, PLAUSIBILITY_SCORE[run.plausibility] ?? 0);
}

function levelFor(score) {
  if (score >= 7) return 'High chance of AI';
  if (score >= 3) return 'Medium chance of AI';
  return 'Low chance of AI';
}

// One image check (it used to run 3 times; the scoring works the same with one answer).
// If the AI call fails, it tries once more before giving up.
async function runImageCheck(image, system, prompt) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await imageCheckOnce(image, system, prompt);
      if (result) return result;
    } catch (err) {
      logError(`Image check failed (try ${attempt} of 2)`, err);
    }
  }
  return null;
}

async function imageCheckOnce(image, system, prompt) {
  const { output } = await generateText({
    model: MODEL,
    system,
    ...withTemperature(MODEL, 0),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', image },
        ],
      },
    ],
    output: Output.object({ schema: ImageSchema }),
  });
  return combineImageChecks(output ? [output] : []);
}

function combineImageChecks(runs) {
  if (!runs.length) return null;
  const scored = runs.map((r) => ({ ...r, score: imageScore(r) })).sort((a, b) => a.score - b.score);
  const middle = scored[Math.floor(scored.length / 2)];
  const level = levelFor(middle.score);
  const agree = scored.filter((r) => levelFor(r.score) === level).length;
  return {
    level,
    score: middle.score,
    plausibility: middle.plausibility,
    plausibility_reason: middle.plausibility_reason,
    signs: middle.signs,
    note: middle.note,
    checks: scored.length,
    agree,
  };
}

export async function analyze(input) {
  const start = Date.now();
  const timings = [];
  const mark = (label) =>
    timings.push({ label, seconds: Math.round((Date.now() - start) / 100) / 10 });

  const text = (input.text || '').slice(0, 6000);
  const url = (input.url || '').trim();
  const image = input.image || null;
  const audience = String(input.audience || 'everyone').slice(0, 20);
  const fast = !!input.fast;
  const toolName = input.tool === 'facts' ? 'facts' : 'credible';
  // In "Is this true?" mode the photo is only read for its claims; the AI photo check is its own mode
  const photoChecks = !!image && input.mode !== 'fact';
  // The Writer (and the Reviewer, unchanged) use the strong model; the iPhone popup keeps the fast one for speed
  const quickModel = fast ? FAST_MODEL : MODEL;
  const language = LANGUAGE_NAMES[input.language] ? input.language : 'auto';

  const langCode = LANGUAGE_NAMES[input.language] ? input.language : 'en';
  const chatResult = (intent, reply) => ({ tool: toolName, lang: langCode, chat: { kind: intent, reply }, trace: { intent, complete: false, timings } });

  if (!text && !url && !image) {
    const e = new Error('Paste some text, a link, or add a screenshot.');
    e.status = 400;
    throw e;
  }

  // 👋 A plain "hi" or "thanks" gets an instant reply from code (no AI at all)
  const hello = !url && !image ? detectGreeting(text) : null;
  if (hello) {
    mark('Vera answered a hello');
    return chatResult('chat', greetingReply(hello, input.language));
  }

  // 📒 Vera's notebook starts loading now, while the Front desk sorts the message
  const notebookPromise = loadNotebook();

  // Step 0: 🛎️ The Front desk (small fast model) decides: check, chat, blocked, or self_harm.
  // It runs before link reading and the Manager, so small talk never waits for them.
  const askFrontDesk = async (deskContent) => {
    try {
      const { output } = await generateText({
        model: FAST_MODEL,
        system: FRONT_DESK_PROMPT,
        ...withTemperature(FAST_MODEL, 0.2),
        messages: [{ role: 'user', content: deskContent }],
        output: Output.object({ schema: FrontDeskSchema }),
      });
      return output;
    } catch (err) {
      logError('Front desk failed, treating it as a check', err);
      return null;
    }
  };
  const deskReply = (intent, raw) => {
    let reply = String(raw || '').trim().slice(0, 1200);
    if (intent === 'blocked' && !reply) reply = "Sorry, I can't help with that. I'm happy to fact-check a post, link, or photo for you instead.";
    if (intent === 'self_harm') reply = `${reply || "I'm really sorry you're going through this. You matter, and talking to someone can help."}\n\n${CRISIS_LINE}`;
    if (intent === 'chat' && !reply) reply = "Hi! I'm Vera. Send me a post, link, or question and I'll check the facts with you.";
    mark(intent === 'chat' ? 'Vera answered a hello' : 'This request is not something Vera can help with');
    notebookPromise.catch(() => {});
    return chatResult(intent, reply);
  };
  let desk = null;
  {
    const deskContent = [];
    if (text) deskContent.push({ type: 'text', text: `The user's message:\n${text}` });
    if (url) deskContent.push({ type: 'text', text: `A link was sent: ${url}` });
    if (image) deskContent.push({ type: 'image', image });
    deskContent.push({ type: 'text', text: `${image ? 'A photo was sent.' : 'No photo was sent.'}\nTool: ${toolName === 'facts' ? '"Find the facts"' : '"Is this news credible?"'}` });
    desk = await askFrontDesk(deskContent);
  }
  // 👋 Small talk gets a short reply as Vera, and anything against the safety rules is never searched.
  // (A photo or link is always checked, never treated as small talk.)
  const intent = desk?.intent === 'chat' && (image || url) ? 'check' : desk?.intent || 'check';
  if (intent !== 'check') return deskReply(intent, desk.chat_reply);

  const content = [];
  if (text) content.push({ type: 'text', text: toolName === 'facts' ? `The user wants to know:\n${stripHidden(text)}` : `The user was sent this:\n${untrusted('post the user was sent', text)}` });
  if (url) {
    const article = await readArticle(url);
    content.push({ type: 'text', text: `Article from ${url}:\n${untrusted('linked article', article)}` });
    // 🛡️ The linked article gets the same safety screening the Manager used to give it (blocked / self_harm only;
    // a link is never small talk). One cheap Haiku call, only when a link was read.
    const linkDesk = await askFrontDesk([
      ...(text ? [{ type: 'text', text: `The user's message:\n${text}` }] : []),
      { type: 'text', text: `Article from ${url}:\n${untrusted('linked article', article)}` },
      { type: 'text', text: `A link was sent, so this is never chat.\nTool: ${toolName === 'facts' ? '"Find the facts"' : '"Is this news credible?"'}` },
    ]);
    if (linkDesk?.intent === 'blocked' || linkDesk?.intent === 'self_harm') return deskReply(linkDesk.intent, linkDesk.chat_reply);
  }
  if (image) content.push({ type: 'image', image });
  if (content.length === 0) {
    const e = new Error('Paste some text, a link, or add a screenshot.');
    e.status = 400;
    throw e;
  }

  // 📒 Every agent reads Vera's notebook before doing its job
  const notebook = await notebookPromise;
  // 📅 Every agent is told today's date (worked out fresh for each check)
  const today = dateRule();

  // Step 0b: 🧭 The Manager analyzes the post and chooses the game plan
  let plan = null;
  try {
    const { output } = await generateText({
      model: FAST_MODEL,
      system: MANAGER_PROMPT + lessonsFor(notebook, 'manager') + today,
      ...withTemperature(FAST_MODEL, 0.2),
      messages: [
        {
          role: 'user',
          content: [
            ...content,
            {
              type: 'text',
              text: `${image ? 'A photo was sent.' : 'No photo was sent.'}\nTool: ${
                toolName === 'facts'
                  ? '"Find the facts": the user asked a question and wants the answer to that exact question, with the sources it came from.'
                  : '"Is this news credible?": the user wants to know if this post or article is credible: its bias, its persuasion tactics, and whether the facts are accurate.'
              }`,
            },
          ],
        },
      ],
      output: Output.object({ schema: ManagerSchema }),
    });
    plan = output;
  } catch (err) {
    logError('Manager failed, using the full team', err);
  }
  // If the Manager can't decide, use the full team (safe default)
  plan = plan || {
    analysis: 'Using the full team to be safe.',
    news_search: 'full',
    official_sources: true,
    research_papers: true,
    persuasion: true,
    photo_comparison: true,
    emergency_mode: false,
    go_to_original: false,
    original_source: null,
    is_recent: false,
    reasons: ['Using the full team to be safe.'],
  };
  // Each tool has its own job: credibility always looks at persuasion; Find the facts answers a question
  if (toolName === 'credible') plan.persuasion = true;
  if (toolName === 'facts') {
    plan.persuasion = false;
    plan.photo_comparison = false;
  }
  mark(`Manager made a game plan: ${plan.analysis}`);

  // Step 1: Read the content and plan the searches
  const { output: reader } = await generateText({
    model: FAST_MODEL,
    system: READER_PROMPT + lessonsFor(notebook, 'planner') + today,
    messages: [
      {
        role: 'user',
        content: [
          ...content,
          { type: 'text', text: `Tool: ${toolName === 'facts' ? '"Find the facts" (the user asked a question)' : '"Is this news credible?" (the user sent a post or article)'}\nManager's game plan: ${JSON.stringify(plan)}` },
        ],
      },
    ],
    output: Output.object({ schema: ReaderSchema }),
  });
  // The user's exact question always comes from what they typed, not the AI's rewrite
  const userQuestion = toolName === 'facts' ? (text || reader.user_question || reader.content_summary || '').slice(0, 1000) : null;
  const questionType = toolName === 'facts' ? reader.question_type || 'fact' : 'fact';
  const futureOutcome = questionType === 'future_outcome';
  mark('Planner found the claims and planned the searches');

  // The Manager's plan decides how much each kind of search runs
  // A question about the future always gets a real news search
  const newsSearch = futureOutcome && plan.news_search === 'none' ? 'light' : plan.news_search;
  const newsCount = newsSearch === 'none' ? 0 : newsSearch === 'light' ? 3 : fast ? 3 : 6;
  const newsWanted = (reader.news_queries.length ? reader.news_queries : reader.claims.length ? reader.claims : userQuestion ? [userQuestion] : []).slice(0, newsCount);
  const officialWanted = plan.official_sources || plan.emergency_mode ? reader.official_queries.slice(0, plan.emergency_mode ? 3 : fast ? 1 : 2) : [];
  const researchQ = plan.research_papers ? reader.academic_queries.slice(0, fast ? 1 : 3) : [];
  // Going straight to the original source when the Manager decided that's the best move
  const originalWanted = plan.go_to_original ? (reader.original_queries || []).slice(0, 2) : [];
  // 💰 At most 6 web searches (3 in the iPhone popup), counting the photo search, with
  // near-identical queries dropped. Each round the original source goes first, then two news
  // searches, then official sources (official first in an emergency), so the key ones always run.
  const willCompare = photoChecks && plan.photo_comparison && !!reader.photo_search_query;
  const cap = (fast ? MAX_SEARCHES.fast : MAX_SEARCHES.full) - (willCompare ? 1 : 0);
  const picked = planSearches(
    plan.emergency_mode
      ? [
          { name: 'official', queries: officialWanted, weight: 2 },
          { name: 'news', queries: newsWanted, weight: 2 },
          { name: 'original', queries: originalWanted },
        ]
      : [
          { name: 'original', queries: originalWanted },
          { name: 'news', queries: newsWanted, weight: 2 },
          { name: 'official', queries: officialWanted },
        ],
    cap
  );
  let newsQ = picked.news;
  const officialQ = picked.official;
  const originalQ = picked.original;
  // ...and at least one search for the latest dated polls and reporting, with the year in it
  const year = todayEastern().slice(0, 4);
  if (futureOutcome && newsQ.length && !newsQ.some((q) => q.includes(year))) {
    newsQ[newsQ.length - 1] = `${userQuestion.slice(0, 200)} latest polls forecasts ${year}`;
  }
  // Never search nothing at all if there is a checkable claim or a question
  // (with no claims, search with the user's own question instead of skipping)
  const needsCheck = reader.claims.length > 0 || (!!userQuestion && questionType !== 'opinion');
  if (!newsQ.length && !officialQ.length && !researchQ.length && !originalQ.length && needsCheck) {
    newsQ = reader.claims.length ? reader.claims.slice(0, 1) : [userQuestion];
  }

  // Recent or breaking news: the first news search only looks at the past week
  // (the past month for questions about what will happen, like the latest polls)
  const recent = !!plan.is_recent || reader.topic_type === 'breaking_news' || futureOutcome;
  const timeRange = futureOutcome && !plan.is_recent && reader.topic_type !== 'breaking_news' ? 'month' : 'week';

  // Step 2: Search, analyze persuasion, and check the image, all at the same time
  const searchTrack = { tried: 0, failed: 0 };
  // Research searches are counted on their own, so a research outage never blocks a verdict or a saved result
  const researchTrack = { tried: 0, failed: 0 };
  const searchesPromise = Promise.all([
    ...originalQ.map((q) => searchWeb(q, { max_results: 5 }, searchTrack).then((list) => list.map((x) => ({ ...x, original: true })))),
    ...newsQ.map((q, i) => searchWeb(q, recent && i === 0 ? { topic: 'news', time_range: timeRange } : { topic: 'news' }, searchTrack)),
    ...officialQ.map((q) => searchWeb(q, {}, searchTrack)),
    ...researchQ.map((q) => searchResearch(q, researchTrack)),
  ]).then((results) => {
    mark(
      researchTrack.failed
        ? `Searched news and official sources (${researchTrack.failed} of ${researchTrack.tried} research searches failed)`
        : 'Searched news, official sources, and published research'
    );
    return results;
  });

  const persuasionPromise = plan.persuasion
    ? generateText({
        model: FAST_MODEL,
        system: PERSUASION_PROMPT + lessonsFor(notebook, 'persuasion') + today,
        prompt: `${reader.content_summary}\n\nOriginal text:\n${untrusted('post the user was sent', text)}`,
      }).then((r) => {
        mark('Analyzed persuasion tactics');
        return r.text;
      })
    : Promise.resolve('The Manager skipped the persuasion check for this one.');

  // One image check (it used to be three runs with a median; one run costs a third as much)
  const imagePromise = photoChecks
    ? runImageCheck(image, IMAGE_PROMPT + lessonsFor(notebook, 'image') + today, 'Check this image for warning signs of AI generation or editing.').then((r) => {
        mark('Checked the image for AI warning signs');
        return r;
      })
    : Promise.resolve(null);

  // The photo search is counted on its own, so it never changes the news-source rule
  const photoTrack = { tried: 0, failed: 0 };
  let compareFailed = false;
  const comparePromise = willCompare
    ? compareWithRealPhotos(image, reader.photo_search_query, FAST_MODEL, lessonsFor(notebook, 'comparison') + today, photoTrack)
        .then((r) => {
          mark(`Compared the photo with ${r.compared.length} real photos found online`);
          return r;
        })
        .catch((err) => {
          logError('Photo comparison failed', err);
          compareFailed = true;
          return null;
        })
    : Promise.resolve(null);

  const [searchResults, persuasion, rawImageCheck, photoComparison] = await Promise.all([
    searchesPromise,
    persuasionPromise,
    imagePromise,
    comparePromise,
  ]);

  // The comparison nudges the AI-chance score up or down
  let imageCheck = rawImageCheck;
  if (imageCheck && photoComparison) {
    let score = imageCheck.score ?? 0;
    if (photoComparison.effect === 'More likely fake') score = Math.min(10, score + 2);
    if (photoComparison.effect === 'More likely real') score = Math.max(0, score - 2);
    imageCheck = { ...imageCheck, score, level: levelFor(score), comparison: photoComparison };
  }

  // Step 3: Remove duplicates and label each source
  const seen = new Set();
  const all = [];
  for (const list of searchResults) {
    for (const s of list) {
      const key = (s.url || '').split('?')[0].replace(/\/$/, '');
      if (!key || seen.has(key) || isBlockedSource(s.url)) continue;
      seen.add(key);
      all.push({ ...s, ...categorize(s), original: !!s.original });
    }
  }
  const sources = all.slice(0, 50).map((s, i) => ({ ...s, id: i + 1 }));

  const stats = {};
  for (const s of sources) stats[s.category] = (stats[s.category] || 0) + 1;

  const sourceList = sources
    .map(
      (s) =>
        `[${s.id}] ${s.original ? 'ORIGINAL SOURCE | ' : ''}${s.category} | ${s.domain}${s.journal ? ' | ' + s.journal : ''} | ${s.date || 'date unknown'} | ${s.title}\n${s.snippet}`
    )
    .join('\n\n');

  const notebookText = notebookForPrompt(notebook);
  // The outlet that published a pasted link, with its bias rating (bias is not the same as accuracy)
  const outlet = url ? categorize({ url }) : null;
  mark(`Every agent read Vera's notebook (${notebook.rumors.length} past rumors as unverified hints, ${approvedLessonCount()} approved lessons)`);

  // Step 4: Weigh the evidence and write the answer
  const writerLanguage = LANGUAGE_NAMES[language !== 'auto' ? language : reader.language] || 'English';
  let story;
  if (toolName === 'facts') {
    const { output } = await generateText({
      model: quickModel,
      system: `${FACTS_PROMPT}${lessonsFor(notebook, 'writer')}${today}\n\nRules you must follow:\n${RULES}`,
      prompt: `Audience: ${audience}
Language: ${writerLanguage}

The user's exact question (answer THIS, not an easier one): ${userQuestion}
Question type: ${questionType}${futureOutcome ? ' (about the future: never answer yes or no, never predict or endorse an outcome; report only the latest dated polls, forecasts, and reporting from the sources)' : ''}
What it's about: ${reader.content_summary}

Manager's game plan: ${plan.analysis}${plan.go_to_original && plan.original_source ? ` The Manager decided to go straight to the original source: ${plan.original_source}.` : ''}${plan.emergency_mode ? EMERGENCY_NOTE : ''}

Vera's notebook (unverified hints from past checks; re-verify against today's sources, which always win):
${notebookForPrompt(notebook)}

Sources found (${sources.length}):
${sourceList ? untrusted('search results', sourceList) : 'No sources were found.'}`,
      output: Output.object({ schema: FactsSchema }),
    });
    story = output;
    mark('Weighed the evidence and wrote the answer');
  } else {
  const { output } = await generateText({
    model: quickModel,
    system: `${STORY_PROMPT}${lessonsFor(notebook, 'writer')}${today}\n\nRules you must follow:\n${RULES}`,
    prompt: `Audience: ${audience}
Language: ${writerLanguage}

What the user sent (summary): ${reader.content_summary}
Who posted or wrote it (as shown in the content): ${reader.posted_by || 'not shown'}
Outlet bias rating: ${outlet ? `${outlet.domain} is rated ${outlet.category}` : 'not a rated outlet'}

Claims:
${reader.claims.join('\n')}

Manager's game plan: ${plan.analysis}${plan.emergency_mode ? EMERGENCY_NOTE : ''}

Persuasion analysis:
${persuasion}

Vera's notebook (unverified hints from past checks; re-verify against today's sources, which always win):
${notebookText}

Image check (including comparison with real photos online): ${imageCheck ? JSON.stringify(imageCheck) : image ? 'Not run here (the AI photo check is a separate mode). Judge the claims, not whether the photo is AI-made.' : 'No image was sent'}

Sources found (${sources.length}):
${sourceList ? untrusted('search results', sourceList) : 'No sources were found.'}`,
    output: Output.object({ schema: StorySchema }),
  });
  story = output;
  mark('Weighed the evidence and wrote the real story');
  }


  // Step 5: A separate Reviewer agent double-checks the draft against the sources
  let review = null;
  let reviewFailed = false;
  try {
    const { output } = await generateText({
      model: quickModel,
      system: `${REVIEWER_PROMPT}${lessonsFor(notebook, 'reviewer')}${today}\n\nRules the result must follow:\n${RULES}`,
      prompt: `${toolName === 'facts' ? `The user's exact question: ${userQuestion}\nQuestion type: ${questionType}\n\n` : ''}Claims being checked:
${reader.claims.join('\n') || 'none'}

Vera's draft result:
${JSON.stringify(
  toolName === 'facts'
    ? { answer: story.answer, details: story.details, reframed: story.reframed, consensus: story.consensus, original_source: story.original_source, key_source_ids: story.key_source_ids, note: `This is an answer to a question, not a verdict on a post. Use corrected_real_story to fix the answer if needed; leave corrected_verdict null.${futureOutcome ? ' The question is about the future: the answer must not say yes or no or predict an outcome.' : ''}` }
    : { verdict: story.verdict, real_story: story.real_story, consensus: story.consensus, right_and_wrong: story.right_and_wrong, key_source_ids: story.key_source_ids }
)}

Sources she had (${sources.length}):
${sourceList ? untrusted('search results', sourceList) : 'No sources were found.'}`,
      output: Output.object({ schema: ReviewSchema }),
    });
    review = output;
    // A changed verdict also fixes or clears the parts written for the old one (see applyReview)
    const fixed = applyReview(story, review, toolName);
    story = fixed.story;
    if (review && fixed.adjusted) review = { ...review, adjusted: true };
    mark(review?.approved ? 'A second AI double-checked the verdict and agreed' : 'A second AI double-checked the verdict and fixed it');
  } catch (err) {
    // If the double-check fails, still show Vera's answer rather than nothing (but don't save it)
    logError('Reviewer failed', err);
    reviewFailed = true;
  }

  // Step 6: Never guess. If there are too few sources (fewer than 3, or all from one website),
  // the code itself says "Can't confirm yet", whatever the AI wrote. A failed search only
  // matters when it left us short of sources.
  // (Satire from a recognized satire site, and opinions, are labeled without the 3-source rule)
  const exempt = toolName !== 'facts' && skipsEvidenceRule(story);
  const problem = exempt ? null : evidenceProblem(sources, {
    claims: needsCheck ? Math.max(1, reader.claims.length) : 0,
    searchesFailed: searchTrack.failed,
  });
  // Fixed messages use the language the user picked, else the language Vera detected
  const msgLang = pickLang(input.language, reader.language);
  if (toolName === 'facts') {
    // Also: questions about the future always open with a fixed sentence and never get a yes or no
    story = finalizeFacts(story, { questionType, problem, lang: msgLang });
  } else if (problem) {
    story = forceCantConfirm(story, toolName, problem, msgLang);
  }
  if (problem) {
    review = null; // the double-check was about the replaced draft, so don't show it
    mark(`Not enough sources to check this (${sources.length} found, ${searchTrack.failed} of ${searchTrack.tried} searches failed), so I'm not guessing`);
  }

  const keySources = (story.key_source_ids || [])
    .map((id) => sources.find((s) => s.id === id))
    .filter(Boolean);

  return {
    tool: toolName,
    lang: msgLang,
    outlet,
    result: story,
    review,
    // 'failed' when the double-check couldn't run, so the page says "not double-checked"
    reviewStatus: problem ? 'skipped' : reviewFailed ? 'failed' : 'done',
    keySources,
    sources: sources.map(({ snippet, ...rest }) => ({ ...rest, snippet: (snippet || '').slice(0, 300) })),
    stats,
    imageCheck,
    trace: {
      plan,
      topic: reader.topic_type,
      question: userQuestion,
      question_type: questionType,
      claims: reader.claims,
      queries: { original: originalQ, news: newsQ, official: officialQ, research: researchQ },
      recent,
      search: { ...searchTrack, photo: photoTrack, research: researchTrack, enough: !problem, forced: problem || null },
      // false when a step failed (the double-check, or the photo comparison), so it isn't saved for reuse
      complete: !reviewFailed && !compareFailed && !(photoChecks && !imageCheck),
      timings,
    },
  };
}


// ─────────────────────────────────────────────────────────────
// 🤖 "Is this photo AI?" mode: only the photo agents run.
// One Image agent scores warning signs,
// a Photo Finder describes the scene and searches for real photos of it,
// the Comparison agent compares them, and the Photo Writer explains it simply.
// ─────────────────────────────────────────────────────────────
const DescribeSchema = z.object({
  description: z.string(),
  photo_search_query: z.string().nullable(),
  language: z.enum(['en', 'es', 'ht', 'zh', 'hi', 'ar', 'fr', 'bn', 'it']),
});

const PhotoSummarySchema = z.object({
  headline: z.string(),
  explanation: z.string(),
  tip: z.string(),
  signs: z.array(z.string()),
  plausibility_reason: z.string(),
  comparison: z.string().nullable(),
});

export async function checkPhoto(input) {
  const start = Date.now();
  const timings = [];
  const mark = (label) => timings.push({ label, seconds: Math.round((Date.now() - start) / 100) / 10 });

  const image = input.image || null;
  const context = (input.text || '').slice(0, 1000);
  const audience = input.audience || 'everyone';
  if (!image) {
    const e = new Error('Add a photo with the 📎 button and I\'ll check if it looks AI-made.');
    e.status = 400;
    throw e;
  }

  const notebook = await loadNotebook();
  const today = dateRule();

  const imagePromise = runImageCheck(
    image,
    IMAGE_PROMPT + lessonsFor(notebook, 'image') + today,
    `Check this image for warning signs of AI generation or editing.${context ? `\nWhat the user said about it: ${untrusted('user note', context)}` : ''}`
  ).then((r) => {
    mark('Checked the photo for AI warning signs');
    return r;
  });

  const searchTrack = { tried: 0, failed: 0 };
  let finderFailed = false;
  // The Photo Finder describes the scene and plans a search for real photos of it
  const comparePromise = generateText({
    model: FAST_MODEL,
    system:
      'You describe photos for a fact-checking app. Describe what the photo shows in one plain sentence. Then write a short web image search query (3 to 8 words) that would find REAL photos of the same scene, event, place, or subject, or null if a search would not help (for example a selfie or a plain meme). Also give the language of any text in the photo or the user\'s note (default en). Never include names of private people.' + UNTRUSTED_RULE + today,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image },
          { type: 'text', text: context ? `The user said: ${untrusted('user note', context)}` : 'No note from the user.' },
        ],
      },
    ],
    output: Output.object({ schema: DescribeSchema }),
  })
    .then(async ({ output: d }) => {
      mark('Described the photo and planned a search for real ones');
      if (!d?.photo_search_query) return { describe: d, comparison: null };
      try {
        const comparison = await compareWithRealPhotos(image, d.photo_search_query, FAST_MODEL, lessonsFor(notebook, 'comparison') + today, searchTrack);
        mark(`Compared the photo with ${comparison.compared.length} real photos found online`);
        return { describe: d, comparison };
      } catch (err) {
        logError('Photo comparison failed', err);
        finderFailed = true;
        return { describe: d, comparison: null };
      }
    })
    .catch((err) => {
      logError('Photo finder failed', err);
      finderFailed = true;
      return { describe: null, comparison: null };
    });

  const [rawCheck, { describe, comparison }] = await Promise.all([imagePromise, comparePromise]);
  if (!rawCheck) throw new Error("I couldn't check that photo. Try again in a moment?");

  let check = rawCheck;
  if (comparison) {
    let score = check.score ?? 0;
    if (comparison.effect === 'More likely fake') score = Math.min(10, score + 2);
    if (comparison.effect === 'More likely real') score = Math.max(0, score - 2);
    check = { ...check, score, level: levelFor(score), comparison };
  }

  // The Photo Writer explains the result in plain words, in the user's language
  const langCode = LANGUAGE_NAMES[input.language] ? input.language : describe?.language || 'en';
  let summary = null;
  try {
    const { output } = await generateText({
      model: FAST_MODEL,
      system: `${lessonsFor(notebook, 'writer')}
You are Vera from "Fact or Feed?", a friendly fact-checking friend. Explain an AI-photo check to a regular person.
- headline: one short sentence that matches the level exactly (do not make it stronger or weaker).
- explanation: 2 or 3 plain sentences on why, using the warning signs, how believable the scene is, and the comparison with real photos if there is one.
- tip: one practical thing they can do to check further (for example a reverse image search, or looking for the same photo from a trusted news outlet).
- signs, plausibility_reason, comparison: rewrite the given text in the requested language, plain words (comparison null if none).
Never say a photo is definitely AI or definitely real; warning signs are not proof.
Tone: ${audience === 'simple' ? 'very short and simple words' : audience === 'complex' ? 'more detail and nuance, still clear' : 'friendly and clear for any age'}.
Write in ${LANGUAGE_NAMES[langCode] || 'English'}.${UNTRUSTED_RULE}${today}`,
      prompt: JSON.stringify({
        level: check.level,
        plausibility: check.plausibility,
        plausibility_reason: check.plausibility_reason,
        signs: check.signs,
        note: check.note,
        comparison: comparison ? { match: comparison.match, effect: comparison.effect, text: comparison.comparison } : null,
        what_the_photo_shows: describe?.description || null,
        user_note: context ? untrusted('user note', context) : null,
      }),
      output: Output.object({ schema: PhotoSummarySchema }),
    });
    summary = output;
    mark('Wrote up the photo check');
  } catch (err) {
    logError('Photo writer failed', err);
  }

  if (summary) {
    check = {
      ...check,
      signs: summary.signs?.length ? summary.signs : check.signs,
      plausibility_reason: summary.plausibility_reason || check.plausibility_reason,
      comparison: check.comparison && summary.comparison ? { ...check.comparison, comparison: summary.comparison } : check.comparison,
    };
  }

  return {
    tool: 'photo',
    lang: langCode,
    photo: {
      ...check,
      headline: summary?.headline || check.level,
      explanation: summary?.explanation || check.note,
      tip: summary?.tip || 'Try a reverse image search to see where else this photo appears.',
      description: describe?.description || null,
    },
    trace: { search: searchTrack, complete: !!summary && !finderFailed, timings },
  };
}
