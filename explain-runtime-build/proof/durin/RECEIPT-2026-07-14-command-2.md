# Command Receipt — Durin Multimodal Theme Intake, Slice 0, Command 2

**Date:** 2026-07-14
**Command:** 2 of 5 — Deterministic local spine
**Branch:** `claude/durin-intake-slice-0-eu4l9p` (restarted from `main` @ `8033c0c` after PR #28 merged Command 1)
**Verdict:** Command 2 mechanically complete; awaiting human review before Command 3.

## Preconditions verified

- Command 1 merged to `main` via PR #28 (human acceptance of the Command 1 receipt).
- Designated branch restarted from latest `main` per merged-PR follow-up rule:
  `git fetch origin main && git checkout -B claude/durin-intake-slice-0-eu4l9p origin/main`.

## What was built (all under `explain-runtime-build/`, no existing behavior changed)

| File | Role |
|---|---|
| `src/durin/sha256.ts` | Pure synchronous FIPS 180-4 SHA-256 + canonical (key-sorted) JSON. Vector-tested. Chosen because WebCrypto digest is async-only and Node crypto is absent in the browser — one deterministic hasher for both environments, zero dependencies. |
| `src/durin/ledger.ts` | `DurinLedger`: append-only event log over the `KeyValueBackend` idiom from `teacherprep/store.ts`. Every entry hash-chains over its canonical serialization + previous hash; the full chain is verified on every load; unknown store versions are refused (no destructive migration). `append` is the only write path — no update/delete API exists. |
| `src/durin/spine.ts` | `DurinSpine` domain services: idempotent hash-keyed admission with preserve-before-advance, fail-closed holding, integrity-checked derivation, append-only review history, correction by supersession + telemetry, human-only closed-by-default routing, explicit deletion state machine with unconditional Slice 0 execute-refusal, receipt issuance with reopen digest, deterministic ledger-replay reopen, audit entries for every denial, lane-gated ordinary queries. |
| `tests/durinSpine.test.ts` | 26 deterministic tests: coverage for A1, A2, A3, A6, A7, A8, A9, A10 + all six failure injections. |
| `src/durin/README.md` | Architecture note updated for the spine (edit). |
| `src/durin/ACCEPTANCE.md` | A1–A10 status column refreshed to post-C2 truth (edit). |
| `proof/durin/RECEIPT-2026-07-14-command-2.md` | This receipt. |

## Enforcement proven by test (exact behaviors)

- **A1** — all five source types admitted through one `admit()` path with intake↔artifact links; invalid envelope denied + `ADMISSION_DENIED` audit.
- **A2** — original/derived distinction survives processing; preserved original re-hashes to the admission hash; ledger chain verifies end-to-end.
- **A3** — family assertion invisible in `adl_business` (+ `CROSSING_DENIED` audit); an explicit human crossing opens exactly that lane, directionally, nothing else.
- **A6** — restricted-scope assertion excluded from every ordinary lane; `restricted_health_legal` refused outright as an ordinary query scope.
- **A7** — duplicate race: second import → `linked_duplicate`, same-intake replay → `idempotent_receipt`, fresh session still refuses; exactly one `SOURCE_PRESERVED` in the ledger.
- **A8** — correction preserves old assertion as `superseded` with bidirectional links + `CorrectionTelemetry(cause=wrong_person)`; superseded value no longer drives retrieval; terminal review states stay terminal.
- **A9** — `executeDeletion` refused even after explicit human request+approval; refusal audited; original bytes untouched; deletion shortcuts and non-human deletion authority denied.
- **A10** — reopen replays the ledger to the receipt's own seq: identical records and digest in the issuing session and in a fresh session; a post-receipt correction does not disturb reopen.
- **Fail-closed holding** — hintless or hold-requested material lands `held` + `unsorted_holding` with unresolved questions; direct routing from `held` denied; human walks it `held → reviewed → admitted → routed`.

## Failure injections (all six, implemented and passing)

1. **Hash mismatch** — false declared hash: admission denied, audited, nothing preserved.
2. **Missing original** — preservation path broken: derivation + `originalContent` refuse, audited. Bonus: tampered original (hash drift) also refuses.
3. **Duplicate race** — see A7 above.
4. **Invalid transition** — `rejected → approved`, `rejected → superseded`, `preserved → routed`, `preserved → admitted` all denied + `TRANSITION_DENIED` audits.
5. **Unauthorized crossing** — system actor cannot route; system-"approved" crossing rejected at the contract gate; cross-lane query denials audited.
6. **Corrupted receipt reference** — adversarial tamper that re-signs the whole chain is still caught by the reopen digest (`REOPEN_DIGEST_MISMATCH`); naive tamper is caught earlier by the hash chain (`LedgerIntegrityError`); unknown store version refused without migration.

## Exact commands and results

| Command | Result |
|---|---|
| `npx vitest run tests/durinSpine.test.ts` | 26/26 pass |
| `npx vitest run` | **212/212 pass** (17 files: 146 pre-C1 + 40 C1 + 26 C2) |
| `npx tsc --noEmit` | only the **pre-existing** `tests/deepgramTokenFunction.test.ts` TS5097 error (documented in the Command 1 receipt); zero new errors |

## Contradiction checks (none triggered)

- **"Existing ledger materially mutable?"** The storage medium (localStorage/memory KV) is mutable, but the ledger makes mutation detectable and fail-closed: full hash-chain verification on load, reopen-digest verification on receipt reopen, and a version gate against silent migration. Tested under both naive and adversarial (re-signed) tampering. Lane isolation and idempotency are enforced and tested. No contradiction.

## Failures / risks / deferrals

- Pre-existing app `tsc --noEmit` error unchanged (out of scope, documented since Command 1).
- `whatRemainedPrivate` accounting is conservative (artifact listed when no crossings exist); Command 3's review surface may refine presentation without changing the record.
- Not built (as ordered): AI proposals, cloud vectors, external sending, auto-sharing, deletion execution, adapters, UI, retrieval surface.
- No real personal data used; all test content is synthetic and labeled.
- Push interpretation unchanged from Command 1: filed to the designated branch as a draft PR for human review; no merge, no deploy.

## Next authorized command

Command 3 — Manual adapters and review surface — **only after this receipt is
reviewed and accepted by a human.**
