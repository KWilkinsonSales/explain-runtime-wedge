# Durin Multimodal Theme Intake — Slice 0 — A1–A10 Acceptance Matrix

Written **before** feature implementation, per Command 1 of the build authorization
(Notion `39d8ac7fc2f181aa8a69c1fbd83b686b`). Status column reflects actual repo truth
as of 2026-07-14 after Command 2: contract-level tests live in
`tests/durinContracts.test.ts`, spine coverage and the six failure injections in
`tests/durinSpine.test.ts`; adapter/UI (C3) and retrieval (C4) tests are specified
here and land in Commands 3–4.

Fixture ids: `durin-s0-audio-01` (audio), `durin-s0-note-01` (mixed health note),
`durin-s0-pdf-01` (Durin architecture memo), `durin-s0-photo-family-01` (teaching photo),
`durin-s0-photo-object-01` (heirloom sewing machine).

| # | Name | Invariant under test | Fixtures | Planned tests (Command) | Negative / failure injections | Status |
|---|------|----------------------|----------|-------------------------|-------------------------------|--------|
| A1 | Multimodal admission | All five fixture types enter through the same `IntakeEnvelope` contract and produce source-linked records. | all five | `durinContracts.test.ts` — every fixture manifest validates; one envelope per fixture validates (C1). Spine: one `admit()` path for all five, records linked intake→artifact→derived (C2). Adapters: one envelope across all adapters (C3). | Envelope with unknown `sourceType` rejected; envelope missing `contentHash` rejected. | contract tests (C1) + spine admission tests (C2) implemented; adapters specified (C3) |
| A2 | Source integrity | Hashes and source links survive processing; derived outputs cannot masquerade as originals. | audio, pdf | Contract: `SourceArtifact.isOriginal === true` / `DerivedRepresentation.isOriginal === false` enforced by guards and schemas (C1). Spine: hash recomputed after derivation equals admission hash (C2). | Inject hash mismatch → admission fails closed; attempt to store a derived record as artifact → guard rejects. | contract (C1) + spine (C2) tests implemented |
| A3 | Lane isolation / cross-lane denial | A family source is not visible in `adl_business` retrieval unless an explicit approved crossing exists. | family photo | Contract: `isVisibleInLane` denies family→business with empty crossings, allows with an explicit human-approved crossing (C1). Spine: denied crossings emit audit events (C2). Retrieval: adversarial cross-lane queries (C4). | Crossing approved by `actorType: "system"` rejected by guard/schema; unauthorized crossing attempt injected (C2). | contract (C1) + spine enforcement (C2) tests implemented; retrieval specified (C4) |
| A4 | Human theme review | Proposed themes can be approved, corrected, rejected, or marked uncertain; rejected themes do not drive retrieval. | note, family photo | Contract: `REVIEW_TRANSITIONS` legality; `mayDriveOrdinaryRetrieval` false for rejected/proposed/uncertain/superseded (C1). Review surface: approve/correct/reject/uncertain flows (C3). | `approvedForRetrieval: true` with non-approved reviewState rejected by guard and schema; invalid review transition injected (C2). | contract (C1) + spine review-history tests (C2) implemented; UI specified (C3) |
| A5 | Meaning retrieval with explanation | At least five natural-language queries return relevant items with match explanations (why, source, lane, review state, receipt link, confidence). | audio, pdf, family photo, object photo | Fixture manifests pin the five governing queries and their true positives (C1). Deterministic retrieval + explanation rendering (C4). | Unsupported-claim and prompt-injection-in-source-text checks (C4). | queries pinned in fixtures (C1); lane gate enforced in spine (C2); retrieval specified (C4) |
| A6 | Negative retrieval / health exclusion | A restricted-health item never appears in general private-journal or family-memory searches without explicit scope. | note | Contract: `mayDriveOrdinaryRetrieval` false for `restricted_health_legal` scope; `ORDINARY_RETRIEVAL_LANES` excludes it (C1). Retrieval: negative queries from the note fixture (C4). | Ambiguous scope must narrow or fail closed (C4). | contract (C1) + spine exclusion tests (C2) implemented; retrieval specified (C4) |
| A7 | Duplicate idempotency | Re-import never creates a second canonical source; it creates a `DuplicateObservation` or idempotent receipt. | object photo (primary), all fixtures define duplicate behavior | Contract: `DuplicateObservation` validates and requires a canonical artifact link (C1). Spine: double-admit same hash → one artifact + one observation; duplicate race injected (C2). | Duplicate race injection; observation without canonical link rejected (C1/C2). | contract (C1) + spine (C2) tests implemented |
| A8 | Correction supersession + telemetry | A corrected assertion preserves the old one as `superseded`, links both directions, and records why. | pdf (misattributed author) | Contract: `CorrectionTelemetry` validates; self-supersession rejected; `superseded` is terminal in `REVIEW_TRANSITIONS` (C1). Spine: correction produces new assertion + telemetry, history append-only (C2). | Attempt to edit an assertion in place (no supersession link) fails; telemetry with identical ids rejected (C1). | contract (C1) + spine (C2) tests implemented |
| A9 | No-delete boundary | `processed`/`routed`/`archived`/`held` are clearly distinct from deletion; only a separate explicit human action can delete. | note, object photo | Contract: deletion is its own locked state machine; no `SOURCE_TRANSITIONS` edge deletes; `executed` reachable only via `requested → approved` (C1). Spine + UI: no-delete language, explicit states (C2/C3). | `not_requested → executed` illegal; deletion approval by system actor out of scope for Slice 0 (human only). | contract (C1) + spine no-delete tests (C2) implemented; UI language specified (C3) |
| A10 | Deterministic reopen | Reopening a receipt reconstructs the same source, derivations, approved themes, and disposition. | audio | Contract: `IntakeReceipt.reopenDigest` required, hash-shaped (C1). Spine: reopen in fresh session reproduces identical canonical serialization and digest; corrupted receipt-reference injected (C2). Acceptance: fresh-session reopen (C5). | Corrupted `reopenDigest` → reopen fails closed with explicit error, never silent partial reconstruction. | contract (C1) + spine (C2) tests implemented |

## Holding for unknown content (cross-cutting)

Unknown or mixed material routes to `unsorted_holding`, never a guessed destination:
the note fixture's `expectedInitialRoute` is `unsorted_holding` while its final
`expectedLane` is `restricted_health_legal`, reachable only by explicit human routing
(`held → reviewed` in `SOURCE_TRANSITIONS`). Verified at contract level in C1 and
enforced by the spine in C2 (`fail-closed holding` tests in `durinSpine.test.ts`).

## Failure injections (Command 2 — all implemented in `durinSpine.test.ts`)

hash mismatch · missing original (and tampered original) · duplicate race ·
invalid transition (review + source) · unauthorized crossing (system routing,
system-approved crossing, cross-lane query) · corrupted receipt reference
(re-signed adversarial tamper caught by reopen digest; naive tamper caught by
the hash chain; unknown store version refused without destructive migration).
