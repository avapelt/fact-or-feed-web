// 👍/👎 feedback: the Bookkeeper turns a "that was wrong" into a SUGGESTED lesson.
// It waits in a pending list for the creator to review; it never changes Vera by itself,
// and feedback never changes what the notebook says about a rumor.
// Only the general claim and the lesson are kept, never personal details.
import { bookkeep } from '../check/notebook';
import { FAST_MODEL } from '../check/analyze';

import { blockBots, logError } from '../check/guard';

export const maxDuration = 60;

const clip = (v, n) => String(v ?? '').slice(0, n);

export async function POST(req) {
  const blocked = await blockBots();
  if (blocked) return blocked;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ ok: false, error: 'Bad request.' }, { status: 400 });
    const { claims, verdict, realStory, correct, note, area } = body;

    const list = Array.isArray(claims) ? claims.slice(0, 3).map((c) => clip(c, 300).trim()).filter(Boolean) : [];
    if (!list.length) return Response.json({ ok: false, error: 'Nothing to give feedback on.' }, { status: 400 });

    // A 👍 doesn't need a lesson, so we skip the AI call entirely
    if (correct === true) return Response.json({ ok: true, lesson: null, job: null });

    const result = await bookkeep({
      model: FAST_MODEL,
      claims: list,
      verdict: clip(verdict, 100),
      realStory: clip(realStory, 600),
      feedback: { correct: false, note: clip(note, 400), area: clip(area, 60) },
    });
    return Response.json({ ok: result.saved, lesson: result.lesson, job: result.job, pending: true });
  } catch (err) {
    logError('Feedback failed', err);
    return Response.json({ ok: false });
  }
}
