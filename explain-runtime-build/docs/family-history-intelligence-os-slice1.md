# Family History & Genealogy Intelligence OS — Slice 1

**Slice 1 = Tree + Person Workspace shell.**
**Flag:** `FEATURE_FHGI_OS_SLICE1` (defaults **OFF**; enable with
`VITE_FEATURE_FHGI_OS_SLICE1=true`). Slice 0's flag still gates the
`/family-history` route itself; Slice 1 only changes what renders inside it.

**Build rule honored:** Slice 0 was not replaced — it was wrapped. The
Evidence Audit Desk is embedded whole inside the Person Workspace
(`EvidenceDesk` extracted from `FamilyHistoryApp`, which still renders it
standalone and unchanged). With Slice 1 off, `/family-history` renders the
Slice 0 desk exactly as production does today.

Product frame: a tree-aware research operating surface where every view is
backed by evidence disposition. The person card is now a cockpit node inside
the larger system.

Product line: *Beauty invites attention. The ledger earns belief.*

## The four surfaces (`ui/FamilyHistoryShell.tsx`)

1. **Research Command Center** (`CommandCenterPanel.tsx`) — project-health
   tiles (claims, accepted, hold, guarded duplicate risks, unsourced
   branches), open mysteries (always questions), changed/rejected fact log,
   next safe actions. All computed by `insights.ts` from the ledger.
2. **Tree Overview** (`TreeOverviewPanel.tsx`) — three-generation pedigree
   with person picker and three toggleable overlays: evidence health,
   duplicate risk, research opportunities. The tree contains only the three
   anchored people; grandparents are explicit "not yet captured" unsourced
   placeholders — the tree never invents ancestors.
3. **Person Workspace** (`PersonWorkspacePanel.tsx`) — expandable drawers
   (cognitive-load rule: secondary detail hidden until opened): the **full
   Slice 0 Evidence Audit Desk** (open by default), timeline, relationships,
   sources, extracted claims, conflicts, dedupe candidates ("similarity is a
   reason to investigate, never a reason to merge"), artifacts placeholder,
   guided interview prompts (lead-not-proof labeled), receipt/export.
   Unsourced people get an honest empty workspace, not guessed facts.
4. **Work Queue** (`WorkQueuePanel.tsx`) — derived by `buildWorkQueue()`:
   source-only claims, hold candidates, rejected false leads (as guards),
   merge candidates (a single refusal state until an official bridge exists
   and a human accepts), interview follow-ups, artifact OCR placeholder.
   Queue items resolve only when a human records a disposition.

## Fixtures added

- `treeFixtures.ts` — `TreePersonNode` pedigree (7 nodes: Donna + 2 parents +
  4 unsourced placeholders), open mysteries, fact-change log, product line.
- `insights.ts` — pure `buildCommandCenter()` / `buildWorkQueue()` functions.

## Navigation

State-based sections with URL reflection (`/family-history`, `/family-history/tree`,
`/family-history/person`, `/family-history/queue` — the route gate already
admits all `/family-history/*` subpaths). Tree node click opens that person's
workspace.

## Tests (`tests/familyHistorySlice1.test.ts`, 14 cases)

- Slice 1 flag defaults OFF.
- Tree fixture integrity: only anchored names, placeholders unsourced, Donna
  guarded-not-merged, only Donna carries a packet.
- Command center counts match the ledger exactly.
- Work queue: deterministic, all kinds present, merge entry is a refusal state.
- Shell render: header, boundary text, four sections, product line, command
  center default.
- Person workspace render: full Slice 0 desk embedded for Donna; unsourced
  person renders an empty honest workspace.

All Slice 0 tests continue to pass unchanged. The red-line scanner covers the
new files automatically (it walks `src/familyhistory/` recursively).

## Rootstech demo path (target state)

Open tree → evidence overlay lights up → click person → upload artifact →
claims extracted as HOLD → dedupe engine refuses to lie → interview prompt
generated → receipt exported. Slice 1 delivers the frame for this path;
artifact upload/extraction is the next slice (placeholders mark the seams).

## Known limitations

- Artifact upload/OCR still placeholder; "claims extracted as HOLD" is
  described, not yet executable.
- Tree is a fixed three-generation pedigree; no fan chart yet.
- Person Workspace is fully populated only for Donna (by design — no other
  packets exist).
- Navigation state does not respond to browser back/forward (replaceState
  only).
