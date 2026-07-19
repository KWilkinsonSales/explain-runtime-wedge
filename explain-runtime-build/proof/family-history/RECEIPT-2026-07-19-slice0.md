# Proof Receipt — Family History & Genealogy Intelligence OS, Slice 0

- **Repo:** KWilkinsonSales/explain-runtime-wedge
- **Branch:** `claude/fhgi-slice0-evidence-desk-gafbkt`
- **Date:** 2026-07-19
- **Slice:** 0 — Evidence Audit Desk (feature-flagged prototype)

## Changed files

New:

- `explain-runtime-build/src/familyhistory/types.ts` — domain model
- `explain-runtime-build/src/familyhistory/featureFlag.ts` — `FEATURE_FHGI_OS_SLICE0`, defaults OFF
- `explain-runtime-build/src/familyhistory/fixtures.ts` — deterministic Donna Jean Ellison packet
- `explain-runtime-build/src/familyhistory/receipt.ts` — deterministic export-receipt preview
- `explain-runtime-build/src/familyhistory/README.md` — module contract
- `explain-runtime-build/src/familyhistory/ui/FamilyHistoryRoute.tsx` — route wrapper
- `explain-runtime-build/src/familyhistory/ui/FamilyHistoryApp.tsx` — nine-panel Evidence Audit Desk
- `explain-runtime-build/src/familyhistory/ui/familyHistory.css` — evidence-desk styling
- `explain-runtime-build/tests/familyHistoryFixture.test.ts`
- `explain-runtime-build/tests/familyHistoryDisposition.test.ts`
- `explain-runtime-build/tests/familyHistoryRedLines.test.ts`
- `explain-runtime-build/tests/familyHistoryReceipt.test.ts`
- `explain-runtime-build/tests/familyHistoryRoute.test.ts`
- `explain-runtime-build/docs/family-history-intelligence-os-slice0.md`
- `explain-runtime-build/proof/family-history/RECEIPT-2026-07-19-slice0.md` (this file)

Modified:

- `explain-runtime-build/src/routeGate.ts` — added flag-gated `/family-history` surface (default `false` parameter keeps all pre-slice call shapes identical)
- `explain-runtime-build/src/main.tsx` — wired `FamilyHistoryRoute` behind `FEATURE_FHGI_OS_SLICE0`
- `explain-runtime-build/tests/routeGate.test.ts` — gating cases for `/family-history`
- `explain-runtime-build/dist/*` — rebuilt bundle (dist is tracked in this repo); built with the flag at its default (OFF)

## Commands run (from `explain-runtime-build/`, unless noted)

| Command | Exit code |
| --- | --- |
| `npm ci` | 0 |
| `npm run typecheck` | 0 |
| `npm test` (vitest — 27 files, 298 tests) | 0 |
| `npm run build` (flag default OFF) | 0 |
| `VITE_FEATURE_FHGI_OS_SLICE0=true npm run build` (flag-on build verifies cleanly; committed dist is the flag-OFF build) | 0 |
| `VITE_FEATURE_FHGI_OS_SLICE0=true npx vitest run tests/familyHistoryRoute.test.ts` (flag-on test path) | 0 |
| repo root: `pnpm install --frozen-lockfile=false && pnpm build && pnpm lint && pnpm typecheck` (workspace CI parity) | 0 |

## Tests added

1. **Fixture integrity** (`familyHistoryFixture.test.ts`) — DOB 1955-04-01; no
   accepted death/obituary/death place; Bell County / Donna June lead
   rejected; earlier obituary rejected on DOB mismatch; Joan Olsen / Maxwell /
   Price HOLD only and never among known names; both Nampa addresses HOLD with
   "requires official bridge"; negative-search row concludes nothing.
2. **Disposition integrity** (`familyHistoryDisposition.test.ts`) — every claim
   has exactly one enum disposition; none missing confidence, source platform,
   claim type, or disposition; unique claim IDs; false leads/candidates
   reference real ledger rows.
3. **Red-line strings** (`familyHistoryRedLines.test.ts`) — module source never
   contains temple-ready / ordinance-ready / submit ordinance / reserve
   ordinance / certainty confirmed / automatic FamilySearch edit / automatic
   merge phrasing (permitted only inside that test); boundary disclaimer
   present; no fetch/XMLHttpRequest/WebSocket in module source.
4. **Receipt** (`familyHistoryReceipt.test.ts`) — receipt is deterministic;
   includes accepted / rejected / hold / negative-search / next-task sections;
   labels interview output "lead, not proof"; never merges aliases (Joan names
   only under HOLD) and never confirms death.
5. **Route/render** (`familyHistoryRoute.test.ts` + `routeGate.test.ts`) —
   `FEATURE_FHGI_OS_SLICE0` defaults OFF; `/family-history` resolves only when
   the flag is on and falls back to Companion when off; prefix leakage
   (`/family-historian`) blocked; static render (react-dom/server) shows all
   nine panels, the packet status, "requires official bridge", "lead, not
   proof", and the reconstruction warning.

## Skipped checks

- **App-level lint:** `explain-runtime-build` has no lint script; the root
  `pnpm lint` covers only `packages/*` (run, exit 0). No lint tooling exists
  for the app itself — typecheck is the enforced equivalent, per repo CI.
- **Browser screenshot:** no screenshot automation in this workspace. To
  capture manually: `cd explain-runtime-build &&
  VITE_FEATURE_FHGI_OS_SLICE0=true npm run dev`, open
  `http://localhost:5173/family-history`, and screenshot the full page
  (desktop and a ~390 px mobile viewport; the claim matrix scrolls
  horizontally inside its own container on mobile).

## Red-line verification

- No ordinance automation, temple-readiness, or ordinance-submission copy —
  pinned by the red-line test; prohibited phrases exist only inside
  `familyHistoryRedLines.test.ts`.
- No automatic merges: alias cluster and both Nampa addresses are HOLD with a
  literal "requires official bridge" requirement; the receipt restates the
  ledger and cannot upgrade dispositions.
- No automatic FamilySearch edits, no scraping, no external network calls, no
  real API credentials: module makes zero network requests (test-enforced) and
  every record reference is fixture data labeled as such.
- No living-person public exposure: the only packet is the designated private
  test case (`privacyClass: "private-test-case"`), surface is flag-gated OFF
  by default.
- No synthetic certainty: interview outputs are "lead, not proof" (rd_only);
  reconstruction statements carry one of four epistemic labels with the
  warning "Reconstruction cannot convert uncertainty into fact."
- No death conclusion and no alias merge for Donna Jean — fixture- and
  receipt-test enforced.
