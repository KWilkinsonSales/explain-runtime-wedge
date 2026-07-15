# Explain Runtime Wedge v0.1

## Canonical prototype deployment rail

Netlify project `companion-prototype-erw` is the canonical deployment rail
for the current Companion and LDS Teacher Preparation prototype family.
Its production origin is https://companion-prototype-erw.netlify.app.

Prior Vercel / `adl-companion` designations are superseded for this
prototype phase and remain historical architecture lineage only. Any future
migration to Vercel requires separate authorization, feature-parity proof,
deployment verification, and a new acceptance receipt.

Verify the deployed revision by comparing the current Netlify production
deploy's `commit_ref` and branch (`main`) with GitHub `main`; a manually
published preview is not sufficient.

## Deployment front doors

Four routes share this build (routing in `src/routeGate.ts`):

- `/` — product selector.
- `/teacher` — **LDS Teacher Preparation**; see `src/teacherprep/README.md`.
- `/companion/prototype` — **Companion** prototype (documented below).
- `/durin` — **Durin Intake** accepted Slice 0 foundation.

All production routes use the canonical Netlify origin above. Other paths
currently fall through to Companion; they are not additional documented
front doors.

Deployable reference build for the frozen Explain ADL Founder Envoy Mission.

## What is implemented

- Mission package separated from engine logic
- Engine-owned session state and pure completion evaluator
- Hard voice start gate: connected + verified + zero fallback
- Browser WebRTC connection to a server-minted Realtime session
- Interruption handling via response cancel + output audio clear
- Explicit Voice Unavailable → Text Mode path; no browser/OS TTS fallback
- Cloudflare Worker + D1 invitation, event, receipt, terminal-close, and disposal endpoints
- Idempotent receipt (`token` primary key)
- Closed-state acceptance endpoint
- Automated unit tests for voice gating and lifecycle completion

## Local frontend

```bash
npm install
npm run dev
```

Create `.env.local` only if you add frontend configuration. Never put the OpenAI API key in the frontend.

## Worker setup

```bash
npx wrangler d1 create explain-runtime
# Put the returned database ID in worker/wrangler.toml
npx wrangler d1 migrations apply explain-runtime --remote --config worker/wrangler.toml
npx wrangler secret put OPENAI_API_KEY --config worker/wrangler.toml
npm run worker:deploy
```

Route `/api/*` to the Worker or set a Vite proxy during local development.

## Acceptance order

1. Build frontend and Worker.
2. Open an invitation on another device.
3. Confirm `WAITING` does not become `RUNNING` until Realtime is connected and verified.
4. Interrupt the agent while it speaks; confirm output stops and resumes from the recipient turn.
5. Run the blind 4-of-5 naturalness test and record it externally; the runtime intentionally does not self-certify subjective voice naturalness.
6. Close; verify one receipt, zero mission events, removed approved context, and terminal closed state using `GET /api/acceptance/:token`.

## Important limitation

This package is build-ready source, not a deployed operational proof. OpenAI Realtime request fields and supported model/voice names can change; verify against current official API documentation before deployment. The human 4-of-5 naturalness gate still requires real listeners.

## Companion prototype (private, `/companion/prototype`)

A separate, isolated proof surface for the iPhone-first "Companion ON" experience lives at
`src/prototype/` and is only reachable at the exact path `/companion/prototype`. It is gated by
`COMPANION_PROTOTYPE_ENABLED` in `src/prototype/featureFlag.ts` — flip that to `false` to disable
it entirely without deleting code. Every other path, including `/companion` with no suffix,
renders the unchanged production `App`.

- Installable on iPhone: open `/companion/prototype` in Safari, Share → Add to Home Screen. The
  page injects its own `apple-touch-icon`, `apple-mobile-web-app-title` ("Companion"), and
  `manifest.webmanifest` only while it is mounted, then removes them on unmount, so the production
  page never inherits the Companion identity or its service worker.
- Shows a visible Listening/Provisional state, the five intent commands (Nosta·Observe,
  Sogo·Guide, Tanca·Truth, Anor·Illuminate, Durin·Govern), and SPEAK/STEER/SITUATION cards.
- Includes a Mac teleprompter proof surface at `/companion/prototype?view=teleprompter`. It syncs
  live via `BroadcastChannel`/`localStorage` across tabs or windows in the **same** browser only.
  True phone-to-Mac sync would need a deployed backend relay — out of scope for this build-first
  pass.
- This is a private prototype, not a production admission decision. It does not claim v1.0
  acceptance and Companion ON is not the production default.
