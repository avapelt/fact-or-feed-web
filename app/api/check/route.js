import { analyze } from './analyze';

export const maxDuration = 300;

export async function POST(req) {
  try {
    const body = await req.json();
    return Response.json(await analyze(body));
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: err?.status === 400 ? err.message : 'Something went wrong: ' + (err?.message || 'unknown error') },
      { status: err?.status || 500 }
    );
  }
}
