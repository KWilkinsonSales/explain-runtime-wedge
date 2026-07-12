# Implementation Receipt — Companion Runtime v1.2

Per the 2026-07-12 v1.1 Amendment, Command B: complete the post-listening
response loop while preserving the one-button Companion ON experience.
Reconnaissance in `proof/RECON-2026-07-12.md`.

## Production entry

**https://companion-prototype-erw.netlify.app/companion/prototype** opens
Companion directly and can never land on LDS Teacher Preparation
(`src/routeGate.ts` is deterministic; the LDS surface lives only at
`/teacher`).

## What v1.2 adds

### Governed response engine (`src/prototype/responseEngine.ts`)
- **One session ID per activation** — created when Companion turns on,
  closed cleanly by the new End control; the next activation is a fresh
  session.
- **One stable event ID per admitted utterance**; duplicate admissions of
  the same utterance are suppressed before any execution.
- **Exactly one execution per event** — an idempotency map returns the same
  in-flight promise for repeated execute calls; the provider is invoked
  once.
- **Supersede rule** — when a newer utterance is admitted while an older one
  is still executing, the older result is recorded but never rendered as
  the current answer.
- **Stable fallback sentence** when the provider fails (never a crash,
  never silence), flagged visibly as a fallback.
- **One primary renderer**; the teleprompter mirror re-broadcasts the same
  governed response rather than generating independently.
- **Transcript evidence kept separate from guidance** — the admission
  receipt (source, event type, confidence, raw text) rides alongside the
  rendered SPEAK/STEER.
- Provider seam: the default provider is the existing deterministic
  admission rail. No external LLM or new secret was introduced (none exists
  in this repo); a model-backed provider plugs into the same seam when the
  founder authorizes one.

### UI (`CompanionPrototype.tsx`)
- The Companion ON screen, mic-permission gate, voice-unavailable path, and
  Deepgram/Web Speech listening rail are preserved unchanged.
- States are explicit: **Listening / Thinking… / Ready / Error** in the
  badge (plus On hold).
- **SPEAK is prominent** (larger type, accent border); **STEER is
  collapsible** and secondary.
- **Copy, Repeat, Hold/Resume, Text Mode, End** controls at ≥48 px targets.
  Hold pauses guidance while listening and transcript evidence continue.
- **Diagnostics, Situation, and the teleprompter panel moved behind a
  “Details & diagnostics” disclosure** — the primary screen no longer looks
  like a debug panel.
- Text Mode runs through the same engine (one response path), showing each
  admitted event with its receipt and rendered answer.

## Evidence

- `npm run typecheck` — clean (strict).
- `npm run test` — **11 files, 100 tests, 100 passed**, including the new
  `companionResponseEngine` suite: session creation/clean close; one event →
  one execution → one rendered answer; idempotent execute; duplicate
  suppression; stale-response supersession; provider-error fallback;
  SPEAK/STEER rendering; receipt separation. All pre-existing Companion and
  Teacher Prep suites untouched and green.
- `npm run build` — production build clean.
- Browser walkthrough (`proof/companion/browser-walkthrough.mjs`) against
  the production build with a fake microphone device — **23/23 checks** at
  390×844 and 1024×768: one-tap Listening; SPEAK primary; STEER collapsed;
  diagnostics hidden until disclosed; Copy/Repeat/Hold/End present; hold
  state; session ID visible on demand; text-mode loop with duplicate
  suppression proven in-browser; clean End; Companion URL never shows LDS
  and the LDS URL never shows Companion; distinct storage namespaces.
- Screenshots: `01-companion-off-phone.png`, `02-companion-listening-phone.png`,
  `03-companion-text-mode-phone.png`, `04-companion-listening-tablet.png`.

## Known limitations

- The response provider is the deterministic rail — answers are governed
  posture lines, not model-generated content. Wiring a real model provider
  is a separate authorization (secret management + provider adapter on the
  existing seam).
- The microphone-denied path is covered by unit tests
  (`companionRuntime.test.ts`) rather than the headless walkthrough, since
  the fake-device flag auto-grants permission browser-wide.
- Live Deepgram streaming still requires `DEEPGRAM_API_KEY` in the Netlify
  environment, unchanged from v1.1.

## Run instructions

Live: **https://companion-prototype-erw.netlify.app/companion/prototype**

```bash
cd explain-runtime-build
npm install
npm run dev        # http://localhost:5173/companion/prototype
npm run test && npm run typecheck && npm run build
node proof/companion/browser-walkthrough.mjs   # needs local Chromium; see script
```
