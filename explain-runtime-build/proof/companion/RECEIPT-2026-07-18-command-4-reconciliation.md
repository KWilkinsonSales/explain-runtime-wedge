# Companion — Command 4 Reconciliation Receipt

Date: 2026-07-18
Repository: `KWilkinsonSales/explain-runtime-wedge`
Current `main` SHA: `6a1e67bc363ee5903df760573c8856cf947e682e`

This is a reconciliation of existing evidence only. No implementation, model behavior, tool, or autonomous action was added or changed while producing this receipt.

Note on scope: the original command pack pointed this task at `adl-companion` (Vercel). The actual "Companion useful-response recovery" work — and all existing evidence for it — lives here, in `explain-runtime-wedge` (Netlify), under `explain-runtime-build/proof/companion/`. See `RECEIPT-product-recovery.md` (the implementation receipt) and `RECEIPT-main-reconciliation.md` (an earlier, narrower reconciliation of that receipt onto `main`). This receipt consolidates and updates both against the current `main` head, and states the remaining gates explicitly, since neither prior document listed them as a single checklist.

## Existing implementation status

Companion previously defaulted to a deterministic admission rail with no useful-answer provider (root cause documented in `RECEIPT-product-regression-audit.md`). That was recovered: one governed path now serves both text and completed voice utterances through `netlify/functions/companion-response.mts`, calling the OpenAI Responses API from the server boundary, normalized by `ResponseEngine` into a useful answer plus SPEAK/STEER fields and an evidence receipt.

## Existing evidence, verified present

- **Server-only OpenAI endpoint** — `netlify/functions/companion-response.mts` reads `process.env.OPENAI_API_KEY` and `process.env.COMPANION_OPENAI_MODEL` only inside the server function; the browser adapter (`src/prototype/companionResponseProvider.ts`) calls the function, never the provider directly.
- **No key exposure** — `RECEIPT-product-recovery.md` records a secret-leak scan (source/diff/proof/bundle) with no matches; the most recent Netlify deploy's own secret-scan report (`6a5aef25...`, scanned 251 files) also reports zero matches.
- **Shared text/voice path** — one path (`input → admission/event detection → bounded active-session context → companion-response function → ResponseEngine normalization → useful answer + SPEAK/STEER → evidence receipt`) serves both.
- **Useful-answer behavior** — the A–E deterministic scenario matrix (explain / audience-context / follow-up / active-session recall / ambiguous-input) passed against a real `openai / gpt-5.4-mini-2026-03-17` credential in bounded local verification (`RECEIPT-product-recovery.md`), not against a stub.
- **Intent/SPEAK/STEER/evidence rendering** — confirmed present in the after-recovery screenshots and in the structured four-field response schema.
- **Tests/typecheck/build passing** — `RECEIPT-product-recovery.md` recorded 21 files / 249 tests passed, `typecheck` passed, `build` passed. Independently re-verified in this session (2026-07-18, same day, immediately before this receipt): `npx vitest run` → 249/249 pass; `npx tsc --noEmit` → clean; `npx vite build` → clean. No `companion`-path source or test file has changed since `RECEIPT-product-recovery.md` was written.
- **Deployment truth** — the current production deploy (`6a5aef25941bcf0008f1ff82`, Netlify site `companion-prototype-erw`) has `commit_ref` exactly matching current `main` (`6a1e67b`) and lists `companion-response` among its three deployed functions. This happened through ordinary git-backed continuous deployment from `main`; no agent session triggered a manual deploy.

## Missing / open evidence — explicit remaining gates

1. **Physical iPhone live acceptance.** Not performed by any session. `RECEIPT-product-recovery.md` explicitly calls this an operator gate; the browser walkthrough it references uses a deterministic provider stub and proves presentation/wiring, not live-device behavior or live OpenAI quality.
2. **Dedicated production OpenAI credential.** The A–E matrix in `RECEIPT-product-recovery.md` was run with "a newly authorized development-project credential... saved only to the ignored local `.env.local`" — explicitly not a dedicated production project/service-account key. That receipt states: "Before any production deployment, create a dedicated Companion OpenAI project/service-account key and store it only in Netlify's server-side environment... If that production credential does not exist, stop with `PRODUCTION CREDENTIAL REQUIRED`." This session did not check whether Netlify's `OPENAI_API_KEY` environment variable currently holds a dedicated production credential, an interim/dev one, or is unset — that check (without reading the value) is Command 5's scope, not this receipt's.
3. **Canonical Netlify deployment.** The `companion-response` code is live on the canonical production rail (`companion-prototype-erw`, confirmed above) — but "canonical deployment" in the original gate language is entangled with gate 2: code being deployed is not the same as the *production credential* behind it being the dedicated one gate 2 requires.
4. **Production OpenAI + Deepgram retest.**
   - OpenAI: no retest has been run against the deployed Netlify function itself (as opposed to local bounded verification) with a confirmed dedicated production credential.
   - Deepgram: the last known status is `HOLD` (`verification-receipts/2026-07-13-explain-runtime-wedge-deepgram-hold.md` in `adl-companion`, dated 2026-07-13): the production `/.netlify/functions/deepgram-token` endpoint returned `502` because Deepgram rejected the configured credential as invalid. No commit has touched `netlify/functions/deepgram-token.mts` or its tests since that finding (last touched `d373a1e`, 2026-07-13), and no newer receipt supersedes the `HOLD`. This session did not attempt to re-test Deepgram live. Treat the `HOLD` as still in effect until a dated retest says otherwise.
5. **Final closure receipt.** Not written. It cannot be written until gates 1–4 above are closed with dated, first-party evidence.

## Verdict

**WORKABLE PROTOTYPE READY FOR LIVE-DEVICE ACCEPTANCE — NOT PRODUCTION-PROVEN.**

Companion's useful-response path is implemented, tested, deployed to the canonical Netlify rail, and free of key exposure in everything this session could check. It is not production-proven: the physical-device gate, the dedicated production OpenAI credential, a production-credential retest, and the Deepgram `HOLD` all remain open, human/credential-only items. No claim beyond this verdict is made.
