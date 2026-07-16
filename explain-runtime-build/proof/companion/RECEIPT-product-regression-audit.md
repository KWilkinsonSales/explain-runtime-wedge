# Companion Product Regression Audit

Date: 2026-07-15

Branch: `agent/companion-product-recovery`

Base: `40f7180a5aa13e760efc66f56db5a0188b2c9758`

## Root cause

The acknowledgement-only behavior is an **intentional bounded fallback plus a missing OpenAI provider implementation**. `ResponseEngine` defaults to `deterministicProvider`, which calls `runAdmissionRail`. That rail classifies the utterance as a question or statement and deliberately produces only posture copy such as “Direct answer: addressing … now” or “Noted …”. It never attempts to answer the utterance. The v1.2 receipt explicitly records that no external model or secret was wired.

This is not a response-engine concurrency defect, UI submission defect, disabled provider, configuration defect, or deployment defect. Text and final voice segments both reach the engine correctly. The UI renders exactly the deterministic admission output it receives, so the product regression is architectural: admission evidence became the primary answer because no useful-answer provider existed behind the already-designed seam.

## Files involved

- `src/prototype/CompanionPrototype.tsx` — both text and final voice segments call `ResponseEngine.admitAndExecute`; renders the returned SPEAK/STEER as primary output.
- `src/prototype/responseEngine.ts` — idempotency, duplicate suppression, stale-response handling, fallback, and the replaceable `ResponseProvider` seam.
- `src/prototype/admissionSourceAdapter.ts` — normalization, question/statement detection, evidence receipt, and acknowledgement-only deterministic output.
- `src/prototype/liveTranscription.ts` — final Deepgram/Web Speech segments enter the same engine path.
- `netlify/functions/deepgram-token.mts` — transcription credential boundary; unrelated to answer generation.
- `proof/companion/RECEIPT.md` — documents the deterministic provider as a known limitation.

## Current runtime path

`voice final segment or text submit → ResponseEngine → deterministicProvider → runAdmissionRail → question/statement acknowledgement → SPEAK/STEER renderer + receipt`

## Intended runtime path

`voice final segment or text submit → admission normalization and receipt → bounded session context → server-side Companion response endpoint → normalized useful answer + SPEAK/STEER → primary answer renderer + secondary evidence receipt`

## Reuse

- Keep the single voice/text `ResponseEngine` path.
- Keep stable session/event IDs, exactly-once execution, duplicate suppression, stale-result supersession, fallback, and teleprompter mirroring.
- Keep admission normalization, event detection, confidence, provenance, and evidence-quality receipts.
- Keep Deepgram streaming/token behavior and existing microphone/runtime state machine.
- Keep Teacher and Durin isolated and unchanged.

## Required change

- Add one root Netlify function that calls the OpenAI Responses API with a bounded, server-only credential and a strict structured response.
- Add a browser provider adapter behind the existing engine seam.
- Let the engine supply bounded active-session context and preserve safe provider metadata.
- Render a useful answer and understood request as the primary experience; retain SPEAK/STEER and admission evidence separately.
- Add deterministic function/provider/context/failure tests; normal tests must not call OpenAI.

## Must remain unchanged

- No browser-visible API key or provider authorization header.
- No autonomous tools or side effects.
- Human remains final authority.
- Existing voice capture, transcription state, admission provenance, duplicate/stale protections, route isolation, Teacher, Durin, and the unrelated worktree.
- Production must fail closed until a dedicated Companion project/service-account credential is configured.
