// The Follow-up agent: answers questions about a report Vera already sent.
// It cites the sources it already has, and decides on its own to search again if they don't cover the question.
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { RULES, FOLLOWUP_PROMPT } from '../check/prompts';
import { searchWeb } from '../check/analyze';
import { categorize } from '../check/bias';
import { loadNotebook, lessonsFor } from '../check/notebook';
import { dateRule, isBlockedSource } from '../check/safety';

export const maxDuration = 120;

const MODEL = 'anthropic/claude-sonnet-4.5';

// The report comes from the user's browser, so we never trust its size:
// every string, list, and nested object is cut down before it reaches the AI.
const FIELD_LIMITS = { title: 200, snippet: 400, real_story: 2000, answer: 2000, details: 2000, question: 1000 };
const LIST_LIMITS = { sources: 30 };

function clip(value, key = '', depth = 0) {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.slice(0, FIELD_LIMITS[key] || 500);
  if (depth > 4) return null;
  if (Array.isArray(value)) return value.slice(0, LIST_LIMITS[key] || 12).map((v) => clip(v, key === 'sources' ? '' : key, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).slice(0, 40)) out[k] = clip(value[k], k, depth + 1);
    return out;
  }
  return null;
}

function sourceLine(s) {
  return `[${s.id}] ${s.category || 'Not rated'} | ${s.domain || ''} | ${s.date || 'date unknown'} | ${s.title}\n${s.snippet || ''}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const q = String(body?.question || '').trim().slice(0, 1000);
    const report = clip(body?.report && typeof body.report === 'object' ? body.report : {});
    const history = (Array.isArray(body?.history) ? body.history : [])
      .slice(-6)
      .map((m) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content || '').slice(0, 2000) }));
    const audience = String(body?.audience || 'everyone').slice(0, 20);
    const language = String(body?.language || 'auto').slice(0, 10);
    if (!q) return Response.json({ error: 'Ask a question about the report.' }, { status: 400 });

    const notebook = await loadNotebook();
    const known = (Array.isArray(report?.sources) ? report.sources : []).filter((s) => s && typeof s === 'object' && !isBlockedSource(s.url)).slice(0, 30);
    const extra = [];
    let nextId = known.reduce((m, s) => Math.max(m, Number(s?.id) || 0), 0) + 1;

    const searchNews = tool({
      description: 'Search news and official sources when the sources you already have do not answer the question.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const track = { tried: 0, failed: 0 };
        const found = await searchWeb(String(query).slice(0, 300), { max_results: 6 }, track);
        if (track.failed) return 'The search is not working right now. Do NOT guess: tell the user you could not search for this right now and they can try again in a few minutes.';
        const labeled = found.map((s) => ({ ...s, ...categorize(s), id: nextId++, snippet: (s.snippet || '').slice(0, 300) }));
        extra.push(...labeled);
        return labeled.map(sourceLine).join('\n\n') || 'No results.';
      },
    });

    const r = report?.result || {};
    let summary;
    if (report?.tool === 'photo') {
      const p = report.photo || {};
      summary = `The AI photo check you sent:
Result: ${p.level} (${p.headline || ''})
Why: ${p.explanation || ''}
What the photo shows: ${p.description || 'unknown'}
How believable the scene is: ${p.plausibility || ''} ${p.plausibility_reason || ''}
Warning signs: ${(p.signs || []).join('; ') || 'none'}
Comparison with real photos: ${p.comparison ? `${p.comparison.match}, ${p.comparison.effect}: ${p.comparison.comparison}` : 'none'}
${p.checks ? `${p.agree} of ${p.checks} checks agreed.` : ''}
Remember: warning signs are not proof; never say a photo is definitely AI or definitely real.`;
    } else if (report?.tool === 'facts') {
      summary = `The answer you sent (Find the facts):
Question: ${report.question || ''}
Answer: ${r.answer}
Details: ${r.details}
Consensus: ${r.consensus?.level} - ${r.consensus?.explanation}
Original source: ${r.original_source ? `${r.original_source.name}: ${r.original_source.what_it_says}` : 'none'}
${r.reframed ? `Note on the question: ${r.reframed}
` : ''}Still unknown: ${(r.unknown || []).join('; ') || 'none'}
Double-check: ${report?.review ? `${report.review.approved ? 'approved' : 'corrected'}, confidence ${report.review.confidence}` : 'none'}`;
    } else {
      summary = `The credibility report you sent:
Accuracy verdict: ${r.verdict}
Real story: ${r.real_story}
Consensus: ${r.consensus?.level} - ${r.consensus?.explanation}
Outlet and its lean: ${report?.outlet ? `${report.outlet.domain} (${report.outlet.category})` : 'not a rated outlet'}${r.bias_note ? ` - ${r.bias_note}` : ''}
Who posted it: ${r.who_posted ? `${r.who_posted.name || 'unknown'} (${r.who_posted.type})` : 'not given'}
What the post got wrong: ${(r.right_and_wrong || []).map((x) => `${x.post_says} -> ${x.actually}`).join('; ') || 'none'}
Persuasion tactics: ${(r.persuasion_tactics || []).map((t) => `${t.tactic}: ${t.explanation}`).join('; ') || 'none'}
Still unknown: ${(r.unknown || []).join('; ') || 'none'}
Image check: ${report?.imageCheck ? JSON.stringify({ level: report.imageCheck.level, plausibility: report.imageCheck.plausibility, signs: report.imageCheck.signs }) : 'none'}
Double-check: ${report?.review ? `${report.review.approved ? 'approved' : 'corrected'}, confidence ${report.review.confidence}` : 'none'}
Remember: an outlet's lean does not make it true or false.`;
    }
    const context = `${summary}

Sources you already have:
${known.map(sourceLine).join('\n\n') || 'none'}`;

    const messages = [
      { role: 'user', content: context },
      { role: 'assistant', content: 'Got it. I will answer follow-up questions using this report and these sources.' },
      ...history,
      { role: 'user', content: `Audience: ${audience}. Language: ${language}.\nQuestion: ${q}` },
    ];

    // Only one clarifying question per conversation, so it stays easy for the user
    const alreadyAsked = history.some(
      (m) => m.role === 'assistant' && (/Clarifying question I asked/.test(m.content || '') || /\?\s*$/.test(String(m.content || '').trim()))
    );
    const noMoreQuestions = alreadyAsked
      ? '\n\nIMPORTANT: A clarifying question was already asked in this conversation. Do NOT ask any more questions. Give your best final answer now.'
      : '';

    const result = await generateText({
      model: MODEL,
      system: `${FOLLOWUP_PROMPT}${lessonsFor(notebook, 'followup')}${dateRule()}${noMoreQuestions}\n\nRules you must follow:\n${RULES}`,
      messages,
      tools: { searchNews },
      stopWhen: stepCountIs(4),
    });

    const answer = (result.text || '').trim() || "Sorry, I couldn't come up with an answer. Try asking a different way.";
    const all = [...known, ...extra];
    const citedIds = [...new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))];
    const cited = citedIds
      .map((id) => all.find((s) => s.id === id))
      .filter(Boolean)
      .map(({ snippet, ...rest }) => rest);

    return Response.json({ answer, cited, searchedAgain: extra.length > 0, newSources: extra.map(({ snippet, ...rest }) => ({ ...rest, snippet })) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Something went wrong: ' + (err?.message || 'unknown error') }, { status: 500 });
  }
}
