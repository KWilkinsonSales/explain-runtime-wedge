# Companion Product Recovery Receipt

Date: 2026-07-15

Base SHA: `40f7180a5aa13e760efc66f56db5a0188b2c9758`

Branch: `agent/companion-product-recovery`

## Root cause

Companion's voice and text submission paths were working, but `ResponseEngine` intentionally defaulted to the deterministic admission rail. That rail classified the utterance and returned an acknowledgement/posture line; it had no useful-answer provider. Admission evidence therefore occupied the primary answer position. See `RECEIPT-product-regression-audit.md`.

Classification: **intentional bounded fallback + missing OpenAI provider implementation**. No response-engine concurrency, UI submission, configuration, or deployment defect caused the acknowledgement-only result.

## Recovery architecture

One governed path now serves both text and completed voice utterances:

`input → admission/event detection → bounded active-session context → /.netlify/functions/companion-response → ResponseEngine normalization → useful answer + SPEAK/STEER → evidence receipt`

`netlify/functions/companion-response.mts` calls the OpenAI Responses API directly from the server boundary. The browser adapter in `src/prototype/companionResponseProvider.ts` is injected through the existing replaceable `ResponseProvider` seam. The engine still owns stable event IDs, exactly-once execution, duplicate suppression, stale-result supersession, and fallback rendering.

## Security boundary

- `OPENAI_API_KEY` is read only by the root Netlify function.
- No key, authorization header, raw provider error body, or prompt log is returned or recorded.
- Requests are limited to 2,000 characters per utterance, 8 context turns, 8,000 context characters, and a small total request body.
- Responses use a strict four-field structured schema and are length-bounded again after parsing.
- Provider work aborts after 15 seconds.
- Provider failures map to sanitized status/code responses.
- No OpenAI tools are enabled; the endpoint has no autonomous actions or external side effects beyond the bounded model request.
- The human remains final authority.
- Secret scans found no key-shaped value in source, diff, proof, or production browser bundle.

## Files changed

- `netlify/functions/companion-response.mts`
- `explain-runtime-build/src/prototype/companionResponseProvider.ts`
- `explain-runtime-build/src/prototype/responseEngine.ts`
- `explain-runtime-build/src/prototype/admissionSourceAdapter.ts`
- `explain-runtime-build/src/prototype/CompanionPrototype.tsx`
- `explain-runtime-build/src/prototype/prototype.css`
- `explain-runtime-build/tests/companionResponseFunction.test.ts`
- `explain-runtime-build/tests/companionResponseProvider.test.ts`
- `explain-runtime-build/tests/companionResponseEngine.test.ts`
- `explain-runtime-build/proof/companion/browser-walkthrough.mjs`
- this receipt, the pre-change audit, and four recovery screenshots

Teacher, Durin, product selector behavior, Netlify environment variables, and the unrelated second worktree were not changed.

## Deterministic scenario evidence

Provider and function seams cover:

- **A — Explain ADL:** useful structured explanation returned by the provider stub.
- **B — Explain ADL to a theater-informed listener:** audience instruction is preserved in the bounded context payload.
- **C — How would actors and stage managers use it?:** prior user/assistant turns are sent before the follow-up and the answer uses the theater frame.
- **D — What did I just ask you?:** engine test proves prior active-session turns reach the provider and the answer references “Explain ADL.”
- **E — ambiguous statement:** provider seam returns one concise clarification question.

No normal unit test calls the live OpenAI API. Additional deterministic coverage includes request limits, missing credential, sanitized provider rejection, timeout/abort, malformed response, client normalization, duplicate suppression, and stale-response handling.

## Verification results

- Companion response function/provider/engine tests: passed.
- Admission adapter tests: passed.
- Live transcription tests: passed.
- Deepgram token-function tests: passed.
- Route isolation tests: passed.
- Teacher regression tests: passed.
- Durin regression tests: passed.
- Full suite: **21 files, 249 tests, 249 passed**.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Phone/tablet Chromium walkthrough: **27 checks passed**.
- Secret-leak scan: passed; no matches in source/diff/proof/bundle.

## Bounded live verification

The existing process-level key was used only in memory for non-sensitive local prompts. The endpoint reached OpenAI, but all live attempts failed closed with sanitized `HTTP 401 / provider_rejected` (“response provider is not authorized”). No key, request header, raw provider response, or sensitive prompt was printed or stored.

Because the authorized existing key cannot currently complete a response, useful live direct-answer, contextual-follow-up, and clarification outcomes could not be accepted. Offline seams and UI behavior are proven, but live provider acceptance remains open.

## Screenshots

Before recovery:

- `01-companion-off-phone.png`
- `02-companion-listening-phone.png`
- `03-companion-text-mode-phone.png`
- `04-companion-listening-tablet.png`

After recovery:

- `05-product-recovery-off-phone.png`
- `06-product-recovery-listening-phone.png`
- `07-product-recovery-text-answer-phone.png`
- `08-product-recovery-listening-desktop.png`

The after text-mode screenshot shows a useful answer as the primary output, followed by understood intent, SPEAK, and STEER; admission classification is secondary evidence.

## Remaining limitations and gates

- Resolve the local live-verification `401` with an authorized development credential before claiming live model acceptance.
- Before any production deployment, create a dedicated Companion OpenAI project/service-account key and store it only in Netlify's server-side environment.
- If that production credential does not exist, stop with `PRODUCTION CREDENTIAL REQUIRED`.
- Live iPhone microphone, Deepgram, network, and response acceptance remains an operator gate.
- The browser walkthrough uses a deterministic provider stub; it proves presentation and wiring, not live OpenAI quality.
- No deployment, merge, or Netlify environment change was performed.

## Verdict

**REMEDIATION REQUIRED**
