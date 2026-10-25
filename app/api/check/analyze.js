import { generateText, Output } from 'ai';
import { z } from 'zod';
import { MANAGER_PROMPT, RULES, READER_PROMPT, PERSUASION_PROMPT, IMAGE_PROMPT, STORY_PROMPT, REVIEWER_PROMPT, COMPARE_PROMPT, FACTS_PROMPT } from './prompts';
import { categorize } from './bias';
import { loadNotebook, notebookForPrompt, lessonsFor } from './notebook';


// Paste your Opus model ID inside the quotes
const MODEL = 'anthropic/claude-sonnet-4.5';
// Faster model for the simple steps when speed matters (the iPhone popup)
const FAST_MODEL = 'anthropic/claude-haiku-4.5';

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
};

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
  reasons: z.array(z.string()),
});

const ReaderSchema = z.object({
  language: z.enum(['en', 'es', 'ht', 'zh', 'hi', 'ar', 'fr', 'bn']),
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
    .enum(['Accurate', 'Missing context', 'Exaggerated', 'Misleading', 'False', "Can't confirm yet"])
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
  verdict: z.enum(['Accurate', 'Missing context', 'Exaggerated', 'Misleading', 'False', "Can't confirm yet"]),
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
  how_we_figured_it_out: z.array(z.string()),
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
  breakdown: z.array(
    z.object({
      point: z.string(),
      source_ids: z.array(z.number()),
      agreement: z.enum(['Sources agree', 'Sources disagree', 'Only one source']),
    })
  ),
  disputed: z.array(z.string()),
  unknown: z.array(z.string()),
  how_we_figured_it_out: z.array(z.string()),
  key_source_ids: z.array(z.number()),
  clarifying_question: z.string().nullable(),
  notebook_note: z.string().nullable(),
});

export async function searchWeb(query, extra = {}) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 10, ...extra }),
    });
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title || r.url,
      url: r.url,
      snippet: (r.content || '').slice(0, 500),
      date: r.published_date || null,
    }));
  } catch {
    return [];
  }
}

// Finds real photos online of the same scene, so the Comparison agent can compare
async function searchPhotos(query) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5, include_images: true, include_image_descriptions: true }),
    });
    const data = await res.json();
    return (data.images || [])
      .map((img) => (typeof img === 'string' ? { url: img, description: '' } : img))
      .filter((img) => img && img.url);
  } catch {
    return [];
  }
}

// Downloads a found photo so the AI can look at it (skips anything slow, huge, or not an image)
async function fetchImageAsDataUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FactOrFeed/1.0)' },
    });
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000 || buf.length > 2_500_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function compareWithRealPhotos(image, query, model, lessons = '') {
  const found = await searchPhotos(query);
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
    temperature: 0.2,
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

async function searchResearch(query) {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=6`
    );
    const data = await res.json();
    return (data.results || [])
      .filter((w) => w.type === 'article')
      .map((w) => ({
        title: w.display_name,
        url: w.doi || w.id,
        snippet: rebuildAbstract(w.abstract_inverted_index).slice(0, 600),
        date: w.publication_year ? String(w.publication_year) : null,
        journal: w.primary_location?.source?.display_name || null,
        research: true,
      }));
  } catch {
    return [];
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

async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    const res = await fetchWithTimeout(url, { headers: BROWSER_HEADERS });
    finalUrl = res.url || url;
    const html = await res.text();
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
      const res = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`);
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
  const audience = input.audience || 'everyone';
  const fast = !!input.fast;
  const toolName = input.tool === 'facts' ? 'facts' : 'credible';
  // In "Is this true?" mode the photo is only read for its claims; the AI photo check is its own mode
  const photoChecks = !!image && input.mode !== 'fact';
  const quickModel = fast ? FAST_MODEL : MODEL;
  const language = LANGUAGE_NAMES[input.language] ? input.language : 'auto';

  const content = [];
  if (text) content.push({ type: 'text', text: toolName === 'facts' ? `The user wants to know:\n${text}` : `The user was sent this:\n${text}` });
  if (url) content.push({ type: 'text', text: `Article from ${url}:\n${await readArticle(url)}` });
  if (image) content.push({ type: 'image', image });
  if (content.length === 0) {
    const e = new Error('Paste some text, a link, or add a screenshot.');
    e.status = 400;
    throw e;
  }

  // 📒 Every agent reads Vera's notebook before doing its job
  const notebook = await loadNotebook();

  // Step 0: 🧭 The Manager analyzes the post and chooses the game plan
  let plan = null;
  try {
    const { output } = await generateText({
      model: FAST_MODEL,
      system: MANAGER_PROMPT + lessonsFor(notebook, 'manager'),
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            ...content,
            {
              type: 'text',
              text: `${image ? 'A photo was sent.' : 'No photo was sent.'}\nTool: ${
                toolName === 'facts'
                  ? '"Find the facts": the user asked a question and wants the answer with where it came from.'
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
    console.error('Manager failed, using the full team', err);
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
    model: quickModel,
    system: READER_PROMPT + lessonsFor(notebook, 'planner'),
    messages: [{ role: 'user', content: [...content, { type: 'text', text: `Manager's game plan: ${JSON.stringify(plan)}` }] }],
    output: Output.object({ schema: ReaderSchema }),
  });
  mark('Planner found the claims and planned the searches');

  // The Manager's plan decides how much each kind of search runs
  const newsCount = plan.news_search === 'none' ? 0 : plan.news_search === 'light' ? 3 : fast ? 3 : 6;
  let newsQ = (reader.news_queries.length ? reader.news_queries : reader.claims).slice(0, newsCount);
  const officialQ = plan.official_sources || plan.emergency_mode ? reader.official_queries.slice(0, plan.emergency_mode ? 3 : fast ? 1 : 2) : [];
  const researchQ = plan.research_papers ? reader.academic_queries.slice(0, fast ? 1 : 3) : [];
  // Going straight to the original source when the Manager decided that's the best move
  const originalQ = plan.go_to_original ? (reader.original_queries || []).slice(0, 2) : [];
  // Never search nothing at all if there is a checkable claim
  if (!newsQ.length && !officialQ.length && !researchQ.length && !originalQ.length && reader.claims.length) newsQ = reader.claims.slice(0, 1);

  // Step 2: Search, analyze persuasion, and check the image, all at the same time
  const searchesPromise = Promise.all([
    ...originalQ.map((q) => searchWeb(q, { max_results: 5 }).then((list) => list.map((x) => ({ ...x, original: true })))),
    ...newsQ.map((q) => searchWeb(q, { topic: 'news' })),
    ...officialQ.map((q) => searchWeb(q)),
    ...researchQ.map((q) => searchResearch(q)),
  ]).then((results) => {
    mark('Searched news, official sources, and published research');
    return results;
  });

  const persuasionPromise = plan.persuasion
    ? generateText({
        model: quickModel,
        system: PERSUASION_PROMPT + lessonsFor(notebook, 'persuasion'),
        prompt: `${reader.content_summary}\n\nOriginal text:\n${text}`,
      }).then((r) => {
        mark('Analyzed persuasion tactics');
        return r.text;
      })
    : Promise.resolve('The Manager skipped the persuasion check for this one.');

  // Three independent image checks run at the same time; we keep the middle (median) answer,
  // so one odd answer can't flip the result.
  const imagePromise = photoChecks
    ? Promise.allSettled(
        [0, 1, 2].map(() =>
          generateText({
            model: MODEL,
            system: IMAGE_PROMPT + lessonsFor(notebook, 'image'),
            temperature: 0.3,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Check this image for warning signs of AI generation or editing.' },
                  { type: 'image', image },
                ],
              },
            ],
            output: Output.object({ schema: ImageSchema }),
          }).then((r) => r.output)
        )
      ).then((results) => {
        const runs = results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
        mark(`Checked the image for AI warning signs (${runs.length} independent checks)`);
        return combineImageChecks(runs);
      })
    : Promise.resolve(null);

  const comparePromise =
    photoChecks && plan.photo_comparison && reader.photo_search_query
      ? compareWithRealPhotos(image, reader.photo_search_query, MODEL, lessonsFor(notebook, 'comparison'))
          .then((r) => {
            mark(`Compared the photo with ${r.compared.length} real photos found online`);
            return r;
          })
          .catch((err) => {
            console.error('Photo comparison failed', err);
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
      if (!key || seen.has(key)) continue;
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
  mark(`Every agent read Vera's notebook (${notebook.rumors.length} past rumors, ${notebook.lessons.length} lessons)`);

  // Step 4: Weigh the evidence and write the answer
  const writerLanguage = LANGUAGE_NAMES[language !== 'auto' ? language : reader.language] || 'English';
  let story;
  if (toolName === 'facts') {
    const { output } = await generateText({
      model: quickModel,
      system: `${FACTS_PROMPT}${lessonsFor(notebook, 'writer')}\n\nRules you must follow:\n${RULES}`,
      prompt: `Audience: ${audience}
Language: ${writerLanguage}

The question: ${text || reader.content_summary}
What it's about: ${reader.content_summary}

Manager's game plan: ${plan.analysis}${plan.go_to_original && plan.original_source ? ` The Manager decided to go straight to the original source: ${plan.original_source}.` : ''}${plan.emergency_mode ? ' EMERGENCY MODE IS ON: lead with what official sources say, and point people to Miami-Dade Emergency Management and the National Weather Service for safety information.' : ''}

Vera's notebook (use only as hints; today's sources always win):
${notebookForPrompt(notebook)}

Sources found (${sources.length}):
${sourceList || 'No sources were found.'}`,
      output: Output.object({ schema: FactsSchema }),
    });
    story = output;
    mark('Weighed the evidence and wrote the answer');
  } else {
  const { output } = await generateText({
    model: quickModel,
    system: `${STORY_PROMPT}${lessonsFor(notebook, 'writer')}\n\nRules you must follow:\n${RULES}`,
    prompt: `Audience: ${audience}
Language: ${writerLanguage}

What the user sent (summary): ${reader.content_summary}
Who posted or wrote it (as shown in the content): ${reader.posted_by || 'not shown'}
Outlet bias rating: ${outlet ? `${outlet.domain} is rated ${outlet.category}` : 'not a rated outlet'}

Claims:
${reader.claims.join('\n')}

Manager's game plan: ${plan.analysis}${plan.emergency_mode ? ' EMERGENCY MODE IS ON: lead with what official sources say, and point people to Miami-Dade Emergency Management and the National Weather Service for safety information.' : ''}

Persuasion analysis:
${persuasion}

Vera's notebook (use only as hints; today's sources always win):
${notebookText}

Image check (including comparison with real photos online): ${imageCheck ? JSON.stringify(imageCheck) : image ? 'Not run here (the AI photo check is a separate mode). Judge the claims, not whether the photo is AI-made.' : 'No image was sent'}

Sources found (${sources.length}):
${sourceList || 'No sources were found.'}`,
    output: Output.object({ schema: StorySchema }),
  });
  story = output;
  mark('Weighed the evidence and wrote the real story');
  }


  // Step 5: A separate Reviewer agent double-checks the draft against the sources
  let review = null;
  try {
    const { output } = await generateText({
      model: quickModel,
      system: `${REVIEWER_PROMPT}${lessonsFor(notebook, 'reviewer')}\n\nRules the result must follow:\n${RULES}`,
      prompt: `Claims being checked:
${reader.claims.join('\n')}

Vera's draft result:
${JSON.stringify(
  toolName === 'facts'
    ? { answer: story.answer, details: story.details, consensus: story.consensus, original_source: story.original_source, breakdown: story.breakdown, key_source_ids: story.key_source_ids, note: 'This is an answer to a question, not a verdict on a post. Use corrected_real_story to fix the answer if needed; leave corrected_verdict null.' }
    : { verdict: story.verdict, real_story: story.real_story, consensus: story.consensus, right_and_wrong: story.right_and_wrong, key_source_ids: story.key_source_ids }
)}

Sources she had (${sources.length}):
${sourceList || 'No sources were found.'}`,
      output: Output.object({ schema: ReviewSchema }),
    });
    review = output;
    if (review && !review.approved) {
      if (toolName === 'facts') {
        if (review.corrected_real_story) story.answer = review.corrected_real_story;
      } else {
        if (review.corrected_verdict) story.verdict = review.corrected_verdict;
        if (review.corrected_real_story) story.real_story = review.corrected_real_story;
      }
    }
    mark(review?.approved ? 'A second AI double-checked the verdict and agreed' : 'A second AI double-checked the verdict and fixed it');
  } catch (err) {
    // If the double-check fails, still show Vera's answer rather than nothing
    console.error('Reviewer failed', err);
  }

  const keySources = (story.key_source_ids || [])
    .map((id) => sources.find((s) => s.id === id))
    .filter(Boolean);

  return {
    tool: toolName,
    outlet,
    result: story,
    review,
    keySources,
    sources: sources.map(({ snippet, ...rest }) => ({ ...rest, snippet: (snippet || '').slice(0, 300) })),
    stats,
    imageCheck,
    trace: {
      plan,
      topic: reader.topic_type,
      claims: reader.claims,
      queries: { original: originalQ, news: newsQ, official: officialQ, research: researchQ },
      timings,
    },
  };
}


// ─────────────────────────────────────────────────────────────
// 🤖 "Is this photo AI?" mode: only the photo agents run.
// Three Image agents score warning signs at the same time (we keep the median),
// a Photo Finder describes the scene and searches for real photos of it,
// the Comparison agent compares them, and the Photo Writer explains it simply.
// ─────────────────────────────────────────────────────────────
const DescribeSchema = z.object({
  description: z.string(),
  photo_search_query: z.string().nullable(),
  language: z.enum(['en', 'es', 'ht', 'zh', 'hi', 'ar', 'fr', 'bn']),
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

  const imagePromise = Promise.allSettled(
    [0, 1, 2].map(() =>
      generateText({
        model: MODEL,
        system: IMAGE_PROMPT + lessonsFor(notebook, 'image'),
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Check this image for warning signs of AI generation or editing.${context ? `\nWhat the user said about it: ${context}` : ''}` },
              { type: 'image', image },
            ],
          },
        ],
        output: Output.object({ schema: ImageSchema }),
      }).then((r) => r.output)
    )
  ).then((results) => {
    const runs = results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
    mark(`Checked the photo for AI warning signs (${runs.length} independent checks)`);
    return combineImageChecks(runs);
  });

  // The Photo Finder describes the scene and plans a search for real photos of it
  const comparePromise = generateText({
    model: FAST_MODEL,
    system:
      'You describe photos for a fact-checking app. Describe what the photo shows in one plain sentence. Then write a short web image search query (3 to 8 words) that would find REAL photos of the same scene, event, place, or subject, or null if a search would not help (for example a selfie or a plain meme). Also give the language of any text in the photo or the user\'s note (default en). Never include names of private people.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image },
          { type: 'text', text: context ? `The user said: ${context}` : 'No note from the user.' },
        ],
      },
    ],
    output: Output.object({ schema: DescribeSchema }),
  })
    .then(async ({ output: d }) => {
      mark('Described the photo and planned a search for real ones');
      if (!d?.photo_search_query) return { describe: d, comparison: null };
      try {
        const comparison = await compareWithRealPhotos(image, d.photo_search_query, MODEL, lessonsFor(notebook, 'comparison'));
        mark(`Compared the photo with ${comparison.compared.length} real photos found online`);
        return { describe: d, comparison };
      } catch (err) {
        console.error('Photo comparison failed', err);
        return { describe: d, comparison: null };
      }
    })
    .catch((err) => {
      console.error('Photo finder failed', err);
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
Write in ${LANGUAGE_NAMES[langCode] || 'English'}.`,
      prompt: JSON.stringify({
        level: check.level,
        plausibility: check.plausibility,
        plausibility_reason: check.plausibility_reason,
        signs: check.signs,
        note: check.note,
        comparison: comparison ? { match: comparison.match, effect: comparison.effect, text: comparison.comparison } : null,
        what_the_photo_shows: describe?.description || null,
        user_note: context || null,
      }),
      output: Output.object({ schema: PhotoSummarySchema }),
    });
    summary = output;
    mark('Wrote up the photo check');
  } catch (err) {
    console.error('Photo writer failed', err);
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
    photo: {
      ...check,
      headline: summary?.headline || check.level,
      explanation: summary?.explanation || check.note,
      tip: summary?.tip || 'Try a reverse image search to see where else this photo appears.',
      description: describe?.description || null,
    },
    trace: { timings },
  };
}
