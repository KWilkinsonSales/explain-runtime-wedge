# LDS Teacher Preparation + Presentation Mode (v1)

An isolated surface at exactly `/teacher` (see `src/main.tsx`); every other
path still renders Companion. Gated by `TEACHER_PREP_ENABLED` in
`featureFlag.ts` — flip to `false` to disable without deleting code.

Three teacher states: **This Week → Prepare → Teach**.

## Boundaries this module keeps

- **Device-local privacy.** Personal notes live only under
  `teacherprep.private.v1` in localStorage (`store.ts`). The shared payload
  serializer never sees them, there is no network code in this folder, and
  promoting a private note into class content requires an explicit
  confirmation (`prep.ts`).
- **Stable snapshot.** Teach renders only the frozen Ready for Class
  snapshot (`snapshot.ts`). Editing Prepare never changes Teach until the
  teacher deliberately replaces the snapshot.
- **No evaluation.** Nothing here measures, rates, or compares the teacher
  or the class; `tests/teacherPrepNoEvaluation.test.ts` scans this folder
  and fails if evaluation vocabulary reappears.
- **Illustrative data.** The only lesson is a deterministic fixture
  (`fixture.ts`) labeled “Illustrative — not current official lesson.”

## Print / PDF

`exportPdf.ts` builds print-ready HTML from the snapshot (Teacher Packet,
Class Handout, Large Print) and opens the native print dialog; “Save as
PDF” produces the artifact. Private notes are excluded by default on every
preset.

## Running

Production review URL: **https://companion-prototype-erw.netlify.app/teacher**
(the deployment root `/` is a product selector with a Teacher Preparation entry).

```bash
cd explain-runtime-build
npm install
npm run dev        # open http://localhost:5173/teacher
npm run test       # includes the teacherPrep* suites
npm run typecheck
npm run build
```
