# Teacher Preparation — Physical iPhone Acceptance Proof Packet

This is a template for a human operator to complete on a real, physical iPhone. **Claude/an AI agent cannot complete this step.** No simulator, browser device emulation, or automated screenshot substitutes for it — this file exists to record that a person actually held an iPhone, opened the production URL in Safari, and observed the behavior below.

Do not fill in a `PASS` result, and do not write the accepted verdict line at the bottom, until every item in the checklist has actually been performed on the device and observed to work.

## Current state as of this packet (verified in-session, not on-device)

- Production URL: `https://companion-prototype-erw.netlify.app/teacher`
- Repository: `KWilkinsonSales/explain-runtime-wedge`, branch `main`
- Current `main` commit: `aaf363a02bdd9c4d5d907b46233f29f817cf5d07`
- Netlify site `companion-prototype-erw`, deploy `6a5854ce2929740008e5dfc6`, state `ready`, context `production`, `commit_ref` exactly matches current `main` — confirmed via Netlify API, no drift since the last recorded acceptance attempt.
- No `teacherprep` source, test, or proof file has changed since the last full acceptance run (`RECEIPT-production-acceptance.md`, retry section based on commit `13fa74a`).
- Re-verified this session: `npx vitest run` — 249/249 tests pass; `npx tsc --noEmit` — clean; `npx vite build` — clean.
- Prior automated/simulated-viewport acceptance (375×812, 390×844, 430×932, 768×1024) already passed — see `RECEIPT-production-acceptance.md`.
- Overall verdict as of this packet: `REJECTED — REMEDIATION REQUIRED` (per `RECEIPT-production-acceptance.md`), blocked solely on this physical-device gate. No physical iPhone has been attached or remotely controlled in any session to date.

None of the above substitutes for physical-device observation. This packet exists to make the gap explicit and to record the real check when it happens.

## Device record

Fill in every field. Leave nothing blank.

- Operator name:
- iPhone model:
- iOS version:
- Browser: Safari
- Production URL tested: `https://companion-prototype-erw.netlify.app/teacher`
- Start time (America/Phoenix):
- End time (America/Phoenix):
- Screenshot or screen-recording reference(s):
- Overall result: `PASS` / `FAIL`
- Visual discrepancy or defect, if any (include affected screen, orientation, and screenshot/recording reference):

## Required test path

Perform these in order. Check each box only after observing it directly on the device.

- [ ] Open `/teacher` in iPhone Safari.
- [ ] Confirm navigation is fully visible and usable.
- [ ] Confirm content width and typography look correct — text is legible, not compressed, and uses the available screen width.
- [ ] Confirm there is no horizontal overflow or page scrolling.
- [ ] Rotate to landscape, observe layout, then rotate back to portrait. Note any safe-area or orientation issue.
- [ ] Complete the full flow: This Week → Prepare → Review → Ready for Class → Teach.
- [ ] From Teach, open Neutral Screen, then Resume.
- [ ] Open the print/export controls and confirm every preset remains reachable.
- [ ] Confirm all buttons and fields remain tappable throughout (no target too small or obscured).
- [ ] Confirm no clipping or overflow on any screen visited above.

## Verdict handoff

Do not write or use the line below until every checklist item above is checked, the device record is fully filled in, and the overall result is `PASS`. If any item fails, record it in "Visual discrepancy or defect" instead and leave the verdict as `REJECTED — REMEDIATION REQUIRED`.

Once — and only once — every item passes on the physical device:

```
ACCEPTED — TEACHER PREPARATION PROTOTYPE PRODUCTION-PROVEN
```

This line should then be copied into a dated update to `RECEIPT-production-acceptance.md`, alongside this completed device record, superseding the current `REJECTED — REMEDIATION REQUIRED` verdict.
