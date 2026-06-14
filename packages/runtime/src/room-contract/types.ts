import type { RuntimeEventKind } from "../kernel/envelope.js";

export type RoomId = string & { readonly __brand: "RoomId" };
export type RoomContractVersion = string & { readonly __brand: "RoomContractVersion" };

export type RoomContract = {
  readonly version: RoomContractVersion;
  readonly roomId: RoomId;
  readonly purpose: string;
  readonly audience: string;
  readonly allowedEventKinds: readonly RuntimeEventKind[];
  readonly invariantPolicyRefs: readonly string[];
  readonly terminationPolicyRef: string;
};

export type RoomContractDescriptor = {
  readonly roomId: RoomId;
  readonly version: RoomContractVersion;
  readonly allowedEventKinds: readonly RuntimeEventKind[];
};
