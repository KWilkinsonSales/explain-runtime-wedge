import type { KernelState } from "./state.js";
import type { KernelEventEnvelope } from "./envelope.js";
import type { InvariantResult, InvariantViolation } from "./invariants.js";

export type KernelVersion = "0.1.0";

export type KernelEffectKind =
  | "CONTRACT_READY"
  | "ROOM_RUNNING"
  | "THRESHOLD_EVALUATION_REQUESTED"
  | "RECEIPT_PENDING"
  | "ROOM_CLOSED"
  | "INVARIANT_VIOLATION_RECORDED";

export type KernelEffect = {
  readonly kind: KernelEffectKind;
  readonly description: string;
  readonly correlationId?: string;
};

export type KernelDecision = {
  readonly code: string;
  readonly description: string;
};

export type KernelTransition = {
  readonly previousState: KernelState;
  readonly envelope: KernelEventEnvelope;
  readonly nextState: KernelState;
};

export type TransitionResult = {
  readonly ok: boolean;
  readonly previousState: KernelState;
  readonly nextState: KernelState;
  readonly decisions: readonly KernelDecision[];
  readonly effects: readonly KernelEffect[];
  readonly invariantResults: readonly InvariantResult[];
  readonly errors: readonly InvariantViolation[];
};

export type KernelConfig = {
  readonly runtimeVersion: KernelVersion;
  readonly invariants?: readonly string[];
};
