import type { KernelEventEnvelope, KernelState } from "@adl/runtime";
import { initialKernelState, step } from "@adl/runtime";
import type { ProofLensManifest } from "@adl/lenses";

export type ScenarioTrace = {
  readonly manifest: ProofLensManifest;
  readonly events: readonly KernelEventEnvelope[];
  readonly states: readonly KernelState[];
  readonly invariantSummary: readonly { readonly eventId: string; readonly ok: boolean }[];
  readonly finalState: KernelState;
};

export function buildScenario(manifest: ProofLensManifest): readonly KernelEventEnvelope[] {
  const roomId = `room-${manifest.lensId}` as never;
  return [
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-1`,
      occurredAt: "2026-06-13T00:00:00.000Z",
      kind: "LOAD_CONTRACT",
      payload: { roomId, contractVersion: "0.1", allowedEventKinds: ["LOAD_LENS_MANIFEST", "APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"] }
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-2`,
      occurredAt: "2026-06-13T00:00:01.000Z",
      roomId,
      kind: "LOAD_LENS_MANIFEST",
      payload: { lensId: manifest.lensId as never, lensVersion: manifest.version as never, declaredEventKinds: ["APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"] }
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-3`,
      occurredAt: "2026-06-13T00:00:02.000Z",
      roomId,
      kind: "APPLY_USER_EVENT",
      payload: { fieldId: "situation", value: `sample-${manifest.lensId}-situation` }
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-4`,
      occurredAt: "2026-06-13T00:00:03.000Z",
      roomId,
      kind: "REQUEST_THRESHOLD_EVALUATION",
      payload: { thresholdId: manifest.threshold.id }
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-5`,
      occurredAt: "2026-06-13T00:00:04.000Z",
      roomId,
      kind: "SELECT_RECEIPT",
      payload: { receiptType: manifest.receiptPolicy.receiptType }
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-6`,
      occurredAt: "2026-06-13T00:00:05.000Z",
      roomId,
      kind: "CLOSE_ROOM",
      payload: { reason: "completed" }
    }
  ];
}

export function runScenario(manifest: ProofLensManifest): ScenarioTrace {
  const events = buildScenario(manifest);
  const states: KernelState[] = [initialKernelState];
  const invariantSummary: { eventId: string; ok: boolean }[] = [];
  let state = initialKernelState;

  for (const envelope of events) {
    const result = step(state, envelope);
    invariantSummary.push({ eventId: envelope.eventId, ok: result.ok });
    state = result.nextState;
    states.push(state);
  }

  return { manifest, events, states, invariantSummary, finalState: state };
}
