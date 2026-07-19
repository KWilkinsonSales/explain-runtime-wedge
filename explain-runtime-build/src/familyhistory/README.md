# Family History & Genealogy Intelligence OS — Slice 0

Route: `/family-history` · Flag: `FEATURE_FHGI_OS_SLICE0` (defaults **OFF**;
enable with `VITE_FEATURE_FHGI_OS_SLICE0=true`).

An ADL-governed evidence surface for genealogy auditing: source reconciliation,
false-lead registry, bounded interviews, and labeled reconstruction — all over
one deterministic fixture (Donna Jean Ellison, active private test case).

## What this is not

- Not a replacement tree, not FamilySearch authority, not ordinance tooling.
- Nothing merges on its own. Alias candidates stay HOLD without an official bridge.
- No network calls, no scraping, no real record IDs, no upload (Slice 0).
- Interview and reconstruction output is always a lead, not proof.

## Shape

- `types.ts` — domain model (PersonEvidencePacket, SourceClaim, Disposition,
  ReconstructionLabel, InterviewReceipt).
- `fixtures.ts` — the Donna Jean fixture and its pinned invariants (no death
  conclusion, rejected false leads, HOLD candidates).
- `receipt.ts` — deterministic export-receipt preview.
- `ui/` — the nine-panel Evidence Audit Desk.

Tests live in `tests/familyHistory*.test.ts`; the fixture invariants and
red-line copy rules are pinned there. See
`docs/family-history-intelligence-os-slice0.md` for the full slice contract.
