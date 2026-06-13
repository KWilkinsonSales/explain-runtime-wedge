export type RuntimePrimitiveId =
  | "authority-resolver"
  | "deployment-profile-resolver"
  | "relationship-context-resolver"
  | "pane-router"
  | "explain-contract-resolver"
  | "evidence-resolver"
  | "provenance-resolver"
  | "durin-crossing-engine"
  | "packet-builder"
  | "human-approval-gate"
  | "receipt-writer"
  | "presentation-resolver"
  | "companion-close-packet-adapter"
  | "external-room-boundary";

export type RuntimePrimitiveDescriptor = {
  readonly primitiveId: RuntimePrimitiveId;
  readonly admittedVersion: "0.1";
  readonly implementationStatus: "not-implemented-in-commit-2";
};

export const ADMITTED_RUNTIME_PRIMITIVES_V0_1: readonly RuntimePrimitiveDescriptor[] = [
  { primitiveId: "authority-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "deployment-profile-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "relationship-context-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "pane-router", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "explain-contract-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "evidence-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "provenance-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "durin-crossing-engine", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "packet-builder", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "human-approval-gate", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "receipt-writer", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "presentation-resolver", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "companion-close-packet-adapter", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
  { primitiveId: "external-room-boundary", admittedVersion: "0.1", implementationStatus: "not-implemented-in-commit-2" },
];
