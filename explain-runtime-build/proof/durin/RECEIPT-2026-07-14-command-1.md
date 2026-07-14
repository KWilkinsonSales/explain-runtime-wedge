# Command Receipt — Durin Multimodal Theme Intake, Slice 0, Command 1

**Date:** 2026-07-14
**Command:** 1 of 5 — Repository truth, contracts, and fixtures
**Branch:** `claude/durin-intake-slice-0-eu4l9p`
**Verdict:** Command 1 mechanically complete; awaiting human review before Command 2.

## Governing authorities read before editing

- Slice 0 Build Authorization — Notion `39d8ac7fc2f181aa8a69c1fbd83b686b` (read in full)
- Historical Audio Intake Sweep Lock — Notion `39d8ac7fc2f181c285fee513b4777152` (read in full)
- Google Drive build mirror — doc `1QFJC_Q6ipgh-qzTZ56YWmlGlowWV9qno0ltUsrzAxXk` (read in full)

## Actual repository truth (inspected, not assumed)

- **Repo root:** `explain-runtime-wedge`, pnpm 9.15.9 workspace (`packages/*`),
  TypeScript strict, base commit `27e23cd`.
- **Workspace packages:** `@adl/runtime` (room kernel, envelopes, invariants,
  replay digests, `UnderstandingReceipt`), `@adl/lenses`, `@adl/ui`,
  `@adl/harness-cli` (proof CLI). Lint/typecheck are `tsc --noEmit`; no eslint.
- **App:** `explain-runtime-build` — standalone Vite/React app (NOT a workspace
  member; installed with `pnpm install --ignore-workspace`), vitest test runner,
  Cloudflare worker config, Netlify deploy of `dist/` (note: `dist/` is
  committed). Products: Companion (`src/prototype`) and LDS Teacher Prep
  (`src/teacherprep`) behind `src/routeGate.ts`.
- **Existing governed primitives found and reused as idiom:**
  `teacherprep/store.ts` (two local stores, hard shared/private wall — the
  privacy-lane persistence precedent), `prototype/admissionSourceAdapter.ts`
  (normalize → classify → receipt admission rail), `@adl/runtime` receipts and
  digests, `proof/*/RECEIPT.md` receipt filing convention. No existing Durin,
  intake-ledger, provenance, or theme primitives existed; nothing was duplicated.
- **Persistence:** device-local storage only; no server database, no network
  persistence anywhere in the app.

## Baseline checks (before changes)

| Check | Command | Result |
|---|---|---|
| Root install | `pnpm install --frozen-lockfile=false` | pass |
| Root build | `pnpm build` | pass (runtime, ui, harness-cli) |
| Root lint | `pnpm lint` | pass |
| Root typecheck | `pnpm typecheck` | pass |
| Runtime proof | `pnpm proof` | pass — `finalStateEqual: true`, `digestsEqual: true` |
| App install | `pnpm install --ignore-workspace` | pass |
| App tests | `npx vitest run` | **146/146 pass** |
| App typecheck | `npx tsc --noEmit` | **PRE-EXISTING FAILURE** — `tests/deepgramTokenFunction.test.ts(2,27) TS5097` (`.mts` import needs `allowImportingTsExtensions`). Verified present on clean base commit via stash. Not fixed: outside Command 1 scope; vitest and CI are unaffected (CI runs root checks only). |
| App build | `npx vite build` | pass (tracked `dist/` restored to base state afterward; no dist churn committed) |

## Changed files (all new; no existing file modified, no originals touched)

```
explain-runtime-build/src/durin/contracts.ts        versioned types, LOCKED enums, transition tables, lane policy
explain-runtime-build/src/durin/guards.ts           deterministic dependency-free validators
explain-runtime-build/src/durin/schemas/            9 JSON Schemas (8 core objects + fixture manifest), draft 2020-12
explain-runtime-build/src/durin/fixtures/           5 synthetic fixture manifests
explain-runtime-build/src/durin/ACCEPTANCE.md       A1–A10 matrix (written before implementation)
explain-runtime-build/src/durin/README.md           architecture note
explain-runtime-build/tests/durinContracts.test.ts  40 contract/schema/fixture/policy tests
explain-runtime-build/proof/durin/RECEIPT-2026-07-14-command-1.md  this receipt
```

## Evidence

- `npx vitest run` after changes: **186/186 pass** (146 pre-existing + 40 new).
- New tests prove: locked enums exact; governed source/review/deletion
  transitions (including no-delete escalation A9 and terminal superseded A8);
  original/derived type-level distinction (A2); retrieval approval only on
  approved assertions (A4); human-only lane crossings and directional
  closed-by-default visibility (A3); restricted-health exclusion from ordinary
  retrieval (A6); duplicate observations must resolve to one canonical
  artifact (A7); receipts require reopen digests (A10); all five fixtures
  validate, are truthfully labeled synthetic, cover A1–A10 in union, route the
  mixed fixture to holding first, and pin the five governing retrieval queries.
- State enums locked exactly as authorized: source (9), review (6),
  deletion (5), lanes (7).

## Contradiction checks (none triggered)

- Destructive migration: none — all files are new, no schema/store migration exists yet.
- Trustworthy preservation path: available — content-hash contract plus local
  immutable-artifact storage precedent; enforced in Command 2.
- Lane isolation enforceability: enforceable — pure policy functions defined
  and tested; storage enforcement is Command 2 scope.

## Failures / risks / deferrals

- **Pre-existing:** app `tsc --noEmit` failure in `deepgramTokenFunction.test.ts`
  (documented above; recommend a one-line fix under separate authorization).
- **Deferral:** schemas are validated structurally (parse, versioning,
  closed-world, required/properties parity) plus semantically via the mirrored
  guards; a full JSON-Schema validator dependency (e.g. ajv) was deliberately
  not added to keep Command 1 dependency-free. Command 2 may revisit.
- **Not built (as ordered):** AI theme generation, real iPhone ingestion,
  deletion, moving, archiving, storage spine, adapters, UI, retrieval.
- **No real personal data used:** all five fixtures are synthetic placeholders
  and are machine-enforced to be labeled as such.
- **Push interpretation:** the command pack forbids external effects without
  authorization; this session was explicitly provisioned with the designated
  development branch `claude/durin-intake-slice-0-eu4l9p` and standing
  instructions to commit, push, and open a draft PR there for human review.
  Work is filed to that branch only — draft PR, no merge, no deploy, no other
  external effect.

## Next authorized command

Command 2 — Deterministic local spine (append-only ledger, idempotent
admission, receipts, audit events, failure injection) — **only after this
receipt is reviewed and accepted by a human.**
