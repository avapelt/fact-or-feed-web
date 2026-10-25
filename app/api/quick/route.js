// Used by the iPhone Shortcut: Share anything → Fact or Feed? → popup over the app you're in.
import { analyze } from '../check/analyze';

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
  let audience = 'teen';
  let language = 'auto';

  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    raw = String(form.get('text') || form.get('url') || '');
    audience = String(form.get('audience') || audience);
    language = String(form.get('language') || language);
    const file = form.get('image');
    if (file && typeof file !== 'string' && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      image = `data:${file.type || 'image/jpeg'};base64,${buf.toString('base64')}`;
    }
  } else {
    const body = await req.json();
    raw = body.text || body.url || '';
    image = body.image || null;
    audience = body.audience || audience;
    language = body.language || language;
  }

  return { ...splitInput(raw), image, audience, language };
}

export async function POST(req) {
  try {
    const input = await readRequest(req);
    const data = await analyze({ ...input, fast: true });
    const r = data.result;
    const total = data.sources?.length || 0;

    const lines = [];
    if (r.warning) lines.push(`⚠️ ${r.warning}`, '');
    lines.push(`${ICONS[r.verdict] || '❔'} ${r.verdict.toUpperCase()}`, '');
    lines.push(r.real_story, '');
    lines.push(`Consensus: ${r.consensus.level}${total ? ` · checked ${total} sources` : ''}`);
    if (data.imageCheck) {
      lines.push(`🤖 Image: ${data.imageCheck.level} (warning signs, not proof)`);
      if (data.imageCheck.plausibility) lines.push(`🎯 Scene: ${data.imageCheck.plausibility}`);
    }
    lines.push('', 'Tap OK for the full breakdown.');

    // The full result rides along in the link's #hash, so the website can show it
    // without running the check again. The hash never gets sent to the server.
    const origin = new URL(req.url).origin;
    const packed = Buffer.from(JSON.stringify(data)).toString('base64url');

    return Response.json({
      title: 'Fact or Feed?',
      message: lines.join('\n'),
      verdict: r.verdict,
      link: `${origin}/#r=${packed}`,
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
