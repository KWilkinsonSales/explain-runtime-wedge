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

## Verdict

REJECTED — REMEDIATION REQUIRED
