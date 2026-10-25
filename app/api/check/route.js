import { generateText, Output, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import {
  RULES,
  READER_PROMPT,
  PERSUASION_PROMPT,
  RESEARCHER_PROMPT,
  STORY_PROMPT,
} from './prompts';

export const maxDuration = 300;

const MODEL = 'anthropic/claude-sonnet-4.5';

const ReaderSchema = z.object({
  language: z.enum(['en', 'es', 'ht']),
  content_summary: z.string(),
  claims: z.array(z.string()),
});

const StorySchema = z.object({
  warning: z.string().nullable(),
  verdict: z.string(),
  real_story: z.string(),
  right_and_wrong: z.array(z.object({ post_says: z.string(), actually: z.string() })),
  disputed: z.array(z.string()),
  unknown: z.array(z.string()),
  persuasion_tactics: z.array(
    z.object({ tactic: z.string(), where: z.string(), explanation: z.string() })
  ),
  how_we_figured_it_out: z.array(z.string()),
  reply_draft: z.string(),
  sources: z.array(z.object({ outlet: z.string(), url: z.string() })),
});

const searchNews = tool({
  description: 'Search news websites and official sources about a claim.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 6 }),
    });
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      summary: (r.content || '').slice(0, 800),
      date: r.published_date || 'unknown',
    }));
  },
});

async function readArticle(url) {
  try {
    const html = await (await fetch(url)).text();
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 12000);
  } catch {
    return 'Could not open this link.';
  }
}

export async function POST(req) {
  try {
    const { text, url, image, audience, language } = await req.json();

    const content = [];
    if (text) content.push({ type: 'text', text: `The user was sent this:\n${text}` });
    if (url) content.push({ type: 'text', text: `Article from ${url}:\n${await readArticle(url)}` });
    if (image) content.push({ type: 'image', image });
    if (content.length === 0) {
      return Response.json({ error: 'Paste some text, a link, or add a screenshot.' }, { status: 400 });
    }

    // Step 1: Reader
    const { output: reader } = await generateText({
      model: MODEL,
      system: READER_PROMPT,
      messages: [{ role: 'user', content }],
      output: Output.object({ schema: ReaderSchema }),
    });

    // Steps 2 and 3: Persuasion Spotter and Researcher at the same time
    const [persuasion, research] = await Promise.all([
      generateText({
        model: MODEL,
        system: PERSUASION_PROMPT,
        prompt: reader.content_summary,
      }),
      generateText({
        model: MODEL,
        system: RESEARCHER_PROMPT,
        prompt: `Claims to check:\n${reader.claims.join('\n')}`,
        tools: { searchNews },
        stopWhen: stepCountIs(8),
      }),
    ]);

    // Step 4: Story Writer
    const { output: story } = await generateText({
      model: MODEL,
      system: `${STORY_PROMPT}\n\nRules you must follow:\n${RULES}`,
      prompt: JSON.stringify({
        reader,
        persuasion: persuasion.text,
        research: research.text,
        audience: audience || 'teen',
        language: language && language !== 'auto' ? language : reader.language,
      }),
      output: Output.object({ schema: StorySchema }),
    });

    return Response.json({ result: story });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: 'Something went wrong. Try pasting the text instead.' },
      { status: 500 }
    );
  }
}
