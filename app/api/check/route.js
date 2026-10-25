import { del } from '@vercel/blob';
import { analyze } from './analyze';

export const maxDuration = 300;

// Only photos saved by our own /api/share upload are allowed here
function isOurPhoto(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export async function POST(req) {
  let imageUrl = null;
  try {
    const body = await req.json();

    // A photo shared from the iPhone Shortcut arrives as a link to our photo storage
    if (!body.image && body.imageUrl && isOurPhoto(body.imageUrl)) {
      imageUrl = body.imageUrl;
      const res = await fetch(imageUrl);
      const type = res.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await res.arrayBuffer());
      body.image = `data:${type};base64,${buf.toString('base64')}`;
    }

    return Response.json(await analyze(body));
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err?.status === 400 ? err.message : 'Something went wrong: ' + (err?.message || 'unknown error') },
      { status: err?.status || 500 }
    );
  } finally {
    // Privacy: delete the shared photo once we've checked it
    if (imageUrl) await del(imageUrl).catch(() => {});
  }
}
