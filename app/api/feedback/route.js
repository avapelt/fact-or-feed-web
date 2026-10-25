// 👍/👎 feedback: the Bookkeeper turns a "that was wrong" into a lesson in Vera's notebook.
// Only the general claim and the lesson are kept, never personal details.
import { bookkeep } from '../check/notebook';

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { claims, verdict, realStory, correct, note } = await req.json();
    const result = await bookkeep({
      model: 'anthropic/claude-haiku-4.5',
      claims: Array.isArray(claims) ? claims.slice(0, 3).map((c) => String(c).slice(0, 300)) : [],
      verdict,
      realStory: String(realStory || '').slice(0, 600),
      feedback: { correct: !!correct, note: String(note || '').slice(0, 400) },
    });
    return Response.json({ ok: result.saved, lesson: result.lesson });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false });
  }
}
