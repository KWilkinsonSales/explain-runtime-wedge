# Explain Runtime Wedge v0.1

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
