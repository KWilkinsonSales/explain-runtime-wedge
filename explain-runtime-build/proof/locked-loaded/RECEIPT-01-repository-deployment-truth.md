# Receipt 01 — Repository and Deployment Truth

Date: 2026-07-14 (America/Phoenix)  
Repository: `KWilkinsonSales/explain-runtime-wedge`  
Requested default branch: `main`  
Governing source: [2026-07-15 — Source Assessment — LLM Runtime / Active Listening / Multimodal Next Phases](https://app.notion.com/p/39e8ac7fc2f18100a66cffc3973a0249)

## Stop disposition

**CONTRADICTION FOUND — DO NOT ISSUE COMMAND 2 OR COMMAND 3 YET.**

GitHub `main` and the current Netlify production deploy are aligned at the same revision, so there is no repository-to-deployment revision conflict. However, the deployed root selector materially contradicts the governing source's exact canonical card copy. The checkout in which this receipt is filed is also not a fresh `main` checkout: it is branch `codex/fix-my-iphone-slice-0` at `1e9133b16df1378cf28179aaf05783e8c950c83e`, with a stale local `main` ref at `2affeada3074d1d31efbf35dc67a7e8f904d8149`. Remote truth was therefore inspected from a separate, read-only shallow clone of current GitHub `main`; no checkout refs were changed.

## Branch and revisions

| Item | Truth |
|---|---|
| GitHub default branch | `main` |
| GitHub `main` | `e0f33a25186f97bc4b686105e58a06702afd406f` |
| GitHub `main` commit | Merge PR #31, 2026-07-14T23:59:29Z |
| Current production deploy | `6a5704186f10d3728e5d0f00` |
| Production deploy revision | `e0f33a25186f97bc4b686105e58a06702afd406f` |
| Production branch/context | `main` / `production` |
| Production publish time | 2026-07-15T03:53:19.290Z |
| Receipt checkout branch/head | `codex/fix-my-iphone-slice-0` / `1e9133b16df1378cf28179aaf05783e8c950c83e` |
| Receipt checkout local `main` | stale at `2affeada3074d1d31efbf35dc67a7e8f904d8149` |

## A. Repository truth

### Routes and entry points

- `explain-runtime-build/src/main.tsx` is the browser entry point.
- `explain-runtime-build/src/routeGate.ts` resolves:
  - `/teacher` and `/teacher/*` to LDS Teacher Preparation when its flag is enabled;
  - `/durin` and `/durin/*` to Durin Intake when its flag is enabled;
  - `/` exactly to the product selector;
  - every other path, including `/companion/prototype`, to Companion.
- `explain-runtime-build/public/_redirects` sends SPA deep links to the app shell.
- Netlify builds `explain-runtime-build` and publishes `explain-runtime-build/dist`; functions are served from `netlify/functions`.

### Feature flags

- `src/teacherprep/featureFlag.ts`: `TEACHER_PREP_ENABLED = true`.
- `src/prototype/featureFlag.ts`: `COMPANION_PROTOTYPE_ENABLED = true`, although the current top-level route gate does not consult this flag.
- `src/durin/featureFlag.ts`: `DURIN_INTAKE_ENABLED = true`.

### Product selector implementation

`explain-runtime-build/src/ProductSelector.tsx` uses plain accessible links to `/teacher`, `/companion/prototype`, and `/durin`. It currently renders:

```text
LDS Teacher Preparation
This Week · Prepare · Teach

Companion
Live listening prototype

Durin Intake
Governed multimodal intake · Slice 0
```

This is not the exact canonical copy required by the governing source.

### Teacher Preparation implementation

Primary implementation is under `explain-runtime-build/src/teacherprep/`:

- route/app: `TeacherPrepRoute.tsx`, `TeacherPrepApp.tsx`;
- workflow: `ThisWeek.tsx`, `Prepare.tsx`, `ReadyReview.tsx`, `Teach.tsx`;
- state/privacy: `store.ts`, `prep.ts`, `snapshot.ts`, `journal.ts`, `Journal.tsx`;
- current-week adapter: `currentWeek.ts`, `cfmExtract.ts`, `fixture.ts`;
- sources/export: `sources.ts`, `ExploreSources.tsx`, `exportPdf.ts`;
- server function: `netlify/functions/cfm-current.mts`.

### Companion and Deepgram implementation

Primary implementation is under `explain-runtime-build/src/prototype/`:

- route/UI: `CompanionPrototypeRoute.tsx`, `CompanionPrototype.tsx`, `TeleprompterView.tsx`;
- live input: `liveTranscription.ts`;
- governed execution: `companionRuntime.ts`, `responseEngine.ts`, `admissionSourceAdapter.ts`;
- teleprompter synchronization: `teleprompterSync.ts`.

`netlify/functions/deepgram-token.mts` is the server-side Deepgram token function. It calls `https://api.deepgram.com/v1/auth/grant` with a 30-second TTL, resolves `ADLDeepgram` first and `DEEPGRAM_API_KEY` only as a compatibility fallback, returns the temporary grant to the client, and sanitizes provider diagnostics. The browser client in `liveTranscription.ts` calls `/.netlify/functions/deepgram-token` and then opens the Deepgram WebSocket; the long-lived credential is not intentionally sent to browser code.

### Tests, proof scripts, and receipts

Current app suites include route-gate, Teacher flow/snapshot/privacy/no-evaluation/accessibility/journal/current-week/source tests, Companion prototype/runtime/live-transcription/response-engine tests, and Deepgram token-function tests under `explain-runtime-build/tests/`.

Relevant proof automation and stored evidence:

- `proof/teacherprep/browser-walkthrough.mjs` and phone/tablet screenshots;
- `proof/teacherprep/RECEIPT.md` and `RECEIPT-v1.1.md`;
- `proof/companion/browser-walkthrough.mjs` and phone/tablet screenshots;
- `proof/companion/RECEIPT.md`;
- `proof/companion-v11-proof.mjs`;
- `proof/DEPLOYMENT-2026-07-12.md`;
- `proof/HANDOFF-2026-07-12.md`;
- `proof/RECON-2026-07-12.md`;
- `proof/REVIEW-2026-07-13-companion-closure.md`.

### Known limitations

- The deployed app is excluded from the root pnpm workspace (`pnpm-workspace.yaml` includes `packages/*` only), so root recursive typecheck/test/build does not prove `explain-runtime-build`.
- The stored July 13 closure review records that app typecheck fails on the `.mts` test import (TS5097) while Netlify's production command runs Vite build only. This command did not mutate/install dependencies to re-run that test.
- The app declares several dependencies as `latest`; Netlify runs `pnpm install --ignore-workspace` while the checked-in app lockfile is `package-lock.json`, leaving redeploy reproducibility open.
- Stored Teacher and Companion screenshots/walkthroughs are implementation evidence, not current live-production acceptance evidence.
- No current real-iPhone 60-second Deepgram acceptance receipt exists.
- The earlier July 13 Companion closure review records a Vercel-vs-Netlify canonical-rail contradiction. The later governing source explicitly treats the merged Netlify implementation as current implementation truth but does not itself provide Vercel deployment evidence. This historical contradiction must remain visible until governance expressly supersedes or resolves it.

## B. Merged implementation chain

Verified merged PRs:

| PR | Merge commit | Disposition |
|---|---|---|
| #18 Companion v1.1 live input rail | `84682d93dc71fe2a5955ebd274a741ad3beeea3e` | merged |
| #19 Deepgram auth grant | `7d649b0654f2b99dde3e8ebd4f74510369807b7a` | merged |
| #20 Teacher Preparation v1 | `1f92cb475305b00e679ed7b9e73517f588a9ed5c` | merged |
| #21 Teacher verification/portable lockfile | `c74f9caa822e4f5c6478c751e4d29fcf0b3cf270` | merged |
| #22 root selector and `/teacher` front door | `c532d9ffd507dccc824e5628dbbcdb58bb1a38ba` | merged |
| #23 Teacher v1.1 current week/sources/journal/print | `ae0e552124c0a3bd89369a2b33d41eb3d81a6a80` | merged |
| #24 Companion v1.2 SPEAK/STEER engine | `772cf05527abc99ee35b1c2605c906fbbc69bc83` | merged |
| #25 canonical `ADLDeepgram` secret | `d2bad230336cedf98a995af3a786776449873741` | merged |
| #26 sanitized Deepgram diagnostics | `2affeada3074d1d31efbf35dc67a7e8f904d8149` | merged |
| #27 Companion deployment closure review | `27e23cddbef3de9edf6341dc819120d435c345c9` | merged; receipt only |
| #28–31 Durin Slice 0 | `8033c0c…`, `d32cfd2…`, `1f80913…`, `e0f33a2…` | merged; regression context only |

Comparison from PR #26 through current `main` shows no modifications to `src/teacherprep/`, `src/prototype/`, or `netlify/functions/deepgram-token.mts`. PR #27 added the closure review receipt. PRs #28–31 added Durin, extended the selector and route gate, and added Durin regression evidence. Durin Slice 0 is not reopened or modified by this command.

## C. Status-language truth

The governing source requires exactly:

```text
LDS Teacher Preparation
Prototype — curriculum workflow

Companion
Prototype — live listening

Durin Intake — Governed Multimodal Intake
Accepted foundation — Slice 0 complete
```

Canonical vocabulary is `Prototype` · `Active build phase` · `Accepted foundation`.

The source and deployed bundle instead contain the noncanonical selector strings shown in section A. The production JS bundle contains `LDS Teacher Preparation`, `This Week · Prepare · Teach`, `Companion`, `Live listening prototype`, `Durin Intake`, and `Governed multimodal intake · Slice 0`; it does not contain the required canonical status strings. Therefore status-language reconciliation fails.

## D. Deployment truth

| Item | Finding |
|---|---|
| Netlify project | `companion-prototype-erw` (`0fca5864-c706-435c-a178-30657b31f5f9`) |
| Production URL | `https://companion-prototype-erw.netlify.app` |
| Current deploy | `6a5704186f10d3728e5d0f00`, ready |
| Deploy branch/context | `main` / `production` |
| Deploy revision | `e0f33a25186f97bc4b686105e58a06702afd406f` |
| GitHub `main` revision | `e0f33a25186f97bc4b686105e58a06702afd406f` |
| Revision comparison | exact match |
| Manual deploy | `false` |
| Publishing evidence | Git-backed production deploy from `main`; no evidence that a manually published preview controls production |
| `/` | HTTP 200, selector shell/bundle |
| `/teacher` | HTTP 200, SPA shell; source route gate resolves Teacher |
| `/companion/prototype` | HTTP 200, SPA shell; source route gate resolves Companion |
| Production functions | `cfm-current`, `deepgram-token` |
| Netlify secret scan | 209 files scanned; no matches reported |

The route checks prove availability and source-level resolution, not full browser interaction acceptance. No production mutation, environment inspection that exposed values, token mint, or device microphone test was performed.

## E. Final dispositions

### LDS Teacher Preparation

**1. CODE COMPLETE / PRODUCTION PROOF OPEN**

The implementation chain is merged, `/teacher` is deployed from current `main`, and the governing source explicitly leaves founder/live-use and official-current-week production acceptance open. The shared selector's canonical copy is additionally out of compliance and must be corrected before the acceptance sequence can truthfully proceed.

### Companion live listening / Deepgram

**4. CONTRADICTION REQUIRES GOVERNED DECISION**

The implementation chain is merged and deployed from current `main`, but the governing live-device production gate remains open, the selector copy is noncanonical, and the stored PR #27 receipt records an unresolved canonical Vercel-vs-Netlify rail contradiction. A current production Netlify revision match does not by itself resolve that governance conflict or prove a real-iPhone Deepgram session.

## Contradictions

1. Exact canonical selector copy in the governing source does not match source `ProductSelector.tsx` or the deployed JS bundle.
2. The receipt checkout is not current `main`; local `main` is stale. Remote inspection was required to establish truth.
3. The July 13 Companion closure receipt says canonical rail designation requires governance; the later governing page describes Netlify-side implementation truth but does not explicitly close the earlier rail decision with Vercel evidence.
4. Stored implementation/deployment receipts use status language such as “ready for founder review”; none supplies the current production acceptance evidence required for Teacher or the real-iPhone live-device evidence required for Companion.

## Recommended next command

Do **not** issue attached Command 2 or Command 3. First issue a bounded governance/reconciliation command that:

1. explicitly resolves which production rail the Companion acceptance receipt governs (Netlify wedge versus any Vercel `adl-companion` rail), with deployment evidence;
2. updates only the root selector to the exact canonical copy already authorized by the governing source;
3. verifies `/`, `/teacher`, `/companion/prototype`, and `/durin` at phone and tablet widths;
4. files a reviewed receipt without promoting Teacher or Companion above `Prototype`;
5. begins from a fresh branch at GitHub `main` `e0f33a25186f97bc4b686105e58a06702afd406f`.

After that contradiction is resolved and the corrected selector is deployed/reconciled, re-run Command 1 against the resulting `main` and production deploy. Only a clean re-run should unlock Commands 2 and 3.

## Exact commands and read-only queries run

Shell commands (some output was truncated only for display; the underlying checks completed):

```bash
sed -n '1,240p' '/Users/kellenwilkinson/.codex/attachments/c703b71d-6f97-4d4a-bdf8-4a70710f7176/pasted-text.txt'
sed -n '241,520p' '/Users/kellenwilkinson/.codex/attachments/c703b71d-6f97-4d4a-bdf8-4a70710f7176/pasted-text.txt'
find /Users/kellenwilkinson/Documents/Codex -type d -name explain-runtime-wedge -prune -print 2>/dev/null | head -20
pwd; git status --short --branch; git remote -v; git rev-parse HEAD; git rev-parse main; git log -1 --format='%H%n%ad%n%s' --date=iso-strict main; git ls-remote origin refs/heads/main; find . -name AGENTS.md -print
git log --oneline --decorate --all -35; git merge-base --is-ancestor 2affeada3074d1d31efbf35dc67a7e8f904d8149 e0f33a25186f97bc4b686105e58a06702afd406f 2>/dev/null; gh auth status; gh api repos/KWilkinsonSales/explain-runtime-wedge/commits/main --jq '{sha:.sha,date:.commit.committer.date,message:.commit.message,parents:[.parents[].sha]}'
rm -rf work/repository-truth-main && gh repo clone KWilkinsonSales/explain-runtime-wedge work/repository-truth-main -- --depth=1 --branch main
git -C work/repository-truth-main rev-parse HEAD
git -C work/repository-truth-main status --short --branch
gh pr view 18 --repo KWilkinsonSales/explain-runtime-wedge --json number,title,state,mergedAt,mergeCommit,headRefName,baseRefName,url
for n in 19 20 21 22 23 24 25 26 27 28 29 30 31; do gh pr view "$n" --repo KWilkinsonSales/explain-runtime-wedge --json number,title,state,mergedAt,mergeCommit,headRefName,baseRefName,url --jq '[.number,.state,.mergedAt,.mergeCommit.oid,.title,.url]|@tsv'; done
rg --files -g '!*node_modules*' | sed -n '1,260p'
rg -n "LDS Teacher Preparation|Prototype — curriculum workflow|Companion|Prototype — live listening|Durin Intake|Accepted foundation|Active build phase|/teacher|/companion/prototype|Deepgram|ADLDeepgram|DEEPGRAM_API_KEY|feature flag|FEATURE_" explain-runtime-build package.json netlify.toml 2>/dev/null | sed -n '1,360p'
sed -n '1,180p' explain-runtime-build/src/ProductSelector.tsx
sed -n '1,160p' explain-runtime-build/src/main.tsx
sed -n '1,160p' explain-runtime-build/src/routeGate.ts
cat package.json
cat explain-runtime-build/package.json
cat netlify.toml
sed -n '1,260p' netlify/functions/deepgram-token.mts
command -v netlify || true
netlify status 2>&1 | sed -n '1,160p'
for u in https://companion-prototype-erw.netlify.app/ https://companion-prototype-erw.netlify.app/teacher https://companion-prototype-erw.netlify.app/companion/prototype; do curl -sS -L -o /dev/null -w '%{url_effective}\t%{http_code}\t%{content_type}\n' "$u"; done
curl -sS https://companion-prototype-erw.netlify.app/ | sed -n '1,80p'
curl -sS https://companion-prototype-erw.netlify.app/assets/index-GSdAUoNC.js | rg -o "LDS Teacher Preparation|This Week · Prepare · Teach|Prototype — curriculum workflow|Live listening prototype|Prototype — live listening|Durin Intake — Governed Multimodal Intake|Durin Intake|Accepted foundation — Slice 0 complete|Governed multimodal intake · Slice 0" | sort -u
gh api repos/KWilkinsonSales/explain-runtime-wedge/compare/2affeada3074d1d31efbf35dc67a7e8f904d8149...e0f33a25186f97bc4b686105e58a06702afd406f --jq '{status,ahead_by,commits:[.commits[]|{sha:.sha,message:.commit.message}],files:[.files[]|{filename,status,additions,deletions}]}'
```

Connected read-only queries:

```text
Notion fetch: https://app.notion.com/p/39e8ac7fc2f18100a66cffc3973a0249
Netlify get-projects: projectNameSearchValue=companion-prototype-erw
Netlify get-project: siteId=0fca5864-c706-435c-a178-30657b31f5f9
Netlify get-deploy-for-site: siteId=0fca5864-c706-435c-a178-30657b31f5f9, deployId=6a5704186f10d3728e5d0f00
```

No commit, push, deploy, environment-variable mutation, production edit, credential disclosure, or Durin modification was performed.
