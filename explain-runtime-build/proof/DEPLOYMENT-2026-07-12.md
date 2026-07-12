# Deployment Separation & Production Verification — 2026-07-12

Command D of the v1.1 Amendment. Pattern chosen: **B — one Netlify project
with explicit, stable product routes** (`src/routeGate.ts` is deterministic;
neither direct URL can fall back to the other product).

## Entry points

| Product | Stable production URL |
| --- | --- |
| LDS Teacher Preparation | https://companion-prototype-erw.netlify.app/teacher |
| ADL Companion | https://companion-prototype-erw.netlify.app/companion/prototype |
| Product selector (root) | https://companion-prototype-erw.netlify.app/ |

## Verification (via the Netlify API and in-browser walkthroughs)

1. **Deploy contains the expected commit** — production deploy
   `6a53ca2ca5eeeb000836be6f` (context: `production`, branch `main`) = commit
   `c532d9f` "Merge pull request #22". Auto-publishing is functioning again
   (this is a real production-context deploy, not the earlier manually
   published preview). PR deploy previews for the two new branches built
   green (`deploy-preview-23`, `deploy-preview-24`).
2. **Build command / publish dir** — `netlify.toml`: build
   `cd explain-runtime-build && pnpm install --ignore-workspace && npm run build`,
   publish `explain-runtime-build/dist`, functions `netlify/functions`. Correct.
3. **SPA redirects** — `public/_redirects` serves the shell for every path;
   `/teacher` and `/companion/*` deep links and refresh both load the right
   surface (each walkthrough navigates directly to those paths in fresh
   pages — deep-link + refresh proof).
4. **Environment variables scoped correctly** — exactly one env var:
   `DEEPGRAM_API_KEY` (secret, masked) with scopes builds/functions/runtime.
   It is used only by the Companion `deepgram-token` function; it is not a
   `VITE_`-prefixed var so it can never enter the client bundle; the LDS
   surface and its `cfm-current` function need no secrets.
5. **Production and branch deploys do not cross-route** — one deterministic
   route gate ships in every deploy; covered by `tests/routeGate.test.ts`
   (including the `/teachers` prefix-leak case) and both walkthroughs.
6. **Mobile Safari** — not verifiable from this environment (no iOS, and
   the network policy blocks netlify.app here). Chromium at iPhone
   dimensions passes; **founder device check remains open**: open both
   direct links on iPhone, confirm each product, refresh each.
7. **Deep-link / refresh** — proven per (3).
8. **Storage namespace isolation** — LDS: `teacherprep.shared.v1`,
   `teacherprep.private.v1`, `teacherprep.currentweek.v1`. Companion:
   `companion-teleprompter-sync-v1`. No overlap; asserted in the Companion
   walkthrough.
9. **No private LDS data to Companion services** — the LDS surface makes
   exactly one network call (`/.netlify/functions/cfm-current`, request
   carries no body/state; response is public lesson metadata). Walkthrough
   confirms zero non-localhost requests and private material stays in the
   private store.
10. **No Companion transcript or microphone state in LDS** — disjoint
    component trees and stores; walkthrough asserts no `.companion-shell`
    on `/teacher` and no `.tp-shell` inside Companion.

## Identifiers

- Netlify project: `companion-prototype-erw`, site ID
  `0fca5864-c706-435c-a178-30657b31f5f9`, team `69ebeb9d9f98721b4508864f`
- Production deploy at verification: `6a53ca2ca5eeeb000836be6f` (main @ `c532d9f`)
- Pending merges: PR #23 (LDS v1.1, branch head `3ceca14`), PR #24
  (Companion v1.2, branch head `960ebf2`) — deploy previews green

## Rollback

- **Netlify-level**: app.netlify.com → companion-prototype-erw → Deploys →
  pick the previous production deploy → "Publish deploy". Note: manual
  publishing pauses auto-publishing; re-enable ("Start auto publishing")
  when done.
- **Git-level**: `git revert -m 1 <merge-sha>` on `main` for the PR to
  undo; push → Netlify auto-deploys the reverted state.
- **Product-level kill switches** (no deploy rollback needed):
  `TEACHER_PREP_ENABLED` (`src/teacherprep/featureFlag.ts`) removes the LDS
  surface; `COMPANION_PROTOTYPE_ENABLED` (`src/prototype/featureFlag.ts`)
  disables Companion.

## Open founder decision (from the recon receipt)

The LDS shareable URL rides on a hostname containing "companion-prototype".
Fixes are founder-side: rename the Netlify site, add a custom domain, or
approve a second Netlify project connected to this repo (pattern A). Until
then, pattern B holds and the routes are stable.
