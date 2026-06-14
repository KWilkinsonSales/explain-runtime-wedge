import type { KernelEventEnvelope } from "./envelope.js";
import { runInvariants, type InvariantViolation, type RuntimeInvariant } from "./invariants.js";
import type { KernelState } from "./state.js";
import type { KernelDecision, KernelEffect, TransitionResult } from "./types.js";

export function step(
  state: KernelState,
  envelope: KernelEventEnvelope,
  options: { readonly invariants?: readonly RuntimeInvariant[] } = {},
): TransitionResult {
  const decisions: KernelDecision[] = [];
  const effects: KernelEffect[] = [];

  const nextState = applyTransition(state, envelope, decisions, effects);
  const invariantResults = runInvariants({ previousState: state, nextState, envelope, invariants: options.invariants });
  const errors = invariantResults.flatMap((result): InvariantViolation[] => (result.ok ? [] : [result.violation]));

  const finalState: KernelState = errors.length === 0
    ? nextState
    : {
        ...nextState,
        status: "ERROR",
        invariantViolations: [...nextState.invariantViolations, ...errors.map((error) => error.code)],
      };

  return {
    ok: errors.length === 0,
    previousState: state,
    nextState: finalState,
    decisions,
    effects,
    invariantResults,
    errors,
  };
}

function applyTransition(
  state: KernelState,
  envelope: KernelEventEnvelope,
  decisions: KernelDecision[],
  effects: KernelEffect[],
): KernelState {
  const withLastEvent = { ...state, lastEventId: envelope.eventId };

  switch (envelope.kind) {
    case "LOAD_CONTRACT":
      decisions.push({ code: "CONTRACT_LOADED", description: "Room contract accepted by kernel shell." });
      effects.push({ kind: "CONTRACT_READY", description: "Room contract ready for manifest admission.", correlationId: envelope.causality?.correlationId });
      return {
        ...withLastEvent,
        status: "READY",
        roomId: envelope.payload.roomId,
        contractVersion: envelope.payload.contractVersion,
        acceptedEventKinds: envelope.payload.allowedEventKinds,
      };

    case "LOAD_LENS_MANIFEST":
      decisions.push({ code: "MANIFEST_ADMITTED", description: "Lens manifest metadata admitted without interpretation." });
      effects.push({ kind: "ROOM_RUNNING", description: "Room is ready to run with admitted metadata.", correlationId: envelope.causality?.correlationId });
      return {
        ...withLastEvent,
        status: "RUNNING",
        lensId: envelope.payload.lensId,
        lensVersion: envelope.payload.lensVersion,
      };

    case "APPLY_USER_EVENT":
      decisions.push({ code: "USER_EVENT_ACCEPTED", description: "User event accepted as a governed input envelope." });
      return { ...withLastEvent, status: state.status === "READY" ? "RUNNING" : state.status };

    case "REQUEST_THRESHOLD_EVALUATION":
      decisions.push({ code: "THRESHOLD_REQUESTED", description: "Threshold evaluation requested; evaluation implementation is outside Commit 2." });
      effects.push({ kind: "THRESHOLD_EVALUATION_REQUESTED", description: "A later proof commit may evaluate this threshold request.", correlationId: envelope.causality?.correlationId });
      return { ...withLastEvent, status: "RUNNING" };

    case "SELECT_RECEIPT":
      decisions.push({ code: "RECEIPT_SELECTED", description: "Receipt type selected; emission is outside Commit 2." });
      effects.push({ kind: "RECEIPT_PENDING", description: "Receipt selection recorded as pending.", correlationId: envelope.causality?.correlationId });
      return { ...withLastEvent, status: "COMPLETE_PENDING_RECEIPT", pendingReceiptType: envelope.payload.receiptType };

    case "CLOSE_ROOM":
      decisions.push({ code: "ROOM_CLOSED", description: "Room closed by governed envelope." });
      effects.push({ kind: "ROOM_CLOSED", description: `Room closed: ${envelope.payload.reason}.`, correlationId: envelope.causality?.correlationId });
      return { ...withLastEvent, status: "CLOSED" };

    case "MARK_ERROR":
      decisions.push({ code: "ERROR_MARKED", description: "Kernel entered explicit error state." });
      return { ...withLastEvent, status: "ERROR", invariantViolations: [...state.invariantViolations, envelope.payload.message] };
  }
}
