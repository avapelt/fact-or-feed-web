// 📒 Vera's notebook, kept by the Bookkeeper agent.
// It remembers anonymous notes about rumors Vera has checked and lessons from her mistakes,
// shared across all chats, so she gets better over time.
// PRIVACY: it never stores names of private people, @handles, phone numbers, emails, addresses,
// the user's own words, links to what they sent, or photos.
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { get, put } from '@vercel/blob';

const PATH = 'notebook/vera-notebook.json';
const MAX_RUMORS = 200;
const MAX_LESSONS = 40;

const EMPTY = { rumors: [], lessons: [] };

// Second safety net: strip anything that looks personal, even if the AI missed it
export function scrub(text) {
  return String(text || '')
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/@[A-Za-z0-9_.]{2,}/g, '[account]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .slice(0, 300)
    .trim();
}

export async function loadNotebook() {
  try {
    const res = await get(PATH, { access: 'public', useCache: false });
    if (!res || res.statusCode !== 200) return { ...EMPTY };
    const data = JSON.parse(await new Response(res.stream).text());
    return { rumors: data.rumors || [], lessons: data.lessons || [] };
  } catch {
    return { ...EMPTY };
  }
}

async function saveNotebook(nb) {
  await put(PATH, JSON.stringify(nb), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

// What Vera reads before a new check
export function notebookForPrompt(nb) {
  const rumors = nb.rumors
    .slice(-60)
    .map((r) => `- [${r.id}] "${r.claim}" → ${r.verdict}${r.key_fact ? ` (${r.key_fact})` : ''}${r.times_seen > 1 ? ` · seen ${r.times_seen} times` : ''}`)
    .join('\n');
  const lessons = nb.lessons
    .slice(-MAX_LESSONS)
    .map((l) => `- ${l.text}`)
    .join('\n');
  return `Rumors checked before (anonymous notes):\n${rumors || 'none yet'}\n\nLessons learned from past mistakes:\n${lessons || 'none yet'}`;
}

const BOOKKEEPER_PROMPT = `
You are the Bookkeeper for "Fact or Feed?". You keep Vera's notebook: short, anonymous notes that help her get better over time.

Write notes in GENERAL terms. NEVER include: names of private people, usernames or @handles, phone numbers, emails, street addresses, school or workplace of a specific private person, links, or the user's exact words. Public organizations, public officials, places like cities or counties, and well-known public figures are fine.

You get the claims Vera just checked, her final verdict, and any corrections. You also get the list of rumors already in the notebook.
- entries: for each main claim (at most 2), a general one-sentence version of the claim, the verdict, one key fact from the evidence, and matches_id: the id of an existing notebook rumor that is the SAME claim, or null if it's new.
- lesson: ONLY if something went wrong (the Reviewer corrected Vera, or the user said the answer was wrong), one short, general lesson that would help Vera avoid the same mistake next time. Otherwise null.
`;

const BookSchema = z.object({
  entries: z.array(
    z.object({
      claim: z.string(),
      verdict: z.string(),
      key_fact: z.string(),
      matches_id: z.number().nullable(),
    })
  ),
  lesson: z.string().nullable(),
});

// Runs after a check (in the background, so it never slows Vera down)
export async function bookkeep({ model, claims, verdict, realStory, review, feedback }) {
  try {
    const nb = await loadNotebook();
    const existing = nb.rumors.slice(-60).map((r) => `[${r.id}] ${r.claim}`).join('\n');
    const { output } = await generateText({
      model,
      system: BOOKKEEPER_PROMPT,
      temperature: 0.2,
      prompt: `Claims checked:\n${(claims || []).join('\n')}

Final verdict: ${verdict}
Real story: ${realStory || ''}
Reviewer: ${review ? `${review.approved ? 'approved' : 'corrected'}; issues: ${(review.issues || []).join('; ') || 'none'}` : 'none'}
User feedback: ${feedback ? `${feedback.correct ? 'said it was right' : 'said it was WRONG'}${feedback.note ? `; their note: ${feedback.note}` : ''}` : 'none'}

Rumors already in the notebook:
${existing || 'none'}`,
      output: Output.object({ schema: BookSchema }),
    });

    const now = new Date().toISOString().slice(0, 10);
    let nextId = nb.rumors.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    for (const e of (output?.entries || []).slice(0, 2)) {
      const match = e.matches_id != null && nb.rumors.find((r) => r.id === e.matches_id);
      if (match) {
        match.times_seen = (match.times_seen || 1) + (feedback ? 0 : 1);
        match.verdict = scrub(e.verdict);
        match.key_fact = scrub(e.key_fact);
        match.last_seen = now;
      } else if (!feedback) {
        nb.rumors.push({ id: nextId++, claim: scrub(e.claim), verdict: scrub(e.verdict), key_fact: scrub(e.key_fact), times_seen: 1, last_seen: now });
      }
    }
    if (output?.lesson) nb.lessons.push({ text: scrub(output.lesson), from: feedback ? 'user feedback' : 'reviewer', date: now });

    nb.rumors = nb.rumors.slice(-MAX_RUMORS);
    nb.lessons = nb.lessons.slice(-MAX_LESSONS);
    await saveNotebook(nb);
    return { saved: true, lesson: output?.lesson ? scrub(output.lesson) : null };
  } catch (err) {
    console.error('Bookkeeper failed', err);
    return { saved: false, lesson: null };
  }
}
