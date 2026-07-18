# Council — smallest additive surface (Command 2)

`/council` is a flag-gated, device-local, deterministic prototype surface.
It follows the same idiom as `teacherprep/` and `durin/`: a single boolean
flip in `featureFlag.ts`, routed through `routeGate.ts`, falling back to
Companion when disabled.

## Scope

- A user submits a question; `engine.ts` returns a fixed, keyword-matched
  `CouncilDeliberation` from `fixtures.ts` — three perspectives (Advocate,
  Skeptic, Synthesizer), each giving one deterministic response.
- No network call, no live model, no credentials anywhere under
  `src/council`. Every response is a static fixture lookup.
- Same question in, same deliberation out — see `tests/councilEngine.test.ts`.

## Explicitly out of scope for this pass

- No dynamic assembly of perspectives, no live LLM wiring, no adapters to
  external services.
- No regulated or authoritative decision claim: responses are illustrative
  fixture text, labeled as such in the UI (`ILLUSTRATIVE_LABEL`).
- No production or deploy claim. This does not appear on the product
  selector (`src/ProductSelector.tsx`, which is canon-locked separately) and
  carries no acceptance status.
- No change to Companion, Teacher, Durin, the selector, or Netlify
  configuration — this surface only adds a new flag-gated branch.
