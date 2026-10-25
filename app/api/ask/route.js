// The Follow-up agent: answers questions about a report Vera already sent.
// It cites the sources it already has, and decides on its own to search again if they don't cover the question.
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { RULES, FOLLOWUP_PROMPT } from '../check/prompts';
import { searchWeb } from '../check/analyze';
import { categorize } from '../check/bias';
import { loadNotebook, lessonsFor } from '../check/notebook';

export const maxDuration = 120;

const MODEL = 'anthropic/claude-sonnet-4.5';

function sourceLine(s) {
  return `[${s.id}] ${s.category || 'Not rated'} | ${s.domain || ''} | ${s.date || 'date unknown'} | ${s.title}\n${s.snippet || ''}`;
}

export async function POST(req) {
  try {
    const { question, report, history = [], audience = 'everyone', language = 'auto' } = await req.json();
    const q = String(question || '').trim().slice(0, 1000);
    if (!q) return Response.json({ error: 'Ask a question about the report.' }, { status: 400 });

    const notebook = await loadNotebook();
    const known = (report?.sources || []).slice(0, 60);
    const extra = [];
    let nextId = known.reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;

    const searchNews = tool({
      description: 'Search news and official sources when the sources you already have do not answer the question.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const found = await searchWeb(query, { max_results: 6 });
        const labeled = found.map((s) => ({ ...s, ...categorize(s), id: nextId++, snippet: (s.snippet || '').slice(0, 300) }));
        extra.push(...labeled);
        return labeled.map(sourceLine).join('\n\n') || 'No results.';
      },
    });

    const r = report?.result || {};
    const context = `The report you sent:
Verdict: ${r.verdict}
Real story: ${r.real_story}
Consensus: ${r.consensus?.level} - ${r.consensus?.explanation}
Who posted it: ${r.who_posted ? `${r.who_posted.name || 'unknown'} (${r.who_posted.type})` : 'not given'}
What the post got wrong: ${(r.right_and_wrong || []).map((x) => `${x.post_says} -> ${x.actually}`).join('; ') || 'none'}
Persuasion tactics: ${(r.persuasion_tactics || []).map((t) => t.tactic).join(', ') || 'none'}
Still unknown: ${(r.unknown || []).join('; ') || 'none'}
Image check: ${report?.imageCheck ? JSON.stringify({ level: report.imageCheck.level, plausibility: report.imageCheck.plausibility, signs: report.imageCheck.signs, comparison: report.imageCheck.comparison?.comparison }) : 'no image'}
Double-check: ${report?.review ? `${report.review.approved ? 'approved' : 'corrected'}, confidence ${report.review.confidence}` : 'none'}

Sources you already have:
${known.map(sourceLine).join('\n\n') || 'none'}`;

    const messages = [
      { role: 'user', content: context },
      { role: 'assistant', content: 'Got it. I will answer follow-up questions using this report and these sources.' },
      ...history.slice(-6).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 2000) })),
      { role: 'user', content: `Audience: ${audience}. Language: ${language}.\nQuestion: ${q}` },
    ];

    const result = await generateText({
      model: MODEL,
      system: `${FOLLOWUP_PROMPT}${lessonsFor(notebook, 'followup')}\n\nRules you must follow:\n${RULES}`,
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
