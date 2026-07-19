# Proof Receipt — Family History & Genealogy Intelligence OS, Slice 1

- **Repo:** KWilkinsonSales/explain-runtime-wedge
- **Branch:** `claude/fhgi-slice0-evidence-desk-gafbkt`
- **Date:** 2026-07-19
- **Slice:** 1 — Tree + Person Workspace shell (wraps the Slice 0 nucleus)

## Build rule verification

"Do not replace Slice 0. Wrap it." — verified structurally:

- `FamilyHistoryApp` still renders the full Slice 0 desk standalone; its
  panels were extracted to `EvidenceDesk` and embedded whole (not copied,
  not summarized) inside the Person Workspace drawer.
- `FEATURE_FHGI_OS_SLICE1` defaults OFF: `/family-history` renders Slice 0
  byte-for-byte-equivalent until the new flag is explicitly enabled.
- All 20 pre-existing Slice 0 test cases pass unmodified.

## Changed files

New:

- `src/familyhistory/treeFixtures.ts` — pedigree nodes, open mysteries, fact-change log, product line
- `src/familyhistory/insights.ts` — `buildCommandCenter()`, `buildWorkQueue()` (pure, deterministic)
- `src/familyhistory/ui/FamilyHistoryShell.tsx` — four-section navigation shell
- `src/familyhistory/ui/CommandCenterPanel.tsx`
- `src/familyhistory/ui/TreeOverviewPanel.tsx` — pedigree + three overlays + person picker
- `src/familyhistory/ui/PersonWorkspacePanel.tsx` — drawer workspace embedding the Slice 0 desk
- `src/familyhistory/ui/WorkQueuePanel.tsx`
- `tests/familyHistorySlice1.test.ts` — 14 cases
- `docs/family-history-intelligence-os-slice1.md`
- `proof/family-history/RECEIPT-2026-07-19-slice1.md` (this file)

Modified:

- `src/familyhistory/featureFlag.ts` — added `FEATURE_FHGI_OS_SLICE1` (default OFF)
- `src/familyhistory/ui/FamilyHistoryApp.tsx` — extracted embeddable `EvidenceDesk`; default export unchanged in content
- `src/familyhistory/ui/FamilyHistoryRoute.tsx` — renders shell only when Slice 1 flag is on
- `src/familyhistory/ui/familyHistory.css` — shell/tree/drawer/queue styles appended
- `dist/*` — rebuilt tracked bundle with both flags at default (OFF)

## Commands run (from `explain-runtime-build/`)

| Command | Exit code |
| --- | --- |
| `npm run typecheck` | 0 |
| `npm test` (vitest — 28 files, 312 tests) | 0 |
| `npm run build` (flags default OFF) | 0 |
| `VITE_FEATURE_FHGI_OS_SLICE0=true VITE_FEATURE_FHGI_OS_SLICE1=true vite build` (to scratchpad; shell content verified in bundle) | 0 |
| repo root: `pnpm typecheck` / `pnpm test` (workspace parity) | 0 |

## Tests added (14 cases)

1. Slice 1 flag defaults OFF unless explicitly enabled.
2. Tree fixture: exactly 3 named (anchored) people; 4 grandparent nodes are
   explicit "not yet captured" unsourced placeholders; focus links both
   parents; only Donna carries a packet; Donna's duplicate risk is
   "guarded", never open/merged.
3. Command center: claim counts match the ledger exactly (8 total /
   2 accepted / 2 rejected / 3 hold / 1 source-only); 3 guarded duplicate
   risks; 4 unsourced branches; mysteries are questions; next safe actions
   are the packet tasks.
4. Work queue: deterministic; all six kinds present; the only
   merge-candidate item is the refusal state requiring an official bridge
   plus human acceptance.
5. Shell render: header + boundary text + four nav sections + product line;
   defaults to Research Command Center.
6. Person workspace render: Donna's workspace embeds the real Slice 0 desk
   (claim matrix, false-lead registry, receipt preview, status line) plus
   all drawers; an unsourced person renders an honest empty workspace with
   no guessed facts.

## Skipped checks

- App-level lint: still no lint script in `explain-runtime-build` (root
  `pnpm lint` covers `packages/*` only). Typecheck is the enforced
  equivalent, per repo CI.
- Browser screenshots: no automation available. Manual:
  `VITE_FEATURE_FHGI_OS_SLICE0=true VITE_FEATURE_FHGI_OS_SLICE1=true npm run dev`,
  open `http://localhost:5173/family-history`, capture Command Center, Tree
  (overlays on), Donna workspace (desk drawer open), and Work Queue at
  desktop and ~390 px widths.

## Red-line verification

- Red-line scanner (`familyHistoryRedLines.test.ts`) walks the whole module
  recursively, so every new Slice 1 file is covered — passing.
- No merge is executable anywhere: the work queue's merge section is a
  refusal state; the dedupe drawer states "similarity is a reason to
  investigate, never a reason to merge."
- The tree invents no ancestors: placeholders are labeled unsourced with no
  names or dates.
- Overlays and metrics derive from recorded dispositions only; no scoring of
  people, no synthetic certainty; open mysteries are phrased as questions
  (test-enforced).
- Still no network calls, uploads, credentials, or live-person exposure
  beyond the designated private test case.
