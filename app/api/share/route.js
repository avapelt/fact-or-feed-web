// Used by the iPhone "Fact or Feed? (photo)" Shortcut.
// It quickly saves the shared photo and hands back a link that opens the chat
// and starts checking it. The photo is deleted again once the check finishes.
import { put } from '@vercel/blob';

export const maxDuration = 60;

export async function POST(req) {
  const origin = new URL(req.url).origin;
  try {
    const form = await req.formData();
    const file = form.get('image');
    const text = String(form.get('text') || '').trim();

    const params = new URLSearchParams();
    if (text) params.set('q', text);

    if (file && typeof file !== 'string' && file.size > 0) {
      if (file.size > 4 * 1024 * 1024) {
        return Response.json({ link: origin, error: 'That photo is too big. Try a screenshot instead.' });
      }
      const blob = await put(`shares/photo-${Date.now()}.jpg`, file, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || 'image/jpeg',
      });
      params.set('img', blob.url);
    }

    const query = params.toString();
    return Response.json({ link: query ? `${origin}/?${query}` : origin });
  } catch (err) {
    console.error(err);
    // Always return a usable link so the Shortcut never breaks
    return Response.json({ link: origin, error: 'Could not upload that photo.' });
  }
}
