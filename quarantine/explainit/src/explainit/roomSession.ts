// ExplainIT governed room session — pure and DOM-free so it can be unit
// tested without a browser, in the same spirit as companionRuntime.ts.
//
// The session mirrors the kernel lifecycle in packages/runtime: a room loads
// its contract, admits sources, orients the recipient (the threshold gate),
// and only then accepts governed user events. Every exchange appends an
// immutable receipt. Closed is terminal. There is no path to an answer that
// skips the gates — askQuestion itself enforces them.

import { detectEventType } from "../prototype/admissionSourceAdapter";
import type { GovernedResponse, RoomDefinition } from "./roomRegistry";

export type RoomSessionStatus = "THRESHOLD" | "OPEN" | "CLOSED";

export type TranscriptSpeaker = "room" | "recipient";
export type AskChannel = "voice" | "text";

export interface TranscriptEntry {
  readonly entryId: string;
  readonly speaker: TranscriptSpeaker;
  readonly channel: AskChannel | "system";
  readonly text: string;
  readonly citedSourceLabels: readonly string[];
}

// Modeled on UnderstandingReceipt in packages/runtime/src/receipts: every
// governed exchange leaves a minimal, append-only record a human can review.
export interface RoomReceipt {
  readonly receiptId: string;
  readonly roomId: string;
  readonly contractVersion: string;
  readonly kind: "room_entered" | "question_answered" | "gate_refusal" | "room_closed";
  readonly question?: string;
  readonly responseId?: string;
  readonly channel?: AskChannel;
  readonly deterministic: true;
  readonly humanReviewFlag: boolean;
  readonly note: string;
}

export interface RoomGates {
  readonly contractLoaded: boolean;
  readonly sourcesAdmitted: boolean;
  readonly orientationAcknowledged: boolean;
}

export interface RoomSession {
  readonly room: RoomDefinition;
  readonly status: RoomSessionStatus;
  readonly gates: RoomGates;
  readonly transcript: readonly TranscriptEntry[];
  readonly receipts: readonly RoomReceipt[];
  readonly sequence: number;
}

export interface ReadinessCheck {
  readonly id: string;
  readonly label: string;
  readonly ok: boolean;
}

export function gatesPassed(gates: RoomGates): boolean {
  return gates.contractLoaded && gates.sourcesAdmitted && gates.orientationAcknowledged;
}

export function createRoomSession(room: RoomDefinition): RoomSession {
  return {
    room,
    status: "THRESHOLD",
    gates: {
      contractLoaded: true,
      sourcesAdmitted: room.admittedSources.every((source) => source.admitted),
      orientationAcknowledged: false
    },
    transcript: [],
    receipts: [],
    sequence: 0
  };
}

function nextId(session: RoomSession, prefix: string): string {
  return `${prefix}-${session.room.roomId}-${session.sequence + 1}`;
}

function appendReceipt(session: RoomSession, receipt: Omit<RoomReceipt, "receiptId" | "roomId" | "contractVersion" | "deterministic">): RoomSession {
  const full: RoomReceipt = Object.freeze({
    receiptId: nextId(session, "receipt"),
    roomId: session.room.roomId,
    contractVersion: session.room.contractVersion,
    deterministic: true,
    ...receipt
  });
  return { ...session, receipts: [...session.receipts, full], sequence: session.sequence + 1 };
}

// The threshold gate: the recipient has been shown purpose, authority,
// admitted sources, and boundaries, and acknowledged them. Only this opens
// the room.
export function crossThreshold(session: RoomSession): RoomSession {
  if (session.status !== "THRESHOLD") return session;
  const oriented: RoomSession = {
    ...session,
    status: "OPEN",
    gates: { ...session.gates, orientationAcknowledged: true },
    transcript: [
      ...session.transcript,
      {
        entryId: nextId(session, "entry"),
        speaker: "room",
        channel: "system",
        text: `You are inside ${session.room.name}. ${session.room.authority} Ask by voice or text — every exchange is receipted.`,
        citedSourceLabels: []
      }
    ]
  };
  return appendReceipt(oriented, {
    kind: "room_entered",
    humanReviewFlag: false,
    note: "Recipient acknowledged purpose, authority, admitted sources, and boundaries."
  });
}

// Deterministic matcher: normalized containment of the response's match
// terms, first (highest-scoring, then registry order) wins. Same question in,
// same answer out — no model in the loop.
export function matchGovernedResponse(room: RoomDefinition, question: string): GovernedResponse | null {
  const normalized = question.toLowerCase();
  let best: { response: GovernedResponse; score: number } | null = null;
  for (const response of room.governedResponses) {
    const score = response.matchTerms.filter((term) => normalized.includes(term)).length;
    if (score > 0 && (best === null || score > best.score)) {
      best = { response, score };
    }
  }
  return best?.response ?? null;
}

function sourceLabels(room: RoomDefinition, sourceIds: readonly string[]): readonly string[] {
  return room.admittedSources
    .filter((source) => sourceIds.includes(source.sourceId))
    .map((source) => source.label);
}

export interface AskResult {
  readonly session: RoomSession;
  readonly answered: boolean;
  readonly refused: boolean;
  readonly answerText: string;
}

// The single governed answer path for BOTH voice and text. Gate checks live
// here, not in the UI, so no surface can bypass them.
export function askQuestion(session: RoomSession, questionText: string, channel: AskChannel): AskResult {
  const question = questionText.trim();
  if (question.length === 0) {
    return { session, answered: false, refused: false, answerText: "" };
  }

  if (session.status === "CLOSED") {
    return { session, answered: false, refused: true, answerText: "This room is closed. A closed room may not reopen." };
  }

  if (session.status !== "OPEN" || !gatesPassed(session.gates)) {
    const refusalText =
      "The room's gates have not been passed yet. Cross the threshold — purpose, authority, admitted sources, and boundaries — before asking.";
    const refused = appendReceipt(session, {
      kind: "gate_refusal",
      question,
      channel,
      humanReviewFlag: true,
      note: "Question arrived before the orientation gate was acknowledged. No answer was produced."
    });
    return { session: refused, answered: false, refused: true, answerText: refusalText };
  }

  // Classification reuses the admission adapter's deterministic detector;
  // it annotates the receipt, it does not change the answer path.
  const detection = detectEventType(question);
  const matched = matchGovernedResponse(session.room, question);
  const answerText = matched ? matched.answer : session.room.fallbackAnswer;
  const citedLabels = matched ? sourceLabels(session.room, matched.citedSourceIds) : [];

  const withTranscript: RoomSession = {
    ...session,
    transcript: [
      ...session.transcript,
      {
        entryId: `${nextId(session, "entry")}-q`,
        speaker: "recipient",
        channel,
        text: question,
        citedSourceLabels: []
      },
      {
        entryId: `${nextId(session, "entry")}-a`,
        speaker: "room",
        channel,
        text: answerText,
        citedSourceLabels: citedLabels
      }
    ]
  };

  const receipted = appendReceipt(withTranscript, {
    kind: "question_answered",
    question,
    responseId: matched ? matched.responseId : "fallback",
    channel,
    humanReviewFlag: !matched,
    note: matched
      ? `Governed response ${matched.responseId} (${detection.event_type}, ${detection.reason}). Sources: ${citedLabels.join("; ")}.`
      : `${session.room.humanReviewNote} (${detection.event_type}, ${detection.reason}).`
  });

  return { session: receipted, answered: true, refused: false, answerText };
}

export function closeRoom(session: RoomSession): RoomSession {
  if (session.status === "CLOSED") return session;
  const closed: RoomSession = { ...session, status: "CLOSED" };
  return appendReceipt(closed, {
    kind: "room_closed",
    humanReviewFlag: false,
    note: "Room closed. Only its receipts remain."
  });
}

export function readinessChecks(session: RoomSession): readonly ReadinessCheck[] {
  return [
    { id: "contract", label: "Room contract loaded", ok: session.gates.contractLoaded },
    { id: "sources", label: "Sources admitted", ok: session.gates.sourcesAdmitted },
    { id: "orientation", label: "Orientation acknowledged", ok: session.gates.orientationAcknowledged },
    { id: "receipts", label: "Receipt trail active", ok: session.receipts.length > 0 },
    { id: "human-review", label: "Human review holds final authority", ok: true }
  ];
}
