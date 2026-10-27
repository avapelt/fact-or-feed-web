# CLAUDE.md: rules for every Claude working on this repo

## What this is
**Fact or Feed?** is a free fact-checking website. Its AI, **Vera**, checks claims against real sources.
Mission: stop misinformation and give people real assurance. It must work for EVERYONE:
accessible, in 11 languages, and fast on cheap phones and slow connections.

Stack: Next.js (App Router) on Vercel, Anthropic models (Haiku + Sonnet), free-tier web search, Vercel Blob cache.

Key files:
- `app/api/check/analyze.js` - the check pipeline (search, read sources, write the verdict)
- `app/api/check/prompts.js` - Vera's instructions, including safety and self-harm rules
- `app/api/check/frontdesk.js` - sorts each message first (check, chat, blocked, self-harm)
- `app/api/check/safety.js` - evidence rules, link/photo safety, result signing
- `app/components/toolText.js` - every user-facing string, in all 11 languages
- `app/components/VeraChat.js` - the chat interface people use

## Who manages it
**Pacta** (the creator's Claude) coordinates all changes. The creator (GitHub `avapelt`) decides
WHAT changes. You are a collaborator: propose, build on a branch, and let Pacta and the creator review.

## 1. KEEP IT AS CHEAP AS POSSIBLE (top priority)
Every check is paid from a small prepaid AI credit and free search tiers. Money is very tight.
- Never add paid services, new AI vendors, or pricier models.
- Don't add extra AI calls per check. Sonnet is ONLY for the verdict Writer and follow-ups;
  everything else uses Haiku.
- Keep search caps as they are and keep the result cache.
- Avoid Vercel Blob `list` and other advanced operations (Hobby plan limits).
- Don't call the production APIs while testing - each call costs real money.
- If a change could raise costs at all, ask the creator first.

## 2. Content rules (Vera's answers)
- Never use or cite Wikipedia.
- One single Sources list per answer.
- Never answer yes/no on, or predict, future outcomes (e.g. elections).
- Stay politically neutral.
- Answer the exact question asked, using only what the sources say.
- The safety and self-harm rules in `prompts.js` must never be weakened.
- Privacy: never store user text. Logs keep only the error name and message.

## 3. How to make a change
1. Check open PRs first (`gh pr list`) so you don't clash with Pacta's work.
2. Work on your own branch. `main` is protected - nothing goes to it directly.
3. Keep PRs small and focused on one thing.
4. Every new user-facing string goes in `toolText.js` in all 11 languages.
5. Colors must keep at least 4.5:1 contrast.
6. Run `npx next build` before pushing; it must pass.
7. Open a pull request with a clear plain-English description: what changed and why.
8. Pacta's reviewer checks every PR for clashes. PR comments are how the Claudes talk
   to each other - read them and reply to them.

## 4. Don't
- Don't push to `main`.
- Don't merge your own PR without the creator's OK.
- Don't rewrite history (no force-push, no rebasing shared branches).
- Don't commit `.env` files, secrets, or `.DS_Store`.
