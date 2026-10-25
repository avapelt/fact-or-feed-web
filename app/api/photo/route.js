// 🤖 "Is this photo AI?" mode: runs only the photo agents.
import { del } from '@vercel/blob';
import { isOurPhoto, fetchOurPhoto, checkImageField, badRequest } from '../check/safety';
import { checkPhoto } from '../check/analyze';

export const maxDuration = 300;

export async function POST(req) {
  let imageUrl = null;
  try {
    const body = await req.json();
    // Only photos from OUR store's shares/ folder are accepted (and later deleted)
    if (!body.image && body.imageUrl) {
      if (!isOurPhoto(body.imageUrl)) throw badRequest("I couldn't open that shared photo. Try sharing it again.");
      imageUrl = new URL(body.imageUrl).href;
      body.image = await fetchOurPhoto(imageUrl);
    } else {
      body.image = checkImageField(body.image);
    }
    return Response.json(await checkPhoto(body));
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
