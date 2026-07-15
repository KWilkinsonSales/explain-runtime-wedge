# Receipt 01B — Selector Copy and Status-Language Reconciliation

Date: 2026-07-15 (America/Phoenix)

Repository: `KWilkinsonSales/explain-runtime-wedge`

Base: GitHub `main` at `32c7b3e9fb40ad8db3307af13d3bf8ab75ef6bc7`

Branch: `agent/reconcile-canonical-rail-and-selector`

Governing source: [2026-07-15 — Source Assessment — LLM Runtime / Active Listening / Multimodal Next Phases](https://app.notion.com/p/39e8ac7fc2f18100a66cffc3973a0249), section "Surface selector naming and status lock — July 15, 2026"

## Verdict

**ACCEPTED — SELECTOR COPY RECONCILED; CANONICAL RAIL RECONFIRMED, NOT REOPENED**

## What this receipt closes

Receipt 01 (`RECEIPT-01-repository-deployment-truth.md`) recorded two open
contradictions as of 2026-07-14/15:

1. The deployed `ProductSelector.tsx` copy did not match the governing
   source's exact canonical card copy.
2. Whether the Netlify wedge or a separate Vercel `adl-companion` rail
   governs the Companion acceptance receipt was unresolved in that
   receipt's own read-only inspection.

Receipt 01A (`RECEIPT-01A-canonical-rail-reconciliation.md`, merged to
`main` via PR #32 prior to this branch) already resolved contradiction 2:
`companion-prototype-erw` is canonical; Vercel/`adl-companion` is
superseded for this prototype phase. Receipt 01A explicitly deferred
contradiction 1 — "the product selector copy was not changed; that remains
a separate small reconciliation after status evidence is settled." This
receipt is that deferred reconciliation. **It does not reopen or modify the
rail decision.**

## Independent verification of the rail decision

Before touching any code, the governing Notion source was read directly
(not taken on the strength of Receipt 01A's summary alone). It discusses
only the `explain-runtime-wedge` Netlify implementation under "Current
implementation truth" — the Deepgram-first rail, `ADLDeepgram` secret
resolution, sanitized diagnostics, fallback ladder, response engine, and
SPEAK/STEER loop it describes match this repository's merged code exactly.
The source contains no mention of Vercel or a separate `adl-companion`
rail anywhere. That silence, on a source that is otherwise explicit about
every other open question, corroborates Receipt 01A's decision rather than
contradicting it. No change was made to the rail decision or to
`README.md`'s canonical-rail section.

## Selector copy change

`explain-runtime-build/src/ProductSelector.tsx` card copy was changed to
the governing source's exact strings, and a comment was added pointing
future edits back to the Notion lock:

| Card | Before | After (canonical) |
|---|---|---|
| Teacher | `This Week · Prepare · Teach` | `Prototype — curriculum workflow` |
| Companion | `Live listening prototype` | `Prototype — live listening` |
| Durin (name) | `Durin Intake` | `Durin Intake — Governed Multimodal Intake` |
| Durin (status) | `Governed multimodal intake · Slice 0` | `Accepted foundation — Slice 0 complete` |

Per the governing source's naming rule, "Slice 0" moved out of the Durin
product title and into the status line, and the card name now matches the
full canonical product title.

**No status was upgraded.** Teacher and Companion remain `Prototype —
<detail>`; only Durin carries `Accepted foundation`, matching the
governing source's own disposition ("Durin Intake: accepted foundation";
"Teacher Preparation" and "Companion: built and merged prototype... Do not
upgrade either Prototype card to Accepted foundation merely because the
code is merged or the selector is deployed"). This receipt does not claim
Companion's 60-second real-iPhone Deepgram live-device proof is complete —
that remains open per the governing source's "Companion / Deepgram"
section and is unaffected by this change.

## Files changed

- `explain-runtime-build/src/ProductSelector.tsx` — canonical card copy and a governance comment.
- `explain-runtime-build/proof/locked-loaded/RECEIPT-01B-selector-status-reconciliation.md` — this receipt.

## Scope and invariants

- `src/routeGate.ts` and its routing logic (which surface a path resolves
  to) were not changed — only the selector's displayed text.
- No feature flag, function code, token handling, environment variable, or
  production deploy was changed.
- Receipt 01 and Receipt 01A were not modified.
- Durin Slice 0 implementation and its historical receipts were not
  reopened.
- No status label was promoted past what the governing source authorizes.

## Verification

1. `npm test` — 238/238 tests pass across 19 files, including
   `tests/routeGate.test.ts` unchanged (routing logic itself did not
   change).
2. `npm run typecheck` — clean.
3. `npx vite build` — production bundle contains the four canonical
   strings verbatim and none of the four superseded strings.
4. Local production-build server (`vite preview`), Playwright-driven:
   `/`, `/teacher`, `/companion/prototype`, `/durin` each returned HTTP 200
   at a phone viewport (390×844) and a tablet viewport (820×1180) — 8/8.
5. Screenshots of `/` at both widths confirm the longer Durin card title
   wraps cleanly with no overflow or clipping.
6. Direct `curl` against the live production URL was attempted and
   blocked by this sandbox's egress policy (`CONNECT tunnel failed,
   response 403` for `*.netlify.app`) — this is an environment network
   restriction, not evidence about the production site. Route verification
   above was therefore performed against a fresh local build of the exact
   commit being proposed, which is a stronger correctness check than an
   unauthenticated external curl would have been.

## Commands

```bash
git fetch origin main
git checkout -B agent/reconcile-canonical-rail-and-selector origin/main
git log --oneline -3
cat src/ProductSelector.tsx
cat src/routeGate.ts src/main.tsx
grep -rn "ps-desc|This Week|Live listening prototype|Governed multimodal intake" tests/ src/
# edit src/ProductSelector.tsx
npm install --no-package-lock
npm test
npm run typecheck
npx vite build
grep -o "LDS Teacher Preparation.*|Prototype — curriculum workflow|Prototype — live listening|Durin Intake — Governed Multimodal Intake|Accepted foundation — Slice 0 complete" dist/assets/*.js
npx vite preview --port 4175
# Playwright: / /teacher /companion/prototype /durin at 390x844 and 820x1180, screenshot /
```

Commit, push, and draft-PR publication commands are recorded by Git
history and the resulting draft PR.
