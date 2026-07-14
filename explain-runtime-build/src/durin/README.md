# Durin Multimodal Theme Intake — Slice 0 — Architecture Note

**Commands 1–4 complete: contracts, schemas, fixtures, acceptance matrix,
the deterministic governed spine, manual source adapters, the review surface
at `/durin`, deterministic meaning retrieval, and the bounded proposal-only
theme provider.** Command 5 (formal acceptance) has not run.

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
  sha256.ts          pure synchronous SHA-256 + canonical JSON (Node/browser)
  ledger.ts          append-only, hash-chained event ledger over a KV backend
  spine.ts           domain services: admission, derivation, review,
                     correction, routing, deletion states, receipts, reopen,
                     audit, lane-gated queries
  adapters.ts        five bounded manual adapters over one shared import rail
  retrieval.ts       deterministic bounded query mapping + lane-gated
                     retrieval with causal match explanations
  themeProposal.ts   replaceable proposal-only ThemeProposalProvider
                     (deterministic keyword default + manual-only fallback)
  featureFlag.ts     single flip for the /durin surface
  ui/                review surface: import → preview → lane → derivation →
                     themes → review → disposition → receipt → search
  schemas/           JSON Schema (2020-12) mirrors, one per core object
                     + fixture-manifest schema
  fixtures/          five synthetic fixture manifests
  ACCEPTANCE.md      A1–A10 matrix, written before implementation
tests/durinContracts.test.ts   contract/fixture/policy tests (vitest)
tests/durinSpine.test.ts       spine coverage + six failure injections
tests/durinAdapters.test.ts    adapter rail + review-history tests
tests/durinRetrieval.test.ts   five governing queries + adversarial set
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

## The Command 2 spine

Event-sourced and append-only. Every state change is an entry in
`DurinLedger` (`ledger.ts`): hash-chained (`entryHash` over the canonical
serialization + `prevHash`), verified in full on every load, persisted
through the same `KeyValueBackend` idiom as `teacherprep/store.ts`. The
storage medium is mutable, so the ledger makes mutation *detectable and
fail-closed* rather than pretending otherwise: naive tampering breaks the
chain; an adversarial re-signed tamper of a receipt is still caught by the
reopen digest. Loading an unknown store version refuses rather than
migrating destructively.

`DurinSpine` (`spine.ts`) is the only write path and enforces:

- **Idempotent admission** keyed on `contentHash` — the original is
  preserved to the content store before any state advances; a declared-hash
  mismatch is denied and audited; a re-import yields a
  `DuplicateObservation` (`linked_duplicate` or `idempotent_receipt`),
  never a second canonical artifact (A7).
- **Fail-closed holding** — a `null` privacy hint or an explicit hold
  request lands the source in `held` with a system-authored
  `unsorted_holding` disposition and unresolved questions; only a human can
  walk it through `held → reviewed → admitted → routed`.
- **Derivation integrity** — deriving re-reads and re-hashes the stored
  original; a missing or mutated original is denied and audited (A2).
- **Append-only review history** — proposals, reviews, corrections are
  ledger entries; corrections supersede with bidirectional links plus
  `CorrectionTelemetry`, and terminal states stay terminal (A8).
- **Closed-by-default routing** — routing requires a human authority and an
  `admitted` source; crossings are human-approved, directional, and checked
  at query time; denied crossings append `CROSSING_DENIED` audit entries
  (A3); `restricted_health_legal` is refused as an ordinary query scope
  outright (A6).
- **No-delete boundary** — deletion is its own explicit state machine and
  `executeDeletion` is refused unconditionally in Slice 0, with the refusal
  itself audited (A9).
- **Deterministic receipts** — `issueReceipt` digests the canonical
  serialization of everything it references; `reopenReceipt` replays the
  ledger to the receipt's own seq and fails closed on any digest drift, so
  a fresh session reconstructs identical records even after later
  corrections (A10).

Hashing is a pure synchronous SHA-256 (`sha256.ts`, FIPS 180-4,
vector-tested) so the spine behaves identically in vitest and in the
browser surface that arrives in Command 3 — WebCrypto's digest is
async-only and Node's crypto module doesn't exist in the browser.

## The Command 3 adapters and review surface

Manual source adapters (audio, note/text, PDF/scan, image, object photo)
preserve the exact export before derivation, hash before admission, and feed
`DurinSpine.admit` through one shared rail; the `/durin` surface runs the
minimum responsive review flow with ORIGINAL/DERIVED badges, first-class
manual tagging, fail-closed lane defaults, and no-delete language throughout.

## The Command 4 retrieval and bounded assistance

`retrieval.ts` maps operator language through a fixed, visible rule table —
no embeddings, no model, no cloud vectors. Queries that match no rule fail
closed with narrowing suggestions instead of guessing a scope. Matching runs
only over the spine's lane gate (approved + retrievable + non-restricted,
crossings honored, denials audited) plus safe source metadata, and every
result lists the causal assertions and terms that made it match, with lane,
review state, confidence, and receipt link. Status queries ("unresolved or
unsorted") report held sources, unresolved questions, and uncertain
assertions in ordinary lanes only.

`themeProposal.ts` is the bounded assistance: a replaceable
`ThemeProposalProvider` whose output can only ever enter the review queue as
`proposed` — the apply gate rejects unsupported claims (evidence text must
exist in the derived representation), forces privacy scope to the artifact's
own disposition (fail-closed to holding), clamps confidence, and records
provider/version/method plus the configuration hash on every proposal. The
shipped default is a deterministic keyword table; `manual-only` is the
no-model fallback. A future model-backed provider plugs into the same
interface and the same gate: it cannot choose a lane, admit, cross, delete,
send, or share.

## What Command 5 does with this

Formal Slice 0 acceptance: regression + A1–A10 against the five fixture
manifests, failure injection, mobile smoke, fresh-session receipt reopen,
adversarial lane retrieval, and the human acceptance receipt.
