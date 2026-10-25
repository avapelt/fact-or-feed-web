import { del } from '@vercel/blob';
import { isOurPhoto, fetchOurPhoto, checkImageField, badRequest } from './safety';
import { after } from 'next/server';
import { analyze } from './analyze';
import { bookkeep } from './notebook';

export const maxDuration = 300;

export async function POST(req) {
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

    const data = await analyze(body);

    // 📒 The Bookkeeper writes an anonymous note in Vera's notebook after the answer is sent
    after(() =>
      bookkeep({
        model: 'anthropic/claude-haiku-4.5',
        claims: data.trace?.claims,
        verdict: data.result?.verdict || `answer (consensus: ${data.result?.consensus?.level || 'unknown'})`,
        realStory: data.result?.real_story || data.result?.answer,
        review: data.review,
      })
    );

    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err?.status === 400 ? err.message : 'Something went wrong: ' + (err?.message || 'unknown error') },
      { status: err?.status || 500 }
    );
  } finally {
    // Privacy: delete the shared photo once we've checked it (only ever our own shares/ photos)
    if (imageUrl && isOurPhoto(imageUrl)) await del(imageUrl).catch(() => {});
  }
}
