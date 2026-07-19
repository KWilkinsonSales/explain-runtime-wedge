# Family History & Genealogy Intelligence OS — Slice 0

**Product:** Family History & Genealogy Intelligence OS
**UI label:** Family History Intelligence OS
**Route:** `/family-history` · **Flag:** `FEATURE_FHGI_OS_SLICE0` (defaults **OFF**)
**Location:** `explain-runtime-build/src/familyhistory/`

## What Slice 0 is

An ADL-governed intelligence surface for genealogy auditing: source
reconciliation, false-lead registry, bounded interview receipts, and
probabilistic reconstruction that always carries an epistemic label. The
**Evidence Audit Desk is the spine** — the interview module and reconstruction
legend attach to the claim ledger; they never replace it.

Everything renders from one deterministic fixture: the **Donna Jean Ellison**
packet (ACTIVE PRIVATE TEST CASE / NO DEATH PLACE CONFIRMED). There are no
network calls, no uploads, no editing, and no real record identifiers.

## Commercial boundary

- Not an ordinance product. Not a FamilySearch replacement.
- Not an automated merge/update tool — nothing merges on its own, ever.
- Boundary text rendered in the header: *"Not a replacement tree. Not
  ordinance automation. No certainty without proof."*

## Flag behavior

Same single-flip idiom as the other surfaces (`featureFlag.ts`), but this one
defaults OFF. Enable it explicitly at build/dev/test time:

```bash
VITE_FEATURE_FHGI_OS_SLICE0=true npm run dev     # or build / test
```

When the flag is off (the default), `/family-history` falls through to the
Companion surface exactly like any unrecognized path (`src/routeGate.ts`).

## Domain model (`types.ts`)

- `PersonEvidencePacket` — packetId, primaryName, knownNames, dob, birthplace,
  parents, status, privacyClass, summary, claims, falseLeads, candidates,
  tasks, interviewReceipts, reconstructionNotes.
- `SourceClaim` — one sourced claim per row: claimId, personAnchor, claimType,
  claimText, claimedName/Dob/Address/DateRange, sourcePlatform, collectionName,
  recordIdOrArk, artifactLink, sourceQuality, evidenceType, matchFields,
  conflicts, **disposition** (exactly one), confidence, nextAction, notes.
- `Disposition` — `accepted | rejected | duplicate_candidate | conflict |
  hold | private | rd_only | source_only`.
- `ReconstructionLabel` — `observed_fact | likely | possible_narrative_fill |
  unknown`.
- `InterviewReceipt` — receiptId, purpose, subject, targetInterviewee,
  promptSet, claimsGenerated, uncertaintyNotes, followUpTasks, disposition,
  createdAt.

## Donna Jean fixture invariants (pinned by tests)

Accepted anchors: DOB **1955-04-01**; born St. Joseph's Hospital, Lewiston,
Idaho; parents **Frances Elaine Reavis** and **Lester Carl Ellison**; known
names Donna Jean Ellison / Donna J. Ellison.

Must remain true (see `tests/familyHistoryFixture.test.ts`):

- No accepted death record, obituary, or death place.
- No final married-name resolution, no merged aliases.
- Earlier obituary candidate **REJECTED** (DOB mismatch).
- Bell County, Texas marriage **REJECTED** (Donna *June* Ellison ≠ Donna
  *Jean* Ellison).
- 2615 E Victory Rd and 2615 E Powerline Rd, Nampa, Idaho: **HOLD** pending
  full source capture.
- Joan Alice Olsen / Joan A Maxwell / Joan A Price: **HOLD** candidate only —
  no merge without an official bridge record.

## UI panels (`ui/FamilyHistoryApp.tsx`)

1. Product header with boundary text.
2. Person Evidence Packet (anchor facts + status).
3. Source / Claim Matrix — one sourced claim per row, disposition chip on
   every row, including HOLD, REJECTED, negative-search, and alias rows.
4. False-Lead Registry — why each rejected lead is blocked from auto-match.
5. Candidate Board — every HOLD card displays "requires official bridge."
6. ExplainIT Interview Module — bounded prompts (purpose / subject / artifact
   or gap / suggested prompt / "Say this" line / follow-up lead), all outputs
   labeled **lead, not proof**.
7. Artifact Ingestion — placeholder only (future: birth certificates,
   Ancestry/MyHeritage screenshots, FamilySearch records, photos, journals,
   letters, OCR/HTR transcripts).
8. Reconstruction Label Legend + warning: *"Reconstruction cannot convert
   uncertainty into fact."*
9. Export Receipt Preview — deterministic text receipt (`receipt.ts`) listing
   accepted anchors, rejected false leads, HOLD candidates, negative searches,
   next tasks — and the conclusions it refuses to make (no death conclusion,
   no alias merge).

## Red lines

No ordinance automation, temple-readiness claims, automatic FamilySearch
edits, unattended merges, living-person public exposure, DNA-as-proof claims,
synthetic certainty, external network calls, real API credentials, or
scraping. `tests/familyHistoryRedLines.test.ts` scans the module source for
prohibited commercial phrases (allowed only inside that test file) and for
network primitives.

## Tests

| File | Pins |
| --- | --- |
| `tests/familyHistoryFixture.test.ts` | Fixture integrity invariants above |
| `tests/familyHistoryDisposition.test.ts` | Exactly one valid disposition per claim; no missing confidence/source/type; referential integrity |
| `tests/familyHistoryRedLines.test.ts` | Prohibited copy absent; boundary disclaimer present; no network primitives |
| `tests/familyHistoryReceipt.test.ts` | Receipt sections complete; deterministic; no alias merge; no death conclusion |
| `tests/familyHistoryRoute.test.ts` + `tests/routeGate.test.ts` | Flag defaults OFF; route gating on/off; static render of all panels |

Run: `npm run typecheck && npm test && npm run build` in
`explain-runtime-build/`.

## Known limitations (Slice 0)

- Read-only: no artifact upload, no claim editing, no new-interview capture.
- Single fixture packet; no persistence layer.
- The flag is a build-time switch (Vite env), not a runtime toggle.
- No DOM test environment in this workspace; render coverage uses
  `react-dom/server` static markup, and accessibility is pinned at the CSS/
  markup level rather than via axe-style tooling.
