import type { RoomId } from "../room-contract/types.js";
import type { LensId, LensVersion } from "../lens-manifest/types.js";

export type EnvelopeVersion = "0.1";

export type RuntimeActor = {
  readonly actorId: string;
  readonly actorType: "human" | "surface" | "system";
};

export type RuntimeCausality = {
  readonly correlationId?: string;
  readonly causationId?: string;
};

export type RuntimeEventKind =
  | "LOAD_CONTRACT"
  | "LOAD_LENS_MANIFEST"
  | "APPLY_USER_EVENT"
  | "REQUEST_THRESHOLD_EVALUATION"
  | "SELECT_RECEIPT"
  | "CLOSE_ROOM"
  | "MARK_ERROR";

export type RuntimeEventPayloadByKind = {
  readonly LOAD_CONTRACT: {
    readonly roomId: RoomId;
    readonly contractVersion: string;
    readonly allowedEventKinds: readonly RuntimeEventKind[];
  };
  readonly LOAD_LENS_MANIFEST: {
    readonly lensId: LensId;
    readonly lensVersion: LensVersion;
    readonly declaredEventKinds: readonly RuntimeEventKind[];
  };
  readonly APPLY_USER_EVENT: {
    readonly fieldId: string;
    readonly value: unknown;
  };
  readonly REQUEST_THRESHOLD_EVALUATION: {
    readonly thresholdId: string;
  };
  readonly SELECT_RECEIPT: {
    readonly receiptType: string;
  };
  readonly CLOSE_ROOM: {
    readonly reason: "completed" | "failed_closed" | "user_closed";
  };
  readonly MARK_ERROR: {
    readonly message: string;
  };
};

export type KernelEventEnvelope<K extends RuntimeEventKind = RuntimeEventKind> = {
  readonly envelopeVersion: EnvelopeVersion;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly roomId?: RoomId;
  readonly actor?: RuntimeActor;
  readonly kind: K;
  readonly payload: RuntimeEventPayloadByKind[K];
  readonly causality?: RuntimeCausality;
};
