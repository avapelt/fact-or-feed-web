// 📋 Read-only list for the creator's reviewer: suggested lessons waiting for review,
// plus the old lessons from the notebook (no longer used by the agents).
// Everything here was already scrubbed of personal details. Nothing is written.
import { loadNotebook, loadPendingLessons } from '../../check/notebook';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [pending, notebook] = await Promise.all([loadPendingLessons(), loadNotebook()]);
  return Response.json(
    { pending, legacy: notebook.lessons || [], note: 'Only lessons committed in app/api/check/approved-lessons.js are used by the agents.' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
