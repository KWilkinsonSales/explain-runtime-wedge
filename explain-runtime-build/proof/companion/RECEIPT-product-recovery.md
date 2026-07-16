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

A newly authorized development-project credential was saved only to the ignored local `.env.local` and used for bounded local verification. The credential value, authorization headers, raw payloads, and prompt/answer text were not printed or stored in this receipt.

All accepted calls returned `200` from `openai / gpt-5.4-mini-2026-03-17`:

| Scenario | Result | Sanitized quality evidence | Latency | Provider request ID |
| --- | --- | --- | ---: | --- |
| A | Pass | useful direct explanation; not acknowledgement-only; bounded SPEAK/STEER | 3418 ms | `resp_077804484ad11542006a584b6b39bc8199b3987464595ef745` |
| B | Pass | explanation used theater-informed audience context | 2526 ms | `resp_05dcba0f51338fa9006a584b6e8bec819bb83d29e83d730545` |
| C | Pass | contextual follow-up used actor/stage-manager framing from the active session | 2578 ms | `resp_010012a786dbeab6006a584b710d948199bc24b266f604c55a` |
| D | Pass | active-session recall correctly referenced the immediately prior request | 2286 ms | `resp_00ee14c6328cc294006a584b73b2ac8198807965b00c4961fa` |
| E | Pass | context-free ambiguous statement produced one concise clarification question | 1429 ms | `resp_0631e6015d7c0186006a584b84dbe48198a70b68186be23624` |

All answers were useful and within the endpoint's response bounds; all SPEAK/STEER fields were present and bounded. The first ambiguity probe contained residual active-session context and produced a useful bounded response without an explicit question, so it was not accepted. The required context-free ambiguous-input retry passed; this variability remains a live-device evaluation consideration.

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

- Before any production deployment, create a dedicated Companion OpenAI project/service-account key and store it only in Netlify's server-side environment.
- If that production credential does not exist, stop with `PRODUCTION CREDENTIAL REQUIRED`.
- Live iPhone microphone, Deepgram, network, and response acceptance remains an operator gate.
- The browser walkthrough uses a deterministic provider stub; it proves presentation and wiring, not live OpenAI quality.
- No deployment, merge, or Netlify environment change was performed.

## Verdict

**WORKABLE PROTOTYPE READY FOR LIVE-DEVICE ACCEPTANCE**
