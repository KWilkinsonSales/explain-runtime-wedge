import type { RoomId, RoomContractVersion } from "../room-contract/types.js";
import type { LensId, LensVersion } from "../lens-manifest/types.js";

export type RuntimeStatus =
  | "BOOTING"
  | "READY"
  | "RUNNING"
  | "COMPLETE_PENDING_RECEIPT"
  | "CLOSED"
  | "ERROR";

export type KernelState = {
  readonly status: RuntimeStatus;
  readonly roomId?: RoomId;
  readonly contractVersion?: RoomContractVersion;
  readonly lensId?: LensId;
  readonly lensVersion?: LensVersion;
  readonly acceptedEventKinds: readonly string[];
  readonly lastEventId?: string;
  readonly pendingReceiptType?: string;
  readonly invariantViolations: readonly string[];
};

export const initialKernelState: KernelState = {
  status: "BOOTING",
  acceptedEventKinds: [],
  invariantViolations: [],
};

export function withStatus(state: KernelState, status: RuntimeStatus): KernelState {
  return { ...state, status };
}
