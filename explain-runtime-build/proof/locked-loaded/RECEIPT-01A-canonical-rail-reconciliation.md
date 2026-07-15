# Receipt 01A — Canonical Rail Reconciliation

Date: 2026-07-14 (America/Phoenix)

Repository: `KWilkinsonSales/explain-runtime-wedge`

Base: GitHub `main` at `e0f33a25186f97bc4b686105e58a06702afd406f`

Branch: `agent/reconcile-canonical-netlify-rail`

## Verdict

**ACCEPTED — CANONICAL RAIL RECONCILED**

## Governing decision recorded

Netlify project `companion-prototype-erw` is the canonical deployment rail
for the current Companion and LDS Teacher Preparation prototype family.
Prior Vercel / `adl-companion` designations are superseded for this
prototype phase and retained only as historical architecture lineage.

Any future migration to Vercel requires separate authorization, feature
parity proof, deployment verification, and a new acceptance receipt.

## Canonical deployment truth

| Field | Value |
|---|---|
| Netlify project | `companion-prototype-erw` |
| Netlify site ID | `0fca5864-c706-435c-a178-30657b31f5f9` |
| Production URL | `https://companion-prototype-erw.netlify.app` |
| Route family | `/`, `/teacher`, `/companion/prototype`, `/durin` |
| Revision verification | Compare Netlify production deploy `commit_ref` on branch `main` with GitHub `refs/heads/main` |
| Verified production deploy | `6a5704186f10d3728e5d0f00` |
| Verified deployed/GitHub revision | `e0f33a25186f97bc4b686105e58a06702afd406f` |
| Manual deploy flag | `false` |

The revision and deploy identifiers above reproduce Receipt 01's read-only
observation. This documentation-only branch is not deployed by this
command, so production is expected to remain at its pre-branch revision.

## Occurrence classification

A repository-wide, case-insensitive search for `Vercel`, `adl-companion`,
and canonical-rail wording found one pre-existing file:
`proof/REVIEW-2026-07-13-companion-closure.md`.

| Occurrence | Classification | Action |
|---|---|---|
| July 13 closure review's Vercel / `adl-companion` findings and recommendations | Historical record that must remain unchanged | Preserved byte-for-byte |
| Receipt 01's pre-decision contradiction findings and recommended governance step | Historical snapshot that must remain unchanged | Added byte-for-byte as operator reviewed |
| Current deployment guidance in `explain-runtime-build/README.md` | Active current-state documentation | Added the governed Netlify rail decision, revision comparison method, canonical route family, and future-migration gate |
| Future Vercel migration | Future migration note | Recorded as separately authorized work requiring parity and deployment proof |

No other current repository statement identified Vercel or
`adl-companion` as the active canonical rail. Receipt 01 is committed
unchanged as required; its recorded contradiction remains a truthful
snapshot of the state before this governing decision.

## Files changed

- `explain-runtime-build/README.md` — current-state canonical rail and route-family documentation.
- `explain-runtime-build/proof/locked-loaded/RECEIPT-01-repository-deployment-truth.md` — existing receipt added unchanged.
- `explain-runtime-build/proof/locked-loaded/RECEIPT-01A-canonical-rail-reconciliation.md` — this reconciliation receipt.

## Scope and invariants

- No application source, route behavior, feature flag, token handling,
  function code, environment variable, or production setting changed.
- No deploy was initiated.
- No Companion production acceptance was started.
- Durin Slice 0 implementation and historical receipts were not reopened
  or modified.
- The product selector copy was not changed; that remains a separate small
  reconciliation after status evidence is settled.

## Verification

The reconciliation is accepted when all of the following remain true:

1. Receipt 01 is byte-identical to the operator-reviewed source receipt.
2. Historical review receipt content is unchanged.
3. Repository search leaves Vercel / `adl-companion` references only in the
   preserved historical review, the explicit supersession/future-migration
   note, and this reconciliation receipt.
4. All four documented production route URLs respond successfully.
5. The route-gate regression suite passes.
6. Git diff contains documentation and proof files only.

## Commands

```bash
gh --version
gh auth status
git status -sb
git rev-parse HEAD
git ls-remote origin refs/heads/main
rg -n -i "vercel|adl-companion|canonical.*rail|rail.*canonical" --glob '!node_modules/**' --glob '!dist/**' .
git switch -c agent/reconcile-canonical-netlify-rail
cmp -s <operator-reviewed-receipt-01> explain-runtime-build/proof/locked-loaded/RECEIPT-01-repository-deployment-truth.md
npm ci
npm test -- --run tests/routeGate.test.ts
for path in / /teacher /companion/prototype /durin; do curl -sS -L -o /dev/null -w '%{http_code} %{url_effective}\n' "https://companion-prototype-erw.netlify.app${path}"; done
rg -n -i "vercel|adl-companion|canonical.*rail|rail.*canonical" --glob '!node_modules/**' --glob '!dist/**' .
git diff --check
git diff --name-only
```

Commit, push, and draft-PR publication commands are recorded by Git history
and the resulting draft PR.
