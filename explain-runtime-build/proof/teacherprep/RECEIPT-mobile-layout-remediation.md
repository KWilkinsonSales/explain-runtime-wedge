# Teacher Preparation Mobile Layout Remediation Receipt

Date: 2026-07-15 UTC  
Base: `0367ef12b930f0cbc77bf59f7be6127ea5cf65da` (current `main` after merged PR #34)  
Scope: LDS Teacher Preparation mobile layout only  
Deployment status: not deployed; operator review required

## Root cause

The extreme narrow rail in `production-acceptance/02-official-week-phone.png` was reproduced only when the in-app browser combined an explicit mobile viewport override with a `fullPage: true` screenshot. On the same page, browser geometry reported a 375px document viewport, a 375px Teacher screen, a 343px lesson card, and no horizontal overflow. A viewport-only screenshot rendered those measured dimensions correctly. The controlling PNG therefore overstates the live layout defect because of full-page screenshot compositing.

Two genuine Teacher-only containment gaps were present and were hardened:

1. `/teacher` inherited the browser's default 8px body margin because the app has no global reset.
2. Teacher navigation, screen, disclaimer, Teach card, and Teach controls relied on implicit width/box sizing, with no explicit phone breakpoint or overflow containment.

No lesson, source-standing, privacy, snapshot, selector, Companion, Deepgram, Durin, deployment, environment, or rail behavior changed.

## Files changed

- `src/teacherprep/TeacherPrepRoute.tsx`
- `src/teacherprep/teacherprep.css`
- `tests/teacherPrepAccessibility.test.ts`
- `proof/teacherprep/browser-walkthrough.mjs`
- this receipt and the screenshot directory listed below

## Exact layout changes

- Add and remove a route-scoped `tp-page` body class; reset body margin only while Teacher is mounted.
- Pin the Teacher shell, navigation, screen, disclaimer, and Teach controls to contained 100% widths with border-box sizing where padding participates in width.
- Clip accidental horizontal shell overflow and allow long lesson-card text to wrap.
- At `max-width: 480px`, distribute all three navigation controls evenly, reduce horizontal padding without reducing approved touch heights, preserve full-width lesson content, and let the Teach jump control use a centered row with a bounded select width.
- Add layout assertions to the existing browser walkthrough and use viewport screenshots for phone/tablet visual evidence.
- Correct the walkthrough's tablet proof viewport to the requested portrait `768×1024`.

## Viewport matrix

Browser geometry uses the document client width, which excludes the browser's 15px scrollbar gutter in this proof environment.

| Requested viewport | Document width | Navigation | Screen | Lesson card | Horizontal overflow |
|---|---:|---:|---:|---:|---|
| 375×812 | 360px | 360px | 360px | 328px | none |
| 390×844 | 375px | 375px | 375px | 343px | none |
| 430×932 | 415px | 415px | 415px | 383px | none |
| 768×1024 | 753px | 753px | 640px | 600px | none |

At 390×844, every nav item remains inside the viewport, each nav target is 117×44px, lesson content occupies 343px, and all Teach controls remain inside the viewport at 48px high.

## Tests and checks

- `npm ci`: passed; 0 vulnerabilities.
- `npm test`: passed; 19 files, 238 tests, including the added mobile layout-contract assertion.
- `npm run typecheck`: passed.
- `npm run build`: passed with Vite 8.1.4.
- Teacher accessibility, privacy, snapshot, current-week, flow, source-standing, no-evaluation, route-gate, and full app coverage are included in the full suite.
- Interactive browser flow passed at 390×844 through This Week, Prepare, Ready for Class, Teach, Neutral Screen, and print/export controls.
- Existing standalone browser walkthrough could not launch in this checkout because its undeclared `playwright-core` package and pinned Linux Chromium binary are unavailable. Its assertions were exercised through the supported in-app browser, and the script is hardened for the next provisioned proof runner.
- Print/export behavior and private-material exclusion remain covered by the unchanged application tests; print CSS was not modified.

## Screenshot index

- `mobile-layout-remediation/390-this-week.png`
- `mobile-layout-remediation/390-prepare.png`
- `mobile-layout-remediation/390-ready-for-class.png`
- `mobile-layout-remediation/390-teach.png`
- `mobile-layout-remediation/390-neutral-screen.png`
- `mobile-layout-remediation/390-print-export-controls.png`
- `mobile-layout-remediation/375-this-week.png`
- `mobile-layout-remediation/430-this-week.png`
- `mobile-layout-remediation/768-this-week.png`

## Before/after comparison

Before: the full-page proof PNG rendered navigation clipped and a visually collapsed rail, while the page's measured DOM width was substantially wider.  
After: viewport captures agree with measured geometry; navigation is fully visible, the 390px lesson card renders at 343px, long titles wrap normally, controls stay inside the viewport, and 768px tablet content retains its 640px maximum.

## Known limitations

- The full-page screenshot compositor remains unsuitable for acceptance evidence under the in-app viewport override; viewport captures are authoritative for this remediation.
- Physical-iPhone verification is still an operator gate.
- Production remains on the pre-remediation CSS until this draft PR is reviewed, merged, and deployed.

## Final acceptance recommendation

Approve the narrow remediation for merge and authorized Netlify deployment. Keep production acceptance rejected until the deployed `commit_ref`, canonical-host cache, 390×844 production capture, physical-iPhone check, and shortest complete Teacher flow are verified.

REJECTED — REMEDIATION REQUIRED
