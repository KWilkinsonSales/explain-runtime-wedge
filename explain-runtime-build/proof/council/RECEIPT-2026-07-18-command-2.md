# Command Receipt — Council, Command 2

**Date:** 2026-07-18
**Command:** 2 of 2 (this pass) — smallest additive `/council` surface, following Command 1 repo intake
**Branch:** `claude/council-route-intake-p228be`
**Base commit (before this change):** `9c40c54b274d535891ece8cec79b47e63343f29c` (= `origin/main` at intake time)
**Verdict:** Implementation and every proof command below actually ran and passed. Local only — no deploy, no merge, no production claim.

## Scope actually built

- One new flag-gated surface, `src/council/`, mounted at `/council` through
  the existing `routeGate.ts` pattern (same idiom as `teacherprep/` and
  `durin/`: one boolean flag, one route wrapper, fallback to Companion when
  disabled).
- `deliberate(question)` in `src/council/engine.ts` is a **pure, synchronous,
  deterministic function**: keyword-matched lookup against
  `src/council/fixtures.ts`. No network call, no live model, no credentials,
  no randomness anywhere under `src/council`.
- UI (`src/council/ui/CouncilApp.tsx`) lets a user submit a question and see
  three fixture-backed perspectives (Advocate, Skeptic, Synthesizer),
  labeled illustrative in the interface itself.
- Not added to `src/ProductSelector.tsx` — that file is canon-locked by a
  separate Notion authority and was explicitly out of scope; Council has no
  card there and no acceptance status.

## Commands run, from repo root, in order

| Step | Command | Result |
|---|---|---|
| Root install | `pnpm install` | pass — installed missing `packages/*` deps (were never installed in this checkout) |
| Root build | `pnpm build` | pass — `lenses`, `runtime`, `ui`, `harness-cli` all build; **required before typecheck** (see limitations) |
| Root typecheck | `pnpm typecheck` | pass (after root build) |
| Root lint | `pnpm lint` | pass (`tsc --noEmit` per package; no eslint in this repo) |
| Root test | `pnpm test` | pass — no-op; no `packages/*` package defines a `test` script |
| App install | `pnpm install --ignore-workspace` (repo's documented Netlify install step) | pass |
| App typecheck | `npm run typecheck` (`tsc --noEmit`) | **pass** |
| App test | `npm run test` (`vitest run`) | **pass — 258/258 tests, 22 files** (includes new `tests/councilEngine.test.ts` and the extended `tests/routeGate.test.ts`) |
| App build | `npm run build` (`vite build`) | **pass** — 67 modules, bundle built cleanly; committed `dist/` restored via `git checkout -- explain-runtime-build/dist/` afterward so no build-artifact churn is committed (`dist/` is Netlify's own build output, not source) |
| Focused | `npx vitest run tests/councilEngine.test.ts tests/routeGate.test.ts --reporter=verbose` | pass — 14/14, itemized below |

Focused test names (all passing):
```
✓ routeGate.test.ts > routes /council and subpaths to Council only when its flag is on
✓ councilEngine.test.ts > is deterministic: the same question always returns the same deliberation
✓ councilEngine.test.ts > matches the ship fixture on a shipping question and returns all three perspectives
✓ councilEngine.test.ts > matches the architecture fixture on a rearchitect question
✓ councilEngine.test.ts > matches the scope fixture on a scope-expansion question
✓ councilEngine.test.ts > falls back to the bounded default for an unmatched question, never inventing a response
✓ councilEngine.test.ts > is case-insensitive and tolerant of surrounding whitespace
✓ councilEngine.test.ts > preserves the caller's exact question text in the result
✓ councilEngine.test.ts > treats an empty or whitespace-only question as unmatched, not a crash
```
(plus the 5 pre-existing routeGate cases, unmodified and still passing)

## Local `/council` runtime receipt (real browser, not a fabricated claim)

Ran `npx vite preview --port 4173 --strictPort` against the actual production
build in this checkout, then drove it with Playwright + the pre-installed
Chromium (`/opt/pw-browsers/chromium`) — a real page load and real DOM
interaction, not a unit test:

```json
{
  "title": "Council",
  "heading": "Council",
  "disclaimerVisible": true,
  "cardTitlesAfterShipPrompt": ["Advocate", "Skeptic", "Synthesizer"],
  "advocateResponseAfterShipPrompt": "Shipping now proves the surface end-to-end and unblocks real feedback sooner than another planning pass would.",
  "rootHeading": "Choose a surface",
  "rootHasCouncilCard": false,
  "durinTitle": "Companion",
  "companionTitle": "Companion"
}
```

- `GET /council` → HTTP 200 (SPA catch-all, no `_redirects` change needed, as predicted in Command 1).
- Clicking the "Should we ship this now?" starter button rendered all three
  perspective cards with the exact fixture text.
- Typing "Should we rearchitect this?" into the actual `<input>` and
  submitting via the "Convene" button (the real form path, not a shortcut)
  rendered the architecture fixture's deliberation — confirms the full
  user-entry path works, not just the starter buttons.
- `durinTitle`/`companionTitle` both read "Companion" because `index.html`'s
  default `<title>` is "Companion" and `DurinRoute` (like the unmodified
  Companion route) never overrides it — pre-existing behavior, unaffected by
  this change, confirmed by reading `DurinRoute.tsx` before asserting on it.
- Follow-up regression pass confirmed: `/durin` still renders Durin-specific
  content, `/teacher` still renders with title "Teacher Preparation",
  `/companion/prototype` still loads, and `/` (product selector) still shows
  exactly its original three cards — Teacher Preparation, Companion, Durin
  Intake — with **no** Council card added.
- Preview server was killed after the run (PID confirmed stopped; `/council`
  no longer reachable at `localhost:4173`).

## Changed files

```
explain-runtime-build/src/council/types.ts              new — CouncilDeliberation/CouncilResponse/CouncilPerspective types
explain-runtime-build/src/council/fixtures.ts            new — deterministic illustrative fixtures + PERSPECTIVES + DEFAULT_DELIBERATION
explain-runtime-build/src/council/engine.ts               new — pure deliberate(question) keyword-matched lookup
explain-runtime-build/src/council/featureFlag.ts           new — COUNCIL_ENABLED single flip
explain-runtime-build/src/council/ui/CouncilApp.tsx         new — input + starter prompts + response cards
explain-runtime-build/src/council/ui/CouncilRoute.tsx        new — route wrapper (document title/body class), same idiom as TeacherPrepRoute
explain-runtime-build/src/council/ui/council.css              new — styling, matches ProductSelector's visual family
explain-runtime-build/src/council/README.md                    new — scope and explicit non-scope for this pass
explain-runtime-build/src/routeGate.ts                    modified — added "council" to Surface union, councilEnabled param, one new branch
explain-runtime-build/src/main.tsx                        modified — wired COUNCIL_ENABLED + CouncilRoute into the surface switch
explain-runtime-build/tests/routeGate.test.ts              modified — added council flag-on/off/subpath/no-leak cases
explain-runtime-build/tests/councilEngine.test.ts           new — 8 bounded interaction tests on the deliberation engine
explain-runtime-build/README.md                           modified — "Four routes" → "Five routes", documents /council
explain-runtime-build/proof/council/RECEIPT-2026-07-18-command-2.md   this receipt
```

## Files explicitly not touched

`src/ProductSelector.tsx`, `src/teacherprep/**`, `src/durin/**`,
`src/prototype/**`, `netlify.toml`, `explain-runtime-build/public/_redirects`,
`explain-runtime-build/dist/**` (build artifact restored to base state),
`packages/**`, `netlify/functions/**`.

## Limitations / deferrals (stated, not hidden)

- **Root `pnpm typecheck` requires `pnpm build` first** in a clean checkout:
  `packages/ui` imports `@adl/lenses`/`@adl/runtime` by their built
  `dist/index.d.ts`, which does not exist until `pnpm build` runs. This is a
  pre-existing workspace ordering property, not something introduced or
  fixed by this change — noted here because Command 2's instructions listed
  `pnpm test / typecheck / build / lint` in that order and running them
  literally in that order fails on a clean install. Ran `build` before
  `typecheck` to get a true pass; did not reorder or modify the root scripts
  themselves.
- **Root `pnpm test` / `pnpm lint` do not exercise `explain-runtime-build`
  at all** — `explain-runtime-build` is intentionally outside the pnpm
  workspace (`pnpm-workspace.yaml` only covers `packages/*`), confirmed in
  Command 1. This is why the app-level `npm run test` / `typecheck` / `build`
  commands above are the commands that actually prove the Council code.
- **Council is a deterministic fixture prototype only.** Three fixed
  keyword-matched deliberations plus one bounded default — nothing dynamic,
  no live model, no adapters, no regulated or authoritative claim. Expanding
  the fixture set, wiring a real model, or adding Council to the product
  selector are all out of scope for this pass and would need a new,
  explicitly scoped command.
- **No deploy, no merge performed.** This receipt only covers local proof on
  this branch/checkout; the Netlify canonical deploy is unaffected until a
  human merges.

## Next authorized step

Human review of this branch/PR. No further command is self-authorized by
this receipt.
