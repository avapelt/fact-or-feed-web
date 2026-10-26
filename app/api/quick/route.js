// Used by the iPhone Shortcut: Share anything → Fact or Feed? → popup over the app you're in.
import { after } from 'next/server';
import { analyze } from '../check/analyze';
import { cacheKeyFor, readCached, saveCached } from '../check/cache';
import { checkImageField, signPayload, photoTooBig, sniffImageType, MAX_IMAGE_BYTES } from '../check/safety';

export const maxDuration = 300;

const ICONS = {
  Accurate: '✅',
  'Missing context': '🟡',
  Exaggerated: '🟠',
  Misleading: '🟠',
  False: '❌',
  "Can't confirm yet": '❔',
};

function splitInput(raw) {
  const value = (raw || '').trim();
  const match = value.match(/https?:\/\/\S+/i);
  if (!match) return { text: value, url: '' };
  if (match[0] === value) return { text: '', url: value };
  return { text: value, url: match[0] };
}

async function readRequest(req) {
  const type = req.headers.get('content-type') || '';
  let raw = '';
  let image = null;
  let audience = 'everyone';
  let language = 'auto';

  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    raw = String(form.get('text') || form.get('url') || '');
    audience = String(form.get('audience') || audience);
    language = String(form.get('language') || language);
    const file = form.get('image');
    if (file && typeof file !== 'string' && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) throw photoTooBig();
      const buf = Buffer.from(await file.arrayBuffer());
      // Use the real type from the file's first bytes (the Shortcut may not label it)
      image = `data:${sniffImageType(buf) || file.type || 'image/jpeg'};base64,${buf.toString('base64')}`;
    }
  } else {
    const body = await req.json();
    raw = body.text || body.url || '';
    image = body.image || null;
    audience = String(body.audience || audience).slice(0, 20);
    language = String(body.language || language).slice(0, 10);
  }

  // Only normal photos (JPEG, PNG, WebP, GIF, HEIC) of a reasonable size
  return { ...splitInput(raw.slice(0, 7000)), image: checkImageField(image), audience, language };
}

export async function POST(req) {
  try {
    const input = await readRequest(req);
    // 💾 The same check in the last few hours: reuse the saved result instead of paying again
    const key = cacheKeyFor('check', { ...input, fast: true });
    const saved = await readCached(key);
    const data = saved || (await analyze({ ...input, fast: true }));
    if (!saved) after(() => saveCached(key, data));
    // A hello, or something Vera won't look up: show her short reply in the popup
    if (data.chat) {
      return Response.json({ title: 'Fact or Feed?', message: data.chat.reply, verdict: null, link: new URL(req.url).origin });
    }
    const r = data.result;
    const total = data.sources?.length || 0;

    const lines = [];
    if (r.warning) lines.push(`⚠️ ${r.warning}`, '');
    lines.push(`${ICONS[r.verdict] || '❔'} ${r.verdict.toUpperCase()}`, '');
    lines.push(r.real_story, '');
    lines.push(`Consensus: ${r.consensus.level}${total ? ` · checked ${total} sources` : ''}`);
    if (data.review) lines.push(`✅ Double-checked by a second AI (confidence: ${data.review.confidence})`);
    if (r.who_posted) {
      lines.push(`✍️ Posted by: ${r.who_posted.name || 'unknown'} (${r.who_posted.type})`);
    }
    if (data.imageCheck) {
      lines.push(`🤖 Image: ${data.imageCheck.level} (warning signs, not proof)`);
      if (data.imageCheck.plausibility) lines.push(`🎯 Scene: ${data.imageCheck.plausibility}`);
    }
    if (data.cached && data.checked_at) {
      const minutes = Math.max(0, Math.round((Date.now() - Date.parse(data.checked_at)) / 60000));
      lines.push(`🕒 Checked ${minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`} (saved result)`);
    }
    lines.push('', 'Tap OK for the full breakdown.');

    // The full result rides along in the link's #hash, so the website can show it
    // without running the check again. It is signed, so nobody can make a fake result link:
    // the website asks /api/verify-result before showing it.
    const origin = new URL(req.url).origin;
    const packed = Buffer.from(JSON.stringify(data)).toString('base64url');
    const sig = signPayload(packed);

    return Response.json({
      title: 'Fact or Feed?',
      message: lines.join('\n'),
      verdict: r.verdict,
      // If the result is too big to verify (or can't be signed), just open the site
      link: sig && packed.length <= 200 * 1024 ? `${origin}/#r=${packed}.${sig}` : origin,
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      {
        title: 'Fact or Feed?',
        message:
          err?.status === 400
            ? err.message
            : "Sorry, I couldn't check that one. Try sharing a screenshot instead.",
        verdict: null,
        // Always send a real link so the Shortcut's "Open URLs" step never breaks
        link: new URL(req.url).origin,
      },
      // Always 200 so the iPhone Shortcut still shows the message in its popup
      { status: 200 }
    );
  }
}
