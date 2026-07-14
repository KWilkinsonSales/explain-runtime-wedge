# Slice 0 Acceptance & Closure Receipt — Durin Multimodal Theme Intake

**Command:** 5 of 5 — Formal acceptance and closure
**Date:** 2026-07-14
**Governing authorities:** Slice 0 Build Authorization (Notion `39d8ac7fc2f181aa8a69c1fbd83b686b`); Historical Audio Intake Sweep Lock (`39d8ac7fc2f181c285fee513b4777152`); Google Drive build mirror.
**Posture:** Acceptance only. No new features were added; the acceptance branch was cut from `main` and no source under `src/durin/` was modified during Command 5.

## Final verdict

# ✅ ACCEPTED — SLICE 0 COMPLETE

All ten acceptance criteria (A1–A10) pass with mechanical evidence against the five synthetic fixtures. One pre-existing, out-of-scope limitation is disclosed below (§Limitations); it is not a Slice 0 defect and does not block any A1–A10 claim. This verdict is a mechanical recommendation for human ratification per the operator gate.

## Environment

| Fact | Value |
|---|---|
| Branch | `claude/durin-intake-slice-0-eu4l9p`, cut fresh from `origin/main` |
| Base revision | `1f809134e2dc1a0c06be083613899c496c9c5ce4` (Commands 1–4 merged via PRs #28, #29, #30) |
| Runtime | Node v22.22.2, pnpm 9.15.9 |
| Test runner | vitest 4.1.10 (app); tsc `--noEmit` for typecheck; vite 7 build |
| Persistence | device-local only (`window.localStorage` in-app, in-memory `KeyValueBackend` in tests); **no server, no network persistence, no cloud vectors** |
| Migrations | none — the ledger is an append-only event log with a version gate that refuses (never rewrites) unknown-version stores |

## Regression battery (exact commands & results)

| Check | Command | Result |
|---|---|---|
| Root install | `pnpm install --frozen-lockfile=false` | pass |
| Root build | `pnpm build` | pass (runtime, ui, harness-cli) |
| Root lint | `pnpm lint` | pass |
| Root typecheck | `pnpm typecheck` | pass |
| Runtime proof (replay determinism) | `pnpm proof` | pass — `finalStateEqual: true`, `digestsEqual: true` |
| App suite | `npx vitest run` | **235 / 235 pass** (19 files) |
| — contracts | `npx vitest run tests/durinContracts.test.ts` | 40 pass |
| — spine | `npx vitest run tests/durinSpine.test.ts` | 26 pass |
| — adapters | `npx vitest run tests/durinAdapters.test.ts` | 9 pass |
| — retrieval | `npx vitest run tests/durinRetrieval.test.ts` | 13 pass |
| — route gate | `npx vitest run tests/routeGate.test.ts` | 5 pass |
| App typecheck | `npx tsc --noEmit` | 1 **pre-existing** error only (see §Limitations); zero Durin errors |
| App build | `npx vite build` | pass (committed `dist/` restored to base afterward) |
| Mobile smoke + fresh-session reopen | `node proof/durin/browser-walkthrough.mjs` (Chromium 1194, 390×844) | **29 / 29 assertions pass**; zero non-localhost requests |

## A1–A10 acceptance matrix

Fixtures: `durin-s0-audio-01` (audio), `durin-s0-note-01` (mixed health note), `durin-s0-pdf-01` (architecture memo), `durin-s0-photo-family-01` (teaching photo), `durin-s0-photo-object-01` (heirloom). All five are synthetic placeholders, machine-enforced to be truthfully labeled.

### A1 — Multimodal admission
- **Test/command:** `durinSpine.test.ts` › "A1 — admits all five source types through the same admit() path"; `durinAdapters.test.ts` › "imports every source type through the same rail"; `durinContracts.test.ts` › fixture-manifest validation.
- **Fixture:** all five.
- **Expected:** every source type enters through one `IntakeEnvelope`/`admit()` path with intake→artifact→derivation links.
- **Actual:** 5 artifacts, one `SOURCE_PRESERVED` each; invalid envelope denied and audited; every adapter yields a valid envelope with matching hash.
- **Evidence:** `explain-runtime-build/tests/durinSpine.test.ts`, `tests/durinAdapters.test.ts`.
- **Pass/Fail:** **PASS.** Limitation: binary payloads preserved/hashed as base64 (data-URL) serialization (documented Slice 0 representation limit).

### A2 — Source integrity
- **Test/command:** `durinSpine.test.ts` › "A2 — keeps hashes and links intact and derived records distinguishable" + hash-mismatch, missing-original, tampered-original injections; `durinContracts.test.ts` › "A2 — a derived record cannot masquerade as an original".
- **Fixture:** audio, pdf.
- **Expected:** hashes/links survive processing; `SourceArtifact.isOriginal===true`, `DerivedRepresentation.isOriginal===false`; false hash fails closed.
- **Actual:** preserved original re-hashes to admission hash; derived records carry generator provenance and `isOriginal:false`; hash mismatch denied+audited, nothing preserved.
- **Evidence:** `tests/durinSpine.test.ts` (A2 + failure-injection blocks), `tests/durinContracts.test.ts`.
- **Pass/Fail:** **PASS.**

### A3 — Lane isolation / cross-lane denial
- **Test/command:** `durinSpine.test.ts` › "A3 — keeps family material out of adl_business…", "opens exactly the approved crossing…", unauthorized-crossing injection; `durinRetrieval.test.ts` › "adversarial cross-lane query…".
- **Fixture:** family photo.
- **Expected:** family source invisible in `adl_business` without an explicit approved crossing; system actors cannot route or approve crossings.
- **Actual:** family assertion absent from business scope with a `CROSSING_DENIED` audit; an explicit human crossing opens exactly that lane, directionally; system-approved crossing rejected at the contract gate.
- **Evidence:** `tests/durinSpine.test.ts` (A3 block), `tests/durinRetrieval.test.ts` (cross-lane block).
- **Pass/Fail:** **PASS.**

### A4 — Human theme review
- **Test/command:** `durinContracts.test.ts` › "A4 — retrieval approval only on approved" + `mayDriveOrdinaryRetrieval` gating; `durinAdapters.test.ts` › "keeps history append-only and rejected assertions unapproved"; `durinRetrieval.test.ts` › "uncertain and rejected assertions never drive meaning retrieval".
- **Fixture:** note, family photo.
- **Expected:** proposed themes can be approved/corrected/rejected/uncertain; rejected/superseded/uncertain/proposed never drive retrieval.
- **Actual:** rejected stays permanently unapproved; the rejected "durin decoy" on the family photo cannot pull it into the idea search; only approved assertions appear in `matchedAssertions`.
- **Evidence:** `tests/durinContracts.test.ts`, `tests/durinAdapters.test.ts`, `tests/durinRetrieval.test.ts`.
- **Pass/Fail:** **PASS.**

### A5 — Meaning retrieval with explanation
- **Test/command:** `durinRetrieval.test.ts` › "A5 — the five governing queries with causal explanations" (Q1–Q5); browser walkthrough steps 10–11.
- **Fixture:** audio, pdf, family photo, object photo.
- **Expected:** ≥5 natural-language queries return relevant items, each explaining why (causal assertions), source ref/type, lane, review state, receipt link, confidence.
- **Actual:** all five governing queries pass — teaching photo (Q1), heirloom-with-provenance excluding the sale-approved object (Q2), founder reflections excluding health (Q3), Durin idea across lanes (Q4), unresolved/unsorted (Q5); the UI renders the query mapping and per-result causal explanation with receipt links.
- **Evidence:** `tests/durinRetrieval.test.ts` (A5 block), `proof/durin/10-search-phone.png`, `proof/durin/browser-walkthrough.mjs`.
- **Pass/Fail:** **PASS.** Limitation: retrieval is a deterministic bounded rule table by design; unmapped queries fail closed rather than guessing (this is the intended behavior, not a gap).

### A6 — Negative retrieval / restricted-health exclusion
- **Test/command:** `durinSpine.test.ts` › "A6 — excludes restricted-scope assertions from every ordinary lane" + "refuses restricted_health_legal as an ordinary query scope"; `durinRetrieval.test.ts` › Q3 + "restricted scope is unreachable through the parser and ambiguous queries fail closed"; `durinContracts.test.ts` › "A6 — restricted health never rides ordinary retrieval".
- **Fixture:** note.
- **Expected:** restricted-health item never appears in general private/family searches without explicit scope; ambiguous scope narrows or fails closed.
- **Actual:** restricted assertion excluded from every ordinary lane; `restricted_health_legal` refused as an ordinary scope and stripped from any plan; ambiguous/empty queries fail closed with narrowing suggestions.
- **Evidence:** `tests/durinSpine.test.ts`, `tests/durinRetrieval.test.ts`, `tests/durinContracts.test.ts`.
- **Pass/Fail:** **PASS.**

### A7 — Duplicate idempotency
- **Test/command:** `durinSpine.test.ts` › "A7 — FAILURE INJECTION (duplicate race)…"; `durinAdapters.test.ts` › "re-importing the same export through an adapter is idempotent"; `durinContracts.test.ts` › "A7 — a duplicate observation must resolve to a canonical artifact".
- **Fixture:** object photo (primary); all fixtures declare duplicate behavior.
- **Expected:** re-import never creates a second canonical source; yields a `DuplicateObservation` or idempotent receipt.
- **Actual:** second import → `linked_duplicate`; same-intake replay → `idempotent_receipt`; fresh session over the same backend still refuses a second canonical; exactly one `SOURCE_PRESERVED` remains.
- **Evidence:** `tests/durinSpine.test.ts` (A7 block), `tests/durinAdapters.test.ts`.
- **Pass/Fail:** **PASS.**

### A8 — Correction supersession + telemetry
- **Test/command:** `durinSpine.test.ts` › "A8 — preserves the old assertion as superseded…" + invalid-transition injections; `durinAdapters.test.ts` › append-only history; `durinContracts.test.ts` › self-supersession rejection.
- **Fixture:** pdf (misattributed author).
- **Expected:** correction preserves the old assertion as `superseded`, links both directions, records `CorrectionTelemetry` with a cause; terminal states stay terminal.
- **Actual:** old → `superseded` with `supersededByAssertionId`; replacement links back via `supersedesAssertionId`; telemetry cause recorded; superseded value stops driving retrieval; `rejected`/`superseded` remain terminal.
- **Evidence:** `tests/durinSpine.test.ts` (A8 block), `tests/durinAdapters.test.ts`.
- **Pass/Fail:** **PASS.**

### A9 — Explicit no-delete boundary
- **Test/command:** `durinSpine.test.ts` › "A9 — never executes deletion in Slice 0, even after explicit request and approval" + "denies deletion shortcuts and non-human deletion authority"; `durinContracts.test.ts` › "A9 — no source transition implies deletion"; `durinAdapters.test.ts` › "states the no-delete boundary verbatim in the UI source".
- **Fixture:** note, object photo.
- **Expected:** `processed`/`routed`/`archived`/`held` distinct from deletion; only a separate explicit human action can delete; Slice 0 executes no deletion.
- **Actual:** `executeDeletion` is refused unconditionally (returns `never`, throws `DELETION_EXECUTION_REFUSED`) even after human request+approval; the refusal is audited; the original bytes remain; no `SOURCE_TRANSITIONS` edge deletes; the surface states the boundary verbatim on every screen and the receipt. **Static confirmation:** no Durin logic ever calls `.removeItem()` (it exists only as the `KeyValueBackend` interface method + memory-backend impl).
- **Evidence:** `tests/durinSpine.test.ts` (A9 block), `tests/durinContracts.test.ts`, `src/durin/spine.ts:631` (`executeDeletion`).
- **Pass/Fail:** **PASS.**

### A10 — Deterministic receipt reopen
- **Test/command:** `durinSpine.test.ts` › "A10 — reopens to identical records and digest, including from a fresh session" + corrupted-receipt-reference and mutated-ledger injections + unknown-store-version refusal; `durinContracts.test.ts` › receipt reopen-digest requirement; browser walkthrough step 8 ("reopen verifies deterministically in the browser").
- **Fixture:** audio.
- **Expected:** reopening a receipt reconstructs the same source, derivations, approved themes, and disposition, from a fresh session.
- **Actual:** reopen replays the ledger to the receipt's own seq; identical records+digest in-session and in a fresh spine over the same backend; a post-receipt correction does not disturb reopen; adversarial re-signed tamper caught by the reopen digest; naive tamper caught by the hash chain; unknown store version refused without destructive migration; browser reopen verifies live.
- **Evidence:** `tests/durinSpine.test.ts` (A10 block), `proof/durin/08-receipt-phone.png`, `proof/durin/browser-walkthrough.mjs`.
- **Pass/Fail:** **PASS.**

## Failure-injection results (all caught / fail-closed)

| Injection | Behavior | Location |
|---|---|---|
| Hash mismatch at admission | denied + `ADMISSION_DENIED` audit; nothing preserved | `durinSpine.test.ts` A2 |
| Missing original before derivation | derivation refused + `TRANSITION_DENIED` audit | `durinSpine.test.ts` A2 |
| Tampered original (hash drift) | derivation refused | `durinSpine.test.ts` A2 |
| Duplicate race | one canonical artifact; second → duplicate observation | `durinSpine.test.ts` A7 |
| Invalid transition (review + source) | denied + `TRANSITION_DENIED` audit | `durinSpine.test.ts` A8 |
| Unauthorized crossing (system route / system-approved / cross-lane query) | denied/rejected + audit | `durinSpine.test.ts` A3, `durinRetrieval.test.ts` |
| Corrupted receipt reference (re-signed chain) | `REOPEN_DIGEST_MISMATCH` | `durinSpine.test.ts` A10 |
| Mutated ledger (naive) | `LedgerIntegrityError` on load | `durinSpine.test.ts` A10 |
| Unknown store version | refused without destructive migration | `durinSpine.test.ts` A10 |
| Source-text prompt injection | proposals stay `proposed`; no approve/route/cross/delete; nothing surfaces | `durinRetrieval.test.ts` |
| Unsupported provider claim | rejected with reason, never filed | `durinRetrieval.test.ts` |
| Provider lane-smuggling | scope forced to artifact's own lane (fail-closed to holding) | `durinRetrieval.test.ts` |

## Privacy / security proof

- **Lane isolation:** closed by default; cross-lane visibility only via an explicit human-approved `LaneCrossing`; denials audited (A3).
- **Restricted health/legal:** never an ordinary retrieval scope; stripped from any query plan; unreachable through the parser (A6).
- **Family/private → business:** requires an approved crossing; thematic similarity alone never promotes private content (A3).
- **Bounded assistance:** the `ThemeProposalProvider` is proposal-only by construction — output can only enter review as `proposed`; it cannot choose a lane, admit, route, cross, delete, send, or share. No model provider ships; the default is a deterministic keyword table with a `manual-only` fallback. No content leaves the device (no network provider exists).
- **Determinism-before-model:** deterministic retrieval passes in full; no embeddings, no cloud vectors, no silent cross-lane learning.

## Deployment status (truthful)

**Not deployed.** This receipt certifies Slice 0 acceptance only. No deploy, publish, or production cutover was performed or is claimed. The Netlify deploy previews that appeared on PRs #28–#30 are repository-configured preview builds triggered by the platform on every PR — they are not a production release and were not initiated as part of this work. **No production-readiness, Apple-integration, family-account, cloud-scale, or commercialization claim is made.**

## No-original-deletion statement

No original was deleted, moved, overwritten, or altered at any point across Commands 1–5. Deletion is modeled as a separate explicit state machine whose execution step is refused unconditionally in Slice 0 (`executeDeletion` throws `DELETION_EXECUTION_REFUSED`). No Durin spine or adapter code path calls any storage-removal API. Preservation is byte-for-byte, verified by re-hashing.

## Real personal data

**None used.** Every fixture, test input, and walkthrough input is a synthetic placeholder, machine-enforced (contract + schema) to carry a `provenance_label` beginning with `synthetic`. No real recordings, notes, documents, photographs, health data, or personal information were referenced or ingested.

## Changed files in Command 5

Only this acceptance receipt (`proof/durin/RECEIPT-2026-07-14-command-5-acceptance.md`). No `src/durin/` source, tests, schemas, or fixtures were modified during acceptance. The transient vite `dist/` rebuild was reverted; the Playwright walkthrough's `shots/` output and the ad-hoc `playwright-core` symlink were removed.

## Deferrals & limitations

- **Disclosed pre-existing limitation (not a Slice 0 defect):** the app-level `npx tsc --noEmit` reports one error in `tests/deepgramTokenFunction.test.ts` (`TS5097`, a `.mts` import). It predates all Durin work (verified on the base commit at Command 1), lives entirely outside Durin scope, and does **not** affect Durin's compilation, the vitest suite (235/235), the app build, or CI (CI runs the root pnpm checks, which pass). Recommend a one-line fix under separate authorization; it is out of scope for Slice 0.
- **Deferred by authorization (not built):** full Apple Photos indexing, face recognition, automatic relationship inference, background iPhone monitoring, Apple Notes deletion, shared-family permissions, cloud-scale vector search, resale listings/pricing, generative photo alteration, and any model-backed proposal provider (interface + gate are ready for one under separate authorization).
- **Representation limit:** binary sources are preserved/hashed as their base64 (data-URL) serialization.
- **Retrieval scope:** deterministic bounded rule table; extending it is a governed change, not a bug fix.

## Exit condition

Slice 0's exit condition — the five fixtures passing A1–A10 with originals, privacy boundaries, themes, retrieval, and receipts behaving as specified — is met. This receipt awaits human acceptance to close the pack.
