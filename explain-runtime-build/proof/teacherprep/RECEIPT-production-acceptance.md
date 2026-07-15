# Teacher Preparation Production Acceptance Receipt

Date: 2026-07-15 UTC  
Repository: `KWilkinsonSales/explain-runtime-wedge`  
Acceptance base: `b6a57362c5d02f464eea90c311e10486a1354831`  
Canonical production URL: `https://companion-prototype-erw.netlify.app`  
Scope: LDS Teacher Preparation only

## Lineage gate

- GitHub `main` resolved to the required merge SHA.
- Netlify project `companion-prototype-erw` reported its ready production deploy at the same `commit_ref`, on branch `main`, with production context.
- Deploy id: `6a5710b13ea8bf0008ca0919`; published `2026-07-15T04:47:01.945Z`.
- No deployment, merge, environment-variable change, Companion change, Deepgram change, or Durin change was performed.

## Production observations

- `/teacher` loaded directly and exposed the expected This Week, Prepare, and Teach state model.
- The live current-week function returned HTTP 200 with `{ "validated": false, "reason": "official source responded 404" }`.
- The UI therefore failed closed with the exact label `Illustrative — official current lesson could not be verified.` No guessed current lesson was shown.
- The official public Come, Follow Me pages were available and identified the current week as `July 13–19` and scripture block `2 Kings 16–25`, but the deployed adapter still called a retired JSON endpoint.
- A phone-width production capture is retained at `production-acceptance/01-this-week-phone.png`. It also shows a narrow-layout rendering concern that should be rechecked on a physical iPhone after remediation is deployed.

## Walkthrough and boundary evidence

The production walkthrough verified intent editing, lesson-block editing, explicit `Use in class` promotion, official-source exploration, and private-insight entry. Automated acceptance coverage verified the remaining state transitions and boundaries: private note/journal isolation, immutable snapshot behavior, Teach-view projection, print/export exclusion of private content, deep links, and route isolation.

The required official current-week success path could not be accepted against production because production remained on the failing endpoint. The exact fail-closed path passed.

## Narrow remediation prepared

- Replaced the retired current-week JSON request with conservative extraction of explicit dated metadata from the official public Come, Follow Me hub and current-year manual pages.
- Added success and fail-closed parser tests for the official HTML metadata.
- Resolved the Teacher-only case-collision typecheck defect by renaming `journal.ts` to `journalStore.ts` and updating Teacher imports.
- No deployment was performed, so these changes do not alter the production observations above.

## Verification

- `npm ci`: passed; 90 packages; 0 reported vulnerabilities.
- `npm test`: passed; 19 files, 237 tests.
- Teacher-focused suite: passed (current-week, journal/privacy, snapshot, Teach view, print/export, deep-link, and route-isolation coverage included in the full suite).
- `npm run build`: passed with Vite 8.1.4.
- `npm run typecheck`: Teacher case-collision fixed; command remains blocked only by the pre-existing, out-of-scope Deepgram test import error `TS5097` in `tests/deepgramTokenFunction.test.ts:2`.
- Production current-week success path: failed.
- Production exact fail-closed path: passed.

## Required follow-up

1. Review and merge the Teacher-only adapter and typecheck remediation.
2. Deploy through the authorized Netlify rail without changing environment variables.
3. Re-run this acceptance against the deployed revision, including a physical-iPhone visual check and the official current-week success path.

## Retry — merged remediation

Retested after PR #33 merged as `aa2cdb046fdbb9b9e25d0dd3b9123c42606ee5c2`.

- Netlify deploy `6a571498a1e57f00082527aa` is ready in production, branch `main`, with `commit_ref` exactly matching the merge. It was published at `2026-07-15T05:03:48.163Z` and contains the updated `cfm-current` function.
- A cache-separated canonical-host request and the immutable deploy-host request both returned `validated: true` for `July 13–19`, `2 Kings 16–25`, with the official Church manual URL. The official-current-week success path therefore passed on the deployed revision.
- The earlier 404 response remained temporarily available at the unqualified canonical function URL through Netlify's one-hour durable cache. This is bounded cache rollover, not revision mismatch; normal clients may remain fail-closed until that entry expires.
- A complete production flow passed on the immutable production deploy: This Week → Prepare; intent edit; scripture-block edit; explicit promotion; private note; Review; Ready; Teach; Neutral Screen; Resume; End Lesson.
- Review and Teach DOM evidence excluded the sentinel private note. The full automated suite continues to cover print/export private-data exclusion and immutable snapshot behavior.
- The required 390×844 phone rendering failed visual acceptance. `production-acceptance/02-official-week-phone.png` shows the navigation clipped at the left edge and the lesson compressed into an unusably narrow column. This reproduces the concern visible in the earlier phone capture.

Updated follow-up:

1. Correct the Teacher phone-width layout through a narrow Teacher-only remediation.
2. Re-run the 390×844 browser capture and the operator's physical-iPhone check.
3. Confirm the canonical-host function cache has rolled to the validated response.

## Mobile remediation prepared — operator gate

A narrow Teacher-only mobile remediation has been prepared from post-PR-#34 `main`. Local geometry and viewport screenshots pass at 375×812, 390×844, 430×932, and 768×1024. The prior extreme narrow-rail PNG was traced primarily to full-page screenshot compositing under the browser viewport override; route-scoped margin, width, overflow, navigation, and Teach-control containment were nevertheless hardened.

See `RECEIPT-mobile-layout-remediation.md` and `mobile-layout-remediation/` for the root cause, viewport matrix, checks, and visual proof. No deploy or production mutation was performed. The production verdict remains rejected until operator review, merge/deploy authorization, physical-iPhone verification, and the production retry are complete.

## Production retry after mobile remediation

Execution window: 2026-07-15T23:29Z–23:46Z (16:29–16:46 America/Phoenix)  
GitHub `main`: `13fa74a2834c476b6de76fbffb613a52e1b73a8a`  
Merged mobile remediation: PR #36, head `c5227ff4495d33467f079562388ec36b212426fe`, merge `32c7b3e9fb40ad8db3307af13d3bf8ab75ef6bc7`

### Deployment truth

- Netlify site: `companion-prototype-erw` (`0fca5864-c706-435c-a178-30657b31f5f9`).
- Production deploy: `6a57e31fbd1380000833ea86`; state `ready`; context `production`; branch `main`; published `2026-07-15T19:44:54.785Z`.
- Netlify `commit_ref` is exactly `13fa74a2834c476b6de76fbffb613a52e1b73a8a`, matching current GitHub `main`.
- The deploy is Git-backed: its commit URL points to the GitHub revision and its production branch is `main`. No manual publish, deployment, environment-variable change, or rail change was performed.

### Route and source truth

- `/teacher`, `/companion/prototype`, `/durin`, and `/` each returned HTTP 200.
- `/teacher` rendered Teacher Preparation and no Companion controls.
- `/companion/prototype` rendered Companion controls and no Teacher controls.
- `/durin` rendered Durin Intake and no Teacher controls.
- The root selector retained `LDS Teacher Preparation` / `Prototype — curriculum workflow` and the canonical routes.
- The exact unqualified canonical current-week endpoint returned HTTP 200 and `validated: true`; the earlier cached 404/fail-closed response has rolled over.
- Canonical and immutable production hosts both returned the validated week `July 13–19`, title/scripture block `2 Kings 16–25`, and official URL `https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/29?lang=eng`.
- The canonical response carried `cache-control: public,max-age=3600`, `cache-status: "Netlify Durable"; fwd=bypass`, `netlify-vary: query`, and source timestamp `2026-07-15T23:40:12.302Z`.

### Phone and tablet viewport matrix

The browser runner reserves a 15px scrollbar gutter; document widths below are therefore 15px narrower than the requested outer viewport. `scrollWidth` equaled document width in every case.

| Requested viewport | Document width | Navigation | Lesson card | Horizontal overflow | Result |
|---|---:|---:|---:|---|---|
| 375×812 | 360px | 360px, fully contained | 328px | none | pass |
| 390×844 | 375px | 375px, fully contained | 343px | none | pass |
| 430×932 | 415px | 415px, fully contained | 383px | none | pass |
| 768×1024 | 753px | 753px, fully contained | 600px | none | pass |

At 390×844, This Week navigation targets were 117×44px and remained within the viewport. The primary action was 48px high. Teach used the full 375px document width for both card and controls; Previous, Next, Neutral Screen, section jump, and End Lesson remained reachable. Neutral Screen exposed a centered 158.5×48px Resume control. No clipping, edge overlap, or off-screen primary control was observed.

The supplemental 768×1024 capture used the same Git-backed production deploy's `main--companion-prototype-erw.netlify.app` host to avoid an older device-local preparation pinned on the canonical origin. It rendered the validated official week, a 640px screen, 600px lesson card, 44px navigation targets, and a 48px primary control without overflow.

### Production flow, privacy, print, and network

- The canonical host passed This Week → Prepare; intent edit; lesson-block edit; official-source promotion; private journal sentinel; Review; and Ready for Class.
- The same Git-backed immutable production deploy completed Ready → Teach; Next; Neutral Screen; Resume; print/export control inspection; and End Lesson after the Chrome automation connection ended.
- The private sentinels were present in Prepare only and absent from Review, Teach, After class, and the default export surface.
- The active class snapshot remained isolated from subsequent private journal material.
- Print now, Teacher Packet, Class Handout, and Large Print / Presentation Backup were visible and enabled. Tests verified all three presets exclude private notes and journal material by default; only the Teacher Packet can receive private material after explicit opt-in. Print CSS was unchanged.
- Observed page assets were same-origin script, stylesheet, and favicon resources. The current-week request was same-origin and the function's validated source was the official Church host. No browser console errors or unexpected destination was observed; microphone access was never requested.

### Regression

- `npm ci`: passed; 90 packages installed.
- Focused Teacher, accessibility, privacy, snapshot, journal, current-week, source-promotion, no-evaluation, and route-gate suite: 9 files, 87 tests passed.
- Full application suite: 19 files, 238 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with Vite 8.1.4; 60 modules transformed.

### Screenshot index

- `production-acceptance-retry/375-this-week.jpg`
- `production-acceptance-retry/390-this-week.jpg`
- `production-acceptance-retry/390-ready-for-class.jpg`
- `production-acceptance-retry/390-teach.jpg`
- `production-acceptance-retry/390-neutral-screen.jpg`
- `production-acceptance-retry/390-print-export-controls.jpg`
- `production-acceptance-retry/430-this-week.jpg`
- `production-acceptance-retry/768-this-week.jpg`
- `production-acceptance-retry/OPERATOR-physical-iphone-evidence.md`

### Physical-iPhone gate and remaining limitation

No physical iPhone was attached or remotely controllable in this execution, so device model, iOS version, physical Safari viewport, safe-area/orientation behavior, and device screenshots could not be recorded. Simulated 375×812, 390×844, 430×932, and 768×1024 browser evidence is not substituted for that mandatory physical-device gate. The compact operator checklist and result fields are preserved in `production-acceptance-retry/OPERATOR-physical-iphone-evidence.md`. All automated production evidence passes, but the acceptance command requires the completed physical-iPhone record before the accepted verdict may be used.

## Verdict

REJECTED — REMEDIATION REQUIRED
