import { del } from '@vercel/blob';
import { isOurPhoto, fetchOurPhoto, checkImageField, badRequest } from './safety';
import { after } from 'next/server';
import { analyze, FAST_MODEL } from './analyze';
import { bookkeep } from './notebook';
import { cacheKeyFor, readCached, saveCached } from './cache';

import { blockBots, logError } from './guard';

export const maxDuration = 300;

export async function POST(req) {
  // 🤖 Browser-only route: simple bots are turned away (BotID, free Basic mode)
  const blocked = await blockBots();
  if (blocked) return blocked;
  let imageUrl = null;
  try {
    const body = await req.json();

    // A photo shared from the iPhone Shortcut arrives as a link to our photo storage
    // Only photos from OUR store's shares/ folder are accepted (and later deleted)
    if (!body.image && body.imageUrl) {
      if (!isOurPhoto(body.imageUrl)) throw badRequest("I couldn't open that shared photo. Try sharing it again.");
      imageUrl = new URL(body.imageUrl).href;
      body.image = await fetchOurPhoto(imageUrl);
    } else {
      body.image = checkImageField(body.image);
    }

    // 💾 The same check in the last few hours? Answer from the saved result (no AI calls, no searches).
    // No Bookkeeper either: the notebook already learned from the first check.
    const key = cacheKeyFor('check', body);
    const saved = await readCached(key);
    if (saved) return Response.json(saved);

    const data = await analyze(body);
    after(() => saveCached(key, data));

    // 📒 The Bookkeeper writes an anonymous note in Vera's notebook after the answer is sent.
    // Skipped when the code forced "Can't confirm yet" (search down or too few sources),
    // so an outage never gets remembered as a result.
    if (!data.chat && !data.trace?.search?.forced) after(() =>
      bookkeep({
        model: FAST_MODEL,
        claims: data.trace?.claims,
        verdict: data.result?.verdict || `answer (consensus: ${data.result?.consensus?.level || 'unknown'})`,
        realStory: data.result?.real_story || data.result?.answer,
        review: data.review,
      })
    );

    return Response.json(data);
  } catch (err) {
    logError('Check failed', err);
    return Response.json(
      { error: err?.status === 400 ? err.message : 'Something went wrong. Please try again in a moment.' },
      { status: err?.status || 500 }
    );
  } finally {
    // Privacy: delete the shared photo once we've checked it (only ever our own shares/ photos)
    if (imageUrl && isOurPhoto(imageUrl)) await del(imageUrl).catch(() => {});
  }
}
