import type { KernelEventEnvelope } from "./envelope.js";
import type { KernelState } from "./state.js";

export type InvariantViolation = {
  readonly invariantId: string;
  readonly code: string;
  readonly message: string;
  readonly eventId?: string;
};

export type InvariantResult =
  | { readonly ok: true; readonly invariantId: string }
  | { readonly ok: false; readonly invariantId: string; readonly violation: InvariantViolation };

export type RuntimeInvariant = {
  readonly id: string;
  readonly evaluate: (args: {
    readonly previousState: KernelState;
    readonly nextState: KernelState;
    readonly envelope: KernelEventEnvelope;
  }) => InvariantResult;
};

function pass(invariantId: string): InvariantResult {
  return { ok: true, invariantId };
}

function fail(invariantId: string, code: string, message: string, eventId?: string): InvariantResult {
  return {
    ok: false,
    invariantId,
    violation: { invariantId, code, message, eventId },
  };
}

export const kernelInvariants: readonly RuntimeInvariant[] = [
  {
    id: "envelope-version-supported",
    evaluate: ({ envelope }) =>
      envelope.envelopeVersion === "0.1"
        ? pass("envelope-version-supported")
        : fail(
            "envelope-version-supported",
            "UNSUPPORTED_ENVELOPE_VERSION",
            "Kernel envelope version must be 0.1.",
            envelope.eventId,
          ),
  },
  {
    id: "closed-is-terminal",
    evaluate: ({ previousState, nextState, envelope }) =>
      previousState.status === "CLOSED" && nextState.status !== "CLOSED"
        ? fail("closed-is-terminal", "CLOSED_STATE_REOPENED", "A closed room may not reopen.", envelope.eventId)
        : pass("closed-is-terminal"),
  },
  {
    id: "event-id-recorded",
    evaluate: ({ nextState, envelope }) =>
      nextState.lastEventId === envelope.eventId
        ? pass("event-id-recorded")
        : fail("event-id-recorded", "EVENT_ID_NOT_RECORDED", "Kernel state must record the last applied event id.", envelope.eventId),
  },
];

export function runInvariants(args: {
  readonly previousState: KernelState;
  readonly nextState: KernelState;
  readonly envelope: KernelEventEnvelope;
  readonly invariants?: readonly RuntimeInvariant[];
}): readonly InvariantResult[] {
  const invariants = args.invariants ?? kernelInvariants;
  return invariants.map((invariant) => invariant.evaluate(args));
}
