# Durin Multimodal Theme Intake — Slice 0 — Architecture Note

**Command 1 scope only: contracts, schemas, fixtures, acceptance matrix.**
No storage, adapters, UI, retrieval, or model assistance exists yet — those are
Commands 2–4 and are deliberately absent from this folder.

## Governing authorities

- Slice 0 Build Authorization — Notion `39d8ac7fc2f181aa8a69c1fbd83b686b`
- Historical Audio Intake Sweep Lock — Notion `39d8ac7fc2f181c285fee513b4777152`
- Google Drive build mirror — doc `1QFJC_Q6ipgh-qzTZ56YWmlGlowWV9qno0ltUsrzAxXk`

## Where this sits in the repo

The repo is a pnpm workspace (`packages/*`: `@adl/runtime`, `@adl/lenses`,
`@adl/ui`, `@adl/harness-cli`) plus this standalone Vite/React app
(`explain-runtime-build`, installed with `--ignore-workspace`, tested with
vitest). Durin Slice 0 lives inside the app, following the same pattern as the
`teacherprep/` and `prototype/` (Companion) products:

- the app is where Commands 3–4 need a review surface and retrieval page,
  behind `routeGate.ts` like the existing products;
- the vitest suite here is the repo's active test runner (146 passing tests);
- `teacherprep/store.ts` already proves the local, two-store,
  hard-privacy-wall persistence idiom the Command 2 spine will extend;
- `prototype/admissionSourceAdapter.ts` already proves the
  normalize → classify → receipt admission-rail idiom.

`packages/runtime`'s kernel envelope/receipt types were inspected and are
runtime-room primitives (rooms, lenses, replay digests), not intake
primitives; they are reused as *idiom* (versioned envelopes, digests,
receipts) rather than imported, because this app intentionally does not
depend on workspace packages.

## Layout

```
src/durin/
  contracts.ts       versioned types, LOCKED state enums, transition tables,
                     lane-visibility policy (pure functions only)
  guards.ts          deterministic dependency-free runtime validators
  schemas/           JSON Schema (2020-12) mirrors, one per core object
                     + fixture-manifest schema
  fixtures/          five synthetic fixture manifests
  ACCEPTANCE.md      A1–A10 matrix, written before implementation
tests/durinContracts.test.ts   contract/fixture/policy tests (vitest)
```

## Core objects (contract version 0.1.0)

`IntakeEnvelope → SourceArtifact → DerivedRepresentation* → ThemeAssertion* →
RouteDisposition → IntakeReceipt`, with `CorrectionTelemetry` and
`DuplicateObservation` as append-only side records. Key decisions:

- **Original vs derived is type-level.** `SourceArtifact.isOriginal` is the
  literal `true`, `DerivedRepresentation.isOriginal` the literal `false` —
  a derived record cannot satisfy the artifact contract (A2).
- **Deletion is a separate machine.** No source-state transition deletes
  anything; `DeletionState` requires explicit `requested → approved →
  executed` human escalation (A9).
- **Corrections supersede.** Assertions carry
  `supersedesAssertionId`/`supersededByAssertionId`; `superseded` and
  `rejected` are terminal review states, and every correction must emit
  `CorrectionTelemetry` (A8).
- **Lanes are closed by default.** `isVisibleInLane` opens only on an
  explicit human-approved `LaneCrossing`; `restricted_health_legal` is never
  an ordinary retrieval scope (`mayDriveOrdinaryRetrieval`) (A3, A6).
- **Fail-closed holding.** Mixed/unknown content routes to
  `unsorted_holding`; the schema-level `expectedInitialRoute` vs
  `expectedLane` split in fixtures encodes this.
- **Duplicates resolve to one canonical artifact.** `DuplicateObservation`
  requires `canonicalArtifactId`; re-import can never mint a second
  canonical source (A7).
- **Receipts are reopenable.** `IntakeReceipt.reopenDigest` is a sha-256 over
  the canonical serialization of everything the receipt references, giving
  Command 2 a deterministic reopen check (A10).

## Fixtures

Five bounded manifests, one per authorized source type, each declaring
expected lane, initial route, themes with expected review outcomes, negative
visibility, duplicate behavior, the governing retrieval-proof queries, and
A1–A10 linkage. **All five are synthetic placeholders and are truthfully
labeled as such** — the guard and schema reject any fixture whose
`provenanceLabel` does not begin with `synthetic`. No real personal data,
recordings, notes, documents, or photographs are referenced.

## What Command 2 builds on this

Append-only local ledger + hashing spine enforcing `SOURCE_TRANSITIONS` /
`REVIEW_TRANSITIONS` / `DELETION_TRANSITIONS`, idempotent admission keyed on
`contentHash`, receipt generation/reopen, audit events for transitions and
denied crossings, and the six failure injections listed in ACCEPTANCE.md.
