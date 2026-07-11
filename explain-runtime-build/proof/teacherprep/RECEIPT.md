# Implementation Receipt — LDS Teacher Preparation + Presentation Mode v1

Filed for founder review per the 2026-07-10 Final Canon Map & Build Lock,
UI Execution Amendment, and Prototype v1 Bounded Corrections.

Date: 2026-07-11 · Surface: `/teacher` in `explain-runtime-build` ·
Feature flag: `TEACHER_PREP_ENABLED` (`src/teacherprep/featureFlag.ts`)

## Changed files

Implementation (merged in PR #20):

- `src/main.tsx` — route gate: `/teacher` → Teacher Prep, everything else → Companion unchanged
- `src/teacherprep/featureFlag.ts` — single off-switch
- `src/teacherprep/types.ts` — shared vs. device-local type contract
- `src/teacherprep/fixture.ts` — deterministic illustrative lesson (Alma 5–7), required label, disclaimer, private microcopy
- `src/teacherprep/store.ts` — `SharedStore` (`teacherprep.shared.v1`) and `PrivateStore` (`teacherprep.private.v1`); one shared-payload serializer that cannot see private data
- `src/teacherprep/prep.ts` — per-item reversible promotion; confirmation-gated private promotion
- `src/teacherprep/snapshot.ts` — deep-copied, deeply frozen Ready for Class snapshot
- `src/teacherprep/exportPdf.ts` — Teacher Packet / Class Handout / Large Print builders, private excluded by default
- `src/teacherprep/ThisWeek.tsx`, `Prepare.tsx`, `ReadyReview.tsx`, `Teach.tsx`, `TeacherPrepApp.tsx`, `TeacherPrepRoute.tsx`, `teacherprep.css`, `README.md`
- `tests/teacherPrepFlow.test.ts`, `teacherPrepSnapshot.test.ts`, `teacherPrepPrivacy.test.ts`, `teacherPrepNoEvaluation.test.ts`, `teacherPrepAccessibility.test.ts`

Verification follow-up (this change):

- `tsconfig.json` — add `node` types so `npm run typecheck` covers the test files
- `package.json` / `package-lock.json` — add `@types/node`; regenerate the lockfile against `registry.npmjs.org` (the previous lockfile pinned tarballs to a private registry mirror unreachable outside its origin environment)
- `proof/teacherprep/` — this receipt, screenshots, and the browser walkthrough script

## Test evidence

All commands run in `explain-runtime-build/`:

- `npm run typecheck` — clean (tsc --noEmit, strict).
- `npm run test` — **9 files, 88 tests, 88 passed** (5 teacherPrep suites plus the 4 pre-existing Companion suites, untouched).
- `npm run build` — production build succeeds (37 modules, 233 kB JS / 13.6 kB CSS).
- `node proof/teacherprep/browser-walkthrough.mjs` against `npm run dev` — **21/21 checks passed** in real Chromium at 390×844 and 1024×768.

Required proofs and where they are pinned:

| Proof | Evidence |
| --- | --- |
| This Week → Prepare → Ready → Teach completes | walkthrough steps 1–7; `teacherPrepFlow.test.ts` |
| Teach reads only the active snapshot | `Teach.tsx` takes only a `ClassSnapshot`; `teacherPrepSnapshot.test.ts` |
| Prepare edits never silently alter Teach | walkthrough "editing Prepare does not silently change Teach"; frozen-snapshot tests |
| Replacing the snapshot updates Teach deliberately | walkthrough "replacing the snapshot deliberately updates Teach" |
| Personal material stays device-local, absent from shared payloads | separate storage keys verified in-browser and in `teacherPrepPrivacy.test.ts`; zero external network requests observed |
| Personal material absent from Teach and default exports | walkthrough + privacy tests on every export preset |
| Promote to Class per-item and reversible | flow tests; walkthrough Undo check |
| Private promotion requires confirmation | `PrivatePromotionNotConfirmedError` test; in-browser confirm step |
| No quiz/scoring/ranking/analytics surface | `teacherPrepNoEvaluation.test.ts` source scan |
| PDF export excludes private by default | `teacherPrepPrivacy.test.ts` |
| Neutral Screen clears content immediately | walkthrough check + screenshot 05 |
| Phone and tablet layouts | screenshots 01–07; CSS contract tests |

## Screenshots

1. `01-this-week-phone.png` — This Week, illustrative label, source chips, disclaimer
2. `02-prepare-phone.png` — Prepare column, promoted block, private notes section, Undo toast
3. `03-review-phone.png` — Review of chosen class content
4. `04-teach-phone.png` — Teach scripture card
5. `05-neutral-phone.png` — Neutral Screen
6. `06-this-week-tablet.png`, `07-teach-tablet.png` — tablet widths

## Known limitations

- One fixture lesson only; no live weekly data (by design until a validated source exists — label stays on).
- PDF export uses the browser print dialog ("Save as PDF"); no direct file download without the dialog.
- Teacher-only notes are not shown inside Teach in v1 (packet says "may"); Teach stays 100% snapshot-only, which is the safer reading for a single-device projector surface.
- Snapshot/prep persistence is per-browser localStorage; clearing site data clears both stores. Offline caching relies on normal browser caching of the built app — no service worker was added.
- The walkthrough script drives a dev server; it is filed as proof, not wired into CI (repo CI does not build `explain-runtime-build`).

## Run instructions

```bash
cd explain-runtime-build
npm install
npm run dev        # open http://localhost:5173/teacher
npm run test
npm run typecheck
npm run build
node proof/teacherprep/browser-walkthrough.mjs   # needs a Chromium; edit executablePath
```
