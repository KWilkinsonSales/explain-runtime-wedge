import type { ProofLensManifest } from "@adl/lenses";
import type { KernelEventEnvelope, RoomContractVersion } from "@adl/runtime";

export function buildVisualRuntimeEvents(manifest: ProofLensManifest): readonly KernelEventEnvelope[] {
  const roomId = `room-${manifest.lensId}` as never;
  const contractVersion = "0.1" as RoomContractVersion;
  return [
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-1`,
      occurredAt: "2026-06-13T00:00:00.000Z",
      kind: "LOAD_CONTRACT",
      payload: {
        roomId,
        contractVersion,
        allowedEventKinds: ["LOAD_LENS_MANIFEST", "APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"],
      },
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-2`,
      occurredAt: "2026-06-13T00:00:01.000Z",
      roomId,
      actor: { actorId: "visual", actorType: "surface" },
      kind: "LOAD_LENS_MANIFEST",
      payload: {
        lensId: manifest.lensId as never,
        lensVersion: manifest.version as never,
        declaredEventKinds: ["APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"],
      },
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-3`,
      occurredAt: "2026-06-13T00:00:02.000Z",
      roomId,
      actor: { actorId: "visual", actorType: "surface" },
      kind: "APPLY_USER_EVENT",
      payload: { fieldId: "situation", value: `sample-${manifest.lensId}-situation` },
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-4`,
      occurredAt: "2026-06-13T00:00:03.000Z",
      roomId,
      actor: { actorId: "visual", actorType: "surface" },
      kind: "REQUEST_THRESHOLD_EVALUATION",
      payload: { thresholdId: manifest.threshold.id },
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-5`,
      occurredAt: "2026-06-13T00:00:04.000Z",
      roomId,
      actor: { actorId: "visual", actorType: "surface" },
      kind: "SELECT_RECEIPT",
      payload: { receiptType: manifest.receiptPolicy.receiptType },
    },
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-6`,
      occurredAt: "2026-06-13T00:00:05.000Z",
      roomId,
      actor: { actorId: "visual", actorType: "surface" },
      kind: "CLOSE_ROOM",
      payload: { reason: "completed" },
    },
  ];
}
