import { generateText, Output } from 'ai';
import { z } from 'zod';
import { RULES, READER_PROMPT, PERSUASION_PROMPT, IMAGE_PROMPT, STORY_PROMPT } from './prompts';
import { categorize } from './bias';


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

const ReaderSchema = z.object({
  language: z.enum(['en', 'es', 'ht', 'zh', 'hi', 'ar', 'fr', 'bn']),
  content_summary: z.string(),
  claims: z.array(z.string()),
  topic_type: z.enum(['breaking_news', 'science_health', 'politics', 'scam', 'other']),
  news_queries: z.array(z.string()),
  official_queries: z.array(z.string()),
  academic_queries: z.array(z.string()),
});

const ImageSchema = z.object({
  level: z.enum(['Low chance of AI', 'Medium chance of AI', 'High chance of AI']),
  signs: z.array(z.string()),
  note: z.string(),
});

const StorySchema = z.object({
  warning: z.string().nullable(),
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

async function searchWeb(query, extra = {}) {
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

export async function analyze(input) {
  const start = Date.now();
  const timings = [];
  const mark = (label) =>
    timings.push({ label, seconds: Math.round((Date.now() - start) / 100) / 10 });

  const text = (input.text || '').slice(0, 6000);
  const url = (input.url || '').trim();
  const image = input.image || null;
  const audience = input.audience || 'teen';
  const fast = !!input.fast;
  const quickModel = fast ? FAST_MODEL : MODEL;
  const language = LANGUAGE_NAMES[input.language] ? input.language : 'auto';

  const content = [];
  if (text) content.push({ type: 'text', text: `The user was sent this:\n${text}` });
  if (url) content.push({ type: 'text', text: `Article from ${url}:\n${await readArticle(url)}` });
  if (image) content.push({ type: 'image', image });
  if (content.length === 0) {
    const e = new Error('Paste some text, a link, or add a screenshot.');
    e.status = 400;
    throw e;
  }

  // Step 1: Read the content and plan the searches
  const { output: reader } = await generateText({
    model: quickModel,
    system: READER_PROMPT,
    messages: [{ role: 'user', content }],
    output: Output.object({ schema: ReaderSchema }),
  });
  mark('Read the content and planned the searches');

  const newsQ = (reader.news_queries.length ? reader.news_queries : reader.claims).slice(0, fast ? 3 : 6);
  const officialQ = reader.official_queries.slice(0, fast ? 1 : 2);
  const researchQ = reader.academic_queries.slice(0, fast ? 1 : 3);

  // Step 2: Search, analyze persuasion, and check the image, all at the same time
  const searchesPromise = Promise.all([
    ...newsQ.map((q) => searchWeb(q, { topic: 'news' })),
    ...officialQ.map((q) => searchWeb(q)),
    ...researchQ.map((q) => searchResearch(q)),
  ]).then((results) => {
    mark('Searched news, official sources, and published research');
    return results;
  });

  const persuasionPromise = generateText({
    model: quickModel,
    system: PERSUASION_PROMPT,
    prompt: `${reader.content_summary}\n\nOriginal text:\n${text}`,
  }).then((r) => {
    mark('Analyzed persuasion tactics');
    return r.text;
  });

  const imagePromise = image
    ? generateText({
        model: MODEL,
        system: IMAGE_PROMPT,
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
      }).then((r) => {
        mark('Checked the image for AI warning signs');
        return r.output;
      })
    : Promise.resolve(null);

  const [searchResults, persuasion, imageCheck] = await Promise.all([
    searchesPromise,
    persuasionPromise,
    imagePromise,
  ]);

  // Step 3: Remove duplicates and label each source
  const seen = new Set();
  const all = [];
  for (const list of searchResults) {
    for (const s of list) {
      const key = (s.url || '').split('?')[0].replace(/\/$/, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      all.push({ ...s, ...categorize(s) });
    }
  }
  const sources = all.slice(0, 50).map((s, i) => ({ ...s, id: i + 1 }));

  const stats = {};
  for (const s of sources) stats[s.category] = (stats[s.category] || 0) + 1;

  const sourceList = sources
    .map(
      (s) =>
        `[${s.id}] ${s.category} | ${s.domain}${s.journal ? ' | ' + s.journal : ''} | ${s.date || 'date unknown'} | ${s.title}\n${s.snippet}`
    )
    .join('\n\n');

  // Step 4: Weigh the evidence and write the real story
  const { output: story } = await generateText({
    model: quickModel,
    system: `${STORY_PROMPT}\n\nRules you must follow:\n${RULES}`,
    prompt: `Audience: ${audience}
Language: ${LANGUAGE_NAMES[language !== 'auto' ? language : reader.language] || 'English'}

What the user sent (summary): ${reader.content_summary}

Claims:
${reader.claims.join('\n')}

Persuasion analysis:
${persuasion}

Image check: ${imageCheck ? JSON.stringify(imageCheck) : 'No image was sent'}

Sources found (${sources.length}):
${sourceList || 'No sources were found.'}`,
    output: Output.object({ schema: StorySchema }),
  });
  mark('Weighed the evidence and wrote the real story');

  const keySources = (story.key_source_ids || [])
    .map((id) => sources.find((s) => s.id === id))
    .filter(Boolean);

  return {
    result: story,
    keySources,
    sources: sources.map(({ snippet, ...rest }) => rest),
    stats,
    imageCheck,
    trace: {
      topic: reader.topic_type,
      claims: reader.claims,
      queries: { news: newsQ, official: officialQ, research: researchQ },
      timings,
    },
  };
}
