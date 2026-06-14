# explain-runtime-wedge

Reference Runtime Playground v0.1 workspace.

## Sprint 0

Sprint 0 proves that one ADL Room Runtime can instantiate four proof manifests (Canonical, Investor, QBR, Outreach) while preserving the same runtime invariants.

## Commit admissibility

Every commit must advance a named Sprint 0 proof item. Anything else is out of scope.

## Setup

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
```

Runtime logic, manifests, replay, receipts, and UI surfaces are intentionally excluded from this workspace bootstrap commit.
