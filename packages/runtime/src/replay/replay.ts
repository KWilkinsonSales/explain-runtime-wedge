import type { KernelEventEnvelope } from "../kernel/envelope.js";
import { initialKernelState, type KernelState } from "../kernel/state.js";
import { step } from "../kernel/step.js";
import { stableDigest } from "./digest.js";

export type ReplayResult = {
  readonly finalState: KernelState;
  readonly digest: string;
};

export function replay(events: readonly KernelEventEnvelope[]): ReplayResult {
  let state = initialKernelState;
  for (const event of events) {
    state = step(state, event).nextState;
  }
  return { finalState: state, digest: stableDigest({ events, finalState: state }) };
}
