# Companion Receipt Reconciliation to Main

Date: 2026-07-15

Repository: `KWilkinsonSales/explain-runtime-wedge`

## Repository truth

- Main before reconciliation: `12f734c217b5e36c61b975be01a9c6c7bc6a842f`
- Source receipt commit: `b6b17452ab150225f233bae3e3a940f8e8344f57`
- Main after receipt cherry-pick: `d18d521ebc729da930df43b4682df312189a1948`
- Reconciled path: `explain-runtime-build/proof/companion/RECEIPT-product-recovery.md`

## Scope verification

`git diff-tree --no-commit-id --name-only -r d18d521ebc729da930df43b4682df312189a1948` returned exactly the reconciled receipt path above.

**Receipt-only; implementation untouched.**

No app, runtime, function, test, environment, deployment, Teacher, Durin, selector, or unrelated worktree path changed in the cherry-pick.

## Authoritative status carried into main

**WORKABLE PROTOTYPE READY FOR LIVE-DEVICE ACCEPTANCE**

The reconciled receipt contains the sanitized live A–E matrix using `openai / gpt-5.4-mini-2026-03-17`, required regression results, credential boundary, and remaining live-device and production gates.
