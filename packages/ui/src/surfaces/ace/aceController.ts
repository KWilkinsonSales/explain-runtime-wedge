import type { ProofLensManifest } from "@adl/lenses";
import type { KernelEventEnvelope } from "@adl/runtime";
import type { AceEvent } from "./aceEvents.js";
import { planRoomUtterances, type SpokenScene } from "./utterancePlanner.js";

export type AceSession = {
  readonly roomId: string;
  readonly manifest: ProofLensManifest;
  readonly scenes: readonly SpokenScene[];
  readonly emittedEvents: readonly KernelEventEnvelope[];
};

export function createAceSession(manifest: ProofLensManifest): AceSession {
  return {
    roomId: `room-${manifest.lensId}`,
    manifest,
    scenes: planRoomUtterances(manifest),
    emittedEvents: [],
  };
}

export function normalizeAceEvent(event: AceEvent, occurredAt: string, eventId: string): KernelEventEnvelope {
  switch (event.type) {
    case "ACE_ORIENTED_ROOM":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "LOAD_LENS_MANIFEST",
        payload: { lensId: "canonical" as never, lensVersion: "0.1" as never, declaredEventKinds: ["APPLY_USER_EVENT", "REQUEST_THRESHOLD_EVALUATION", "SELECT_RECEIPT", "CLOSE_ROOM"] }
      };
    case "ACE_PRESENTED_CARD":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "APPLY_USER_EVENT",
        payload: { fieldId: `presented:${event.cardId}`, value: true }
      };
    case "ACE_COLLECTED_INPUT":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "APPLY_USER_EVENT",
        payload: { fieldId: event.fieldId, value: event.value }
      };
    case "ACE_CONFIRMED_EVIDENCE":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "APPLY_USER_EVENT",
        payload: { fieldId: "confirmedEvidence", value: event.evidenceId }
      };
    case "ACE_FLAGGED_UNKNOWN":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "APPLY_USER_EVENT",
        payload: { fieldId: "flaggedUnknown", value: event.unknownId }
      };
    case "ACE_THRESHOLD_CHECK_REQUESTED":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "REQUEST_THRESHOLD_EVALUATION",
        payload: { thresholdId: event.thresholdId }
      };
    case "ACE_RECEIPT_SELECTED":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "SELECT_RECEIPT",
        payload: { receiptType: event.receiptType }
      };
    case "ACE_ROOM_CLOSED":
      return {
        envelopeVersion: "0.1",
        eventId,
        occurredAt,
        roomId: event.roomId as never,
        actor: { actorId: "voice-sim", actorType: "surface" },
        kind: "CLOSE_ROOM",
        payload: { reason: "completed" }
      };
  }
}
