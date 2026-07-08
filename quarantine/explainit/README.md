# ExplainIT — quarantined out of the Companion app

ExplainIT (the governed explanation room: `App.tsx` mission runner,
`explainit/` room surfaces, mission/runtime/realtime state machines) is a
separate product surface. It must not appear in the Companion runtime or the
Netlify production deploy, so it lives here — outside `explain-runtime-build`
— where Vite, `tsc --noEmit`, and Vitest never see it.

Nothing in this directory is imported by the Companion app. The v1.1 proof
script (`explain-runtime-build/proof/companion-v11-proof.mjs`) fails the
build if ExplainIT strings or routes reappear in the production bundle.

Revival notes: `explainit/roomSession.ts` and `explainit/ExplainItRoom.tsx`
imported two shared Companion modules via `../prototype/…`
(`admissionSourceAdapter`'s `detectEventType` and `companionRuntime`). Those
modules stayed with Companion, so re-path those imports (or copy the modules)
when ExplainIT moves to its own app.
