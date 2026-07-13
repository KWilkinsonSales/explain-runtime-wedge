# Companion Deployment Closure Review — 2026-07-13

Independent technical and governance review of the Companion deployment
status prior to Deepgram credential remediation and final browser /
live-device acceptance. Reviewed against `explain-runtime-wedge` @ `2affead`
(main). The `adl-companion` repository (Rail 2) was **not accessible** from
this review's scope; every Rail-2 statement below is marked unverifiable
rather than assumed.

All repo claims below were verified directly: the app test suite was run
(146/146 pass, 15 files), the production build was run (clean), and the app
typecheck was run (**fails** — see F-3).

---

## A. Verdict

**CONTRADICTION REQUIRES GOVERNED DECISION**

Two contradictions rise above "material omission":

1. The Current State Ledger names **Vercel (adl-companion) as canonical**,
   yet every piece of implementation, deployment, secret-management, and
   remediation evidence available to this review attaches to the **Netlify
   rail** (`companion-prototype-erw`, this repository). The planned closure
   — replace `ADLDeepgram` in Netlify, re-run the live proof, capture the
   SPEAK acceptance receipt — will certify the *non-canonical* rail. Which
   rail Companion certification attaches to is a governed decision that
   must be made before the receipt is filed, or the receipt will be
   ambiguous the day it is created.
2. The ledger claim "Typecheck passes" is **false at the deployed-app
   surface** (F-3): `npm run typecheck` inside `explain-runtime-build`
   fails today on main. It passes only for the workspace kernel packages,
   which are not what Netlify deploys.

Material omissions were also found (findings table); none of them requires
a new architecture, platform, repository, or rail.

---

## B. Findings Table

| # | Finding | Severity | Evidence | Consequence | Required action | Blocking? |
|---|---------|----------|----------|-------------|-----------------|-----------|
| F-1 | Canonical-rail designation contradicts all supplied evidence | HIGH | Zero references to Vercel or adl-companion anywhere in this repo. Companion runtime, Deepgram token mint (`netlify/functions/deepgram-token.mts`), hard-coded endpoint `/.netlify/functions/deepgram-token` (`src/prototype/liveTranscription.ts:47`), production URLs, receipts, and the remediation plan are all Netlify. | SPEAK-loop certification will be earned on a rail the ledger calls non-canonical; unclear which deployment users are being certified onto. | Governed decision: either supply Vercel-side evidence of an equivalent Companion SPEAK stack (its own token mint + live rail), or annotate the ledger that SPEAK certification attaches to the Netlify wedge rail. No third rail is needed. | **Blocking** (for certification bookkeeping, not for credential remediation) |
| F-2 | Rail 2 claims are unverifiable; the two rails may not serve the same product | HIGH | adl-companion is outside review scope; "READY" and the `/companion`, `/explainit` routes could not be checked. In this repo ExplainIT is explicitly **quarantined** (`public/_redirects`: "ExplainIT routes are gone from this app"; `/quarantine/explainit`). | If the canonical product includes `/explainit`, the rails serve different products and certification on one cannot transfer to the other. | Attach Vercel deployment ID + browser route receipts for `/companion` and `/explainit`, or narrow the Rail-2 claim to what is evidenced. | **Blocking** (for the Rail-2 portion of closure only) |
| F-3 | "Build/lint/typecheck/CI passes" does not cover the deployed app; app typecheck fails today | HIGH | `pnpm-workspace.yaml` includes only `packages/*`; `.github/workflows/ci.yml` runs `pnpm -r` + kernel proof — `explain-runtime-build/` is excluded. Its 146-test vitest suite (incl. `deepgramTokenFunction.test.ts`) runs nowhere in CI. Verified: `npm run typecheck` in the app fails with TS5097 (`tests/deepgramTokenFunction.test.ts:2` imports `../../netlify/functions/deepgram-token.mts`; `allowImportingTsExtensions` not enabled). Netlify runs only `vite build` (no tsc), so deploys stay green. | Green CI masks app regressions; the exact test file guarding the credential path does not gate merges; the ledger's "Typecheck passes" is an overclaim. | Enable `allowImportingTsExtensions` (or a vitest-scoped tsconfig) so app typecheck is clean; add `explain-runtime-build` install + typecheck + test to CI. | **Blocking** for any certification statement that cites CI/typecheck; the fix itself is small |
| F-4 | Teacher Prep is not a separate repository or build surface | MEDIUM | `explain-runtime-build` is a **directory of this repo**; `netlify.toml` builds it; `src/main.tsx` statically imports Companion and Teacher Prep into one bundle (single `dist/assets/index-*.js`). | A Teacher Prep compile break blocks Companion deploys. Evidence separation (per controlling rule) is intact; build isolation does not exist and must not be assumed in sequencing. | Record the shared-build fact in the ledger. Keep the Journal repair on its own branch/receipt as ruled. | Non-blocking |
| F-5 | The reported Journal defect does not reproduce on this main; a case-collision hazard does exist | MEDIUM | `src/teacherprep/Journal.tsx` has a correct default export; `Prepare.tsx:14` and `TeacherPrepApp.tsx:12` import it; `teacherPrepJournal.test.ts` passes. But `Journal.tsx` and `journal.ts` coexist, differing only in case — on a case-insensitive filesystem `./Journal` can resolve to `journal.ts` (no default export), producing exactly the reported "missing/incorrect default export". | The repair may chase a symptom whose root cause is filename case, and may pass locally while failing elsewhere (or vice versa). | In the separate Teacher Prep repair: rename `journal.ts` (e.g. `journalStore.ts`) to eliminate the case pair, then re-verify. | Non-blocking for Companion |
| F-6 | "One bad credential is the only blocker" is supported for the grant step, but "only" overclaims | MEDIUM | Deepgram `/v1/auth/grant` returned 400 with `err_code: BAD_REQUEST`, `err_msg: "Invalid credentials."` (sanitized diagnostics added in `d373a1e`; pinned by test `returns sanitized Deepgram 400 diagnostics`). Note the browser actually receives **502** from the token function — 400 is the upstream status; ledger wording conflates them. | After a good credential, the following are still production-unproven: WebSocket subprotocol auth with the 30s-TTL bearer JWT, mid-session behavior past TTL, real-device mic capture (iOS `audio/mp4` path), device-network `wss://` egress, Deepgram account billing/quota and nova-2 access. | Treat credential replacement as necessary, not sufficient; run the full live-device checklist (§C). When replacing the key, paste the raw secret only (no `Token ` prefix / quotes / trailing newline) — a malformed value can reproduce a 400 with a brand-new key. | Non-blocking |
| F-7 | No reconnect or timeout hardening on the live rail; several failure-mode tests absent | MEDIUM | `liveTranscription.ts`: after a settled connection, socket close → status `stopped`, no retry (`socket.onclose`, line 280); no timeout on token fetch or socket open; `reconnecting` is only used before Web Speech fallback. Covered by tests: invalid/missing credential, malformed grant, malformed frames, interim/partial transcripts, rapid-update buffer cap, unsupported recorder mime, provider-failure fallback sentence, duplicate suppression, mic-denied (unit). Not covered: network interruption mid-stream, provider timeout, expired-credential mid-session, prolonged silence. | A mid-session network blip silently ends live capture; the user must restart Companion. Acceptable for a prototype if disclosed, but it must be observed and disclosed in the live receipt, not discovered by the founder. | Add the four missing failure-mode exercises to the live-device proof script; file absence of auto-reconnect as a known limitation in the receipt. | Non-blocking |
| F-8 | Deploy builds are not reproducible (real Netlify-side drift) | MEDIUM | App `package.json` pins react/react-dom/vite/typescript to `"latest"`; the Netlify build runs `pnpm install --ignore-workspace` in that directory — pnpm ignores the checked-in `package-lock.json`, so every deploy resolves `latest` at build time. | The certified deploy and a later same-commit redeploy can differ; local proof runs and production can diverge. This is the concrete drift danger — larger than any Vercel/Netlify env-var drift. | Pin dependency versions and commit a pnpm lockfile (or switch the build command to `npm ci && npm run build`, which honors the existing lock). | Non-blocking, but do it before the certification deploy so the receipt pins a reproducible artifact |
| F-9 | Stale credential documentation | LOW | `proof/companion/RECEIPT.md:84` says live streaming "requires `DEEPGRAM_API_KEY`"; `proof/DEPLOYMENT-2026-07-12.md` says "exactly one env var: `DEEPGRAM_API_KEY`". Both predate the `ADLDeepgram` switch (`3a226c3`). | An operator following the receipts sets the fallback variable, not the canonical one, and the two-credential state invites drift. | After the new key is proven, update both documents and remove the `DEEPGRAM_API_KEY` fallback from `deepgram-token.mts` (it is explicitly marked temporary). | Non-blocking |
| F-10 | Key-replacement security posture is good; two additions needed | LOW | Verified: 30s token TTL; master key server-side only; not `VITE_`-prefixed (cannot enter client bundle); sanitizer redacts JWTs/long tokens (`sanitizeProviderText`); tests assert no credential in errors or logs; git-history scan found no hardcoded keys. | Residual exposure paths are the Deepgram console (old key) and acceptance artifacts. | (a) **Revoke** the old key at Deepgram after rotation — replacing the env var alone leaves the compromised/invalid key live. (b) When capturing receipt screenshots/recordings, avoid the network tab or diagnostics view at the moment the short-lived `access_token` is displayed. | Non-blocking |
| F-11 | Route claims need one precision fix on this rail | LOW | The documented Companion entry is `/companion/prototype`; `routeGate.ts` sends *every* path other than `/` and `/teacher*` to Companion, so `/companion` (and any typo path) also renders it. Deep-link + refresh behavior is receipt-proven via `public/_redirects` and the walkthroughs; mobile Safari verification remains open per the receipts (founder device). | Acceptance against an undocumented alias would certify a URL nobody publishes. | Pin browser acceptance to the documented URL; include one refresh, one deep-link, and the phone viewport per existing receipt practice. `/companion` and `/explainit` as *Vercel* routes remain Rail-2 items (F-2). | Non-blocking |

---

## C. Certification Checklist

### Stage 1 — deploy-proven → live-device proven
1. Generate a new Deepgram key (Member or higher); set `ADLDeepgram` in the
   Netlify environment for `companion-prototype-erw` (raw secret only;
   builds/functions/runtime scopes); redeploy; **revoke the old key**.
2. `POST https://companion-prototype-erw.netlify.app/.netlify/functions/deepgram-token`
   returns 200 with an `access_token`; function log shows `grant_succeeded`.
   Capture both (the response is already sanitized).
3. On a real phone (iOS Safari, plus one Android Chrome), open
   `https://companion-prototype-erw.netlify.app/companion/prototype`,
   grant the microphone, and observe: status **Listening**, provider
   `deepgram`, diagnostics `providerConnected: true`.
4. Speak a scripted utterance; observe interim then final transcript
   segments (`transcriptReceiving: true`); screenshot transcript +
   diagnostics.
5. Keep the session running past 60s (beyond the 30s token TTL) and confirm
   streaming continues — this proves TTL gates connection only.
6. Exercise the failure modes live, once each: deny-mic path (governed
   error / Text Mode), airplane-mode toggle mid-session (governed stop, no
   crash; absence of auto-reconnect disclosed), 20s of silence (no phantom
   segments).

### Stage 2 — live-device proven → SPEAK-loop certified
7. A final live transcript is admitted → exactly one event ID → one
   execution → **SPEAK rendered** (with STEER secondary), `fallback: false`;
   the admission receipt (source, event type, confidence, raw text) is
   visible alongside the rendered answer.
8. Duplicate-utterance suppression and stale-response supersession each
   observed live once.
9. **End** closes the session; a new activation shows a fresh session ID.
10. Human founder acceptance recorded — date, device, URL, Netlify deploy
    ID, session ID, screenshots/recording — filed as
    `proof/companion/RECEIPT-live-<date>.md`.
11. Wording rule: the certificate must state that SPEAK content comes from
    the **deterministic governed rail** (no model provider is wired; the
    receipts say so explicitly). "SPEAK-loop production-proven" without
    that qualifier would overclaim.

---

## D. Canonical Rail Assessment

On the evidence supplied: the Vercel designation is **not consistent** with
the implementation and deployment evidence. Everything reviewable —
Companion runtime code, the Deepgram token mint, the hard-coded
`/.netlify/functions/deepgram-token` client path, receipts, production
URLs, and the remediation plan — is Netlify. No Vercel artifact was
supplied, and `/explainit` (a required Rail-2 route) is quarantined out of
this rail entirely.

Per the controlling rule, this review does **not** recommend changing the
ledger. It recommends a governed decision with evidence: either attach
Vercel-side receipts demonstrating an equivalent Companion SPEAK stack, or
annotate the ledger that SPEAK-loop certification attaches to the Netlify
wedge rail while Vercel remains canonical for whatever adl-companion
actually serves. Until that decision, the planned acceptance receipt would
certify a rail the ledger calls secondary.

## E. Smallest Correct Next Sequence

1. Fix the app typecheck failure (TS5097) and add
   `explain-runtime-build` install + typecheck + test to CI, so every
   later claim of "CI/typecheck passes" is true for the deployed app.
2. Pin the app dependencies (lockfile honored by the Netlify build) so the
   certification deploy is reproducible.
3. Rotate the credential: new Deepgram key → `ADLDeepgram` in Netlify →
   redeploy → revoke the old key → confirm `grant_succeeded` (Stage 1,
   steps 1–2).
4. Run the live-device proof on the documented URL (Stage 1, steps 3–6).
5. Run the SPEAK-loop acceptance with the founder observing and file the
   receipt; update the two stale `DEEPGRAM_API_KEY` documents and remove
   the fallback variable (Stage 2).
6. Present the canonical-rail contradiction (F-1/F-2) for governed
   decision, with the new receipt in hand.
7. Separately, on its own branch and receipt: Teacher Prep Journal repair,
   including the `Journal.tsx`/`journal.ts` case-collision rename (F-5).

## F. Lock Recommendation

**May be locked now** (evidence-backed, no open questions):
- The Deepgram token-mint design: `/v1/auth/grant`, 30s TTL, server-side
  key, sanitized diagnostics, no client-bundle exposure.
- The live-transcription parsing/buffer design and its unit-test pins.
- The governed response-engine invariants (one event → one execution → one
  render; duplicate suppression; supersession; fallback sentence).
- Route-gate pattern B and product separation on this rail, including the
  ExplainIT quarantine.

**Must remain open**:
- SPEAK-loop certification (until the Stage-2 receipt exists).
- The canonical-rail designation (F-1) and all Rail-2 route acceptance (F-2).
- The CI/typecheck coverage gap (F-3) and dependency pinning (F-8).
- Removal of the `DEEPGRAM_API_KEY` fallback and receipt-doc updates (F-9).
- The Teacher Preparation Journal repair (F-5), on its separate track.
