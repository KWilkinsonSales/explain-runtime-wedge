# Council Slice 0 — Standard User Guide

## Open Council

Use the canonical production URL:

https://companion-prototype-erw.netlify.app/council

No login, API key, backend setup, credential, database, or special configuration is required for the current fixture-only experience.

## How to use it

1. Open the URL in Safari, Chrome, or another modern browser.
2. Choose a starter prompt or type a question.
3. Select **Convene**.
4. Review the three illustrative perspectives:
   - Advocate
   - Skeptic
   - Synthesizer
5. Ask another question or refresh the page to start again.

## What works in this slice

Council deterministically recognizes a small bounded set of themes, including shipping, architecture, and scope expansion. The same question produces the same fixture-backed result. Questions outside the admitted fixture set receive a bounded default response.

## Backend status

No additional backend enablement is required.

- `COUNCIL_ENABLED` is `true` on `main`.
- Netlify production is deployed from `main` at commit `b8a45cf3d9e61bbcdbe435b08b22c80beb1c2008`.
- The deploy is in `ready` state.
- The current Council engine is frontend-only, deterministic, and fixture-backed.
- It does not call a live model or require provider credentials.

Council is intentionally absent from the product selector. The direct `/council` URL is the admitted standard-user front door for this slice.

## What this is not

- Not a live LLM or multi-model council
- Not authoritative advice
- Not connected to private records or external systems
- Not a regulated decision engine
- Not a Production Proven claim

## Troubleshooting

If the URL shows Companion instead of Council, refresh once and confirm the full address ends in `/council`.

If the page does not load, capture the time, device/browser, screenshot, and visible error. Treat that as a deployment defect rather than enabling new backend services.

## Current status

**STANDARD USER URL READY / FEATURE FLAG ENABLED / NETLIFY PRODUCTION ALIGNED TO MAIN / NO BACKEND ENABLEMENT REQUIRED / FIXTURE-ONLY / PRODUCTION PROVEN NOT CLAIMED**
