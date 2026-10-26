// ✅ Checks that a /#r= result link was really made by Fact or Feed? (not edited or faked)
import { verifyPayload, MAX_PAYLOAD_CHARS } from '../check/safety';

export async function POST(req) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_CHARS + 1000) return Response.json({ valid: false }, { status: 413 });
    const { payload, sig } = JSON.parse(raw);
    return Response.json({ valid: verifyPayload(payload, sig) });
  } catch {
    return Response.json({ valid: false }, { status: 400 });
  }
}
