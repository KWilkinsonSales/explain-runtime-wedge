import type { ProofLensManifest } from "@adl/lenses";
import type { KernelEventEnvelope, RoomContractVersion } from "@adl/runtime";
import { normalizeAceEvent } from "./aceController.js";

export function buildAceRuntimeEvents(manifest: ProofLensManifest): readonly KernelEventEnvelope[] {
  const roomId = `room-${manifest.lensId}`;
  const contractVersion = "0.1" as RoomContractVersion;
  return [
    {
      envelopeVersion: "0.1",
      eventId: `${manifest.lensId}-1`,
      occurredAt: "2026-06-13T00:00:00.000Z",
      kind: "LOAD_CONTRACT",
      payload: {
        roomId: roomId as never,
        contractVersion,
        allowedEventKinds: ["LOAD_LENS_MANIFEST", "APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"],
      },
    },
    normalizeAceEvent({ type: "ACE_ORIENTED_ROOM", roomId }, "2026-06-13T00:00:01.000Z", `${manifest.lensId}-2`, { manifest }),
    normalizeAceEvent({ type: "ACE_COLLECTED_INPUT", roomId, fieldId: "situation", value: `sample-${manifest.lensId}-situation` }, "2026-06-13T00:00:02.000Z", `${manifest.lensId}-3`, { manifest }),
    normalizeAceEvent({ type: "ACE_THRESHOLD_CHECK_REQUESTED", roomId, thresholdId: manifest.threshold.id }, "2026-06-13T00:00:03.000Z", `${manifest.lensId}-4`, { manifest }),
    normalizeAceEvent({ type: "ACE_RECEIPT_SELECTED", roomId, receiptType: manifest.receiptPolicy.receiptType }, "2026-06-13T00:00:04.000Z", `${manifest.lensId}-5`, { manifest }),
    normalizeAceEvent({ type: "ACE_ROOM_CLOSED", roomId }, "2026-06-13T00:00:05.000Z", `${manifest.lensId}-6`, { manifest }),
  ];
}
