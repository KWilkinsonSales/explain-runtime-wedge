# Implementation Receipt — LDS Teacher Preparation v1.1

Per the 2026-07-12 v1.1 Amendment (Companion Separation + LDS Teacher
Preparation Completion). Extends the v1 receipt (`RECEIPT.md`); v1 boundaries
(three states, stable snapshot, device-local privacy, no evaluation surface)
are unchanged and re-proven by the same regression suites.

## Production entry

**https://companion-prototype-erw.netlify.app/teacher** opens This Week
directly — no Companion branding, microphone controls, diagnostics, or
Companion navigation appear anywhere on the LDS surface. State is isolated
(`teacherprep.*` localStorage namespaces vs Companion's
`companion-teleprompter-sync-v1`).

## What v1.1 adds

### Current-week Come, Follow Me adapter
- `netlify/functions/cfm-current.mts` fetches the Church's own public study
  endpoint on churchofjesuschrist.org (no scraping of authenticated content,
  no credentials), extracts the entry whose official week label covers today
  (`src/teacherprep/cfmExtract.ts`), and returns strictly validated public
  metadata: exact date range, official lesson title, official scripture
  block, official link, and a source note.
- The client (`src/teacherprep/currentWeek.ts`) re-validates every payload
  (all fields present, link on the official host, date range covering today)
  and caches only that public metadata for resilience.
- Anything short of full validation shows the fixture labeled exactly:
  **“Illustrative — official current lesson could not be verified.”**
  Nothing is ever inferred from model memory or unofficial calendars.
- Once preparation starts, the lesson is pinned into the shared store so
  Prepare/Teach never shift beneath the teacher mid-week.

### Explore Approved Sources (in Prepare)
- Calm optional drawer; three source classes with fixed standing labels:
  **Official** (scriptures, Come Follow Me, General Conference, manuals,
  Gospel Topics, public Handbook), **Associated context** (BYU Speeches,
  Religious Studies Center, BYU Scripture Citation Index), **Labeled
  external context** (historical, geographic, linguistic, pedagogical).
- Official first by default; class filters are toggles; every item shows
  standing, title, a short relevance note, and an external link.
- Two deliberate exits only: *Add insight to my preparation* (a device-local
  private note carrying provenance) and *Promote to Class…* — associated and
  external items require an inline explicit confirmation
  (`SourcePromotionNotConfirmedError` otherwise); promoted blocks stay
  visibly labeled with their standing and are reversible. External material
  is context only; the registry states it may clarify but never defines
  doctrine.

### Device-local Journal / Reflections
- Collapsible journal in Prepare and an optional **After class** screen when
  the teacher ends a lesson. Plain text, debounced auto-save to the private
  store, local delete, persistent label
  “Private · stays on this device · not uploaded or shared”.
- Zero network payload (walkthrough monitors every request), never in Teach,
  excluded from all exports by default; may be explicitly included in the
  private Teacher Packet only, via the labeled opt-in.

### Print / Save Lesson
- From the active snapshot: **Print now** plus Teacher Packet, Class
  Handout, and Large Print / Presentation Backup presets. Each opens the
  device print view; “Save as PDF” there is the browser-supported save path.
- `@page` margins and page-break rules for readable pagination; official
  links, scripture references, and the independence disclaimer retained;
  private material excluded by default.

## Church Account feasibility finding

No official supported public developer API or Church Account OAuth path for
third-party apps exists (Church tech forum states no public APIs are
provided; content licensing runs through permissions.churchofjesuschrist.org
with an IP agreement; community APIs are unofficial). **No sign-in was
implemented; public official links remain the production path.** Details and
sources in `proof/RECON-2026-07-12.md`.

## Changed files (v1.1)

- New: `netlify/functions/cfm-current.mts`; `src/teacherprep/cfmExtract.ts`,
  `currentWeek.ts`, `sources.ts`, `journal.ts`, `ExploreSources.tsx`,
  `Journal.tsx`
- Updated: `types.ts` (journal entries, source-standing tag on blocks),
  `store.ts` (pinned lesson in shared state), `prep.ts`
  (`promoteSourceToClass` with confirmation gate), `TeacherPrepApp.tsx`
  (current-week resolution, After-class reflection view), `ThisWeek.tsx`
  (validated week vs required fallback label), `Prepare.tsx` (sources drawer,
  journal), `ReadyReview.tsx` (Print now, journal opt-in), `exportPdf.ts`
  (`@page` rules), `teacherprep.css`
- Tests (new): `teacherPrepCurrentWeek.test.ts`, `teacherPrepSources.test.ts`,
  `teacherPrepJournal.test.ts`
- Proof: updated `browser-walkthrough.mjs`, screenshots `10-explore-sources-phone.png`,
  `11-reflect-phone.png`, refreshed `01–09`

## Evidence

- `npm run typecheck` — clean (strict).
- `npm run test` — **13 files, 129 tests, 129 passed** (Companion suites and
  all v1 regression suites untouched and green; the no-evaluation source scan
  covers every new file).
- `npm run build` — production build clean.
- Browser walkthrough against the production build (`vite preview`) —
  **29/29 checks passed** at 390×844 and 1024×768, including: labeled
  fallback shown when the official lesson is unverified; official class on by
  default; external promotion requires explicit confirmation and stays
  labeled; reflection screen after End Lesson; journal auto-saved to the
  private store only; zero non-localhost network requests; snapshot isolation
  and deliberate replacement; Companion untouched at `/companion/prototype`.

## Known limitations

- The official-endpoint parser could not be exercised against the live
  churchofjesuschrist.org from this build environment (network policy blocks
  the host here; Netlify functions in production are not restricted). Success
  path is proven against recorded payload shapes; if the live payload differs,
  the surface falls back to the labeled fixture — never to guessed content —
  until the extractor is adjusted.
- Everything listed in the v1 receipt still applies (print-dialog PDF path,
  per-browser localStorage persistence, no service worker).

## Run instructions

Live: **https://companion-prototype-erw.netlify.app/teacher**

```bash
cd explain-runtime-build
npm install
npm run dev        # http://localhost:5173/teacher
npm run test && npm run typecheck && npm run build
node proof/teacherprep/browser-walkthrough.mjs   # against vite dev or preview
```
