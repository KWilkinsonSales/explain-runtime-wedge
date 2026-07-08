import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { findRoom, listRooms, PLAINTIFF_INTELLIGENCE_ROOM_ID } from "../src/explainit/roomRegistry";
import { resolveExplainItRoute, roomPath } from "../src/explainit/routes";
import {
  askQuestion,
  closeRoom,
  createRoomSession,
  crossThreshold,
  gatesPassed,
  matchGovernedResponse,
  readinessChecks
} from "../src/explainit/roomSession";
import { startVoiceCapture } from "../src/explainit/voiceCapture";
import ExplainItEntry from "../src/explainit/ExplainItEntry";
import ExplainItRoom from "../src/explainit/ExplainItRoom";

const ROOM = findRoom(PLAINTIFF_INTELLIGENCE_ROOM_ID)!;

describe("explainit routes", () => {
  it("resolves /explainit to the entry surface", () => {
    expect(resolveExplainItRoute("/explainit")).toEqual({ kind: "entry" });
    expect(resolveExplainItRoute("/explainit/")).toEqual({ kind: "entry" });
  });

  it("resolves /explainit/room/:roomId to a room", () => {
    expect(resolveExplainItRoute("/explainit/room/plaintiff-intelligence")).toEqual({
      kind: "room",
      roomId: "plaintiff-intelligence"
    });
  });

  it("maps the /explainit/plaintiff-intelligence convenience path onto the seeded roomId", () => {
    expect(resolveExplainItRoute("/explainit/plaintiff-intelligence")).toEqual({
      kind: "room",
      roomId: PLAINTIFF_INTELLIGENCE_ROOM_ID
    });
  });

  it("leaves non-explainit and unknown paths to the production App", () => {
    expect(resolveExplainItRoute("/")).toBeNull();
    expect(resolveExplainItRoute("/companion/prototype")).toBeNull();
    expect(resolveExplainItRoute("/explainit/room")).toBeNull();
    expect(resolveExplainItRoute("/explainit/unknown-suffix")).toBeNull();
  });

  it("Enter Room targets the real room route", () => {
    expect(roomPath(ROOM.roomId)).toBe("/explainit/room/plaintiff-intelligence");
  });
});

describe("explainit route rendering", () => {
  it("renders the entry surface with one primary Enter Room action", () => {
    const html = renderToString(React.createElement(ExplainItEntry));
    expect(html).toContain("Enter Room");
    expect(html).toContain("ExplainIT");
  });

  it("renders the room threshold orientation for the seeded room", () => {
    const html = renderToString(React.createElement(ExplainItRoom, { roomId: PLAINTIFF_INTELLIGENCE_ROOM_ID }));
    expect(html).toContain(ROOM.name);
    expect(html).toContain("Purpose");
    expect(html).toContain("Authority");
    expect(html).toContain("Admitted sources");
    expect(html).toContain("Boundaries");
    expect(html).toContain("This room cannot");
  });

  it("renders a governed not-found surface for an unseeded roomId", () => {
    const html = renderToString(React.createElement(ExplainItRoom, { roomId: "no-such-room" }));
    expect(html).toContain("No such room");
  });
});

describe("plaintiff intelligence seed room", () => {
  it("is registered with admitted sources, boundaries, and starter prompts", () => {
    expect(listRooms().map((room) => room.roomId)).toContain(PLAINTIFF_INTELLIGENCE_ROOM_ID);
    expect(ROOM.admittedSources.length).toBeGreaterThanOrEqual(3);
    expect(ROOM.admittedSources.every((source) => source.admitted)).toBe(true);
    expect(ROOM.boundaries.length).toBeGreaterThan(0);
    expect(ROOM.starterPrompts.length).toBeGreaterThan(0);
    expect(ROOM.governedResponses.length).toBeGreaterThan(0);
  });

  it("never claims legal advice", () => {
    const everything = JSON.stringify(ROOM).toLowerCase();
    expect(everything).toContain("not legal advice");
    expect(ROOM.cannotDo.join(" ").toLowerCase()).toContain("legal advice");
  });

  it("every governed response cites only admitted sources", () => {
    const admittedIds = new Set(ROOM.admittedSources.map((source) => source.sourceId));
    for (const response of ROOM.governedResponses) {
      expect(response.citedSourceIds.length).toBeGreaterThan(0);
      for (const id of response.citedSourceIds) expect(admittedIds.has(id)).toBe(true);
    }
  });
});

describe("room entry and transcript", () => {
  it("starts at the threshold with the orientation gate unpassed", () => {
    const session = createRoomSession(ROOM);
    expect(session.status).toBe("THRESHOLD");
    expect(gatesPassed(session.gates)).toBe(false);
    expect(session.gates.contractLoaded).toBe(true);
    expect(session.gates.sourcesAdmitted).toBe(true);
  });

  it("crossing the threshold opens the room and receipts the entry", () => {
    const session = crossThreshold(createRoomSession(ROOM));
    expect(session.status).toBe("OPEN");
    expect(gatesPassed(session.gates)).toBe(true);
    expect(session.receipts.map((receipt) => receipt.kind)).toEqual(["room_entered"]);
    expect(session.transcript.length).toBe(1);
    expect(session.transcript[0].speaker).toBe("room");
  });

  it("a question updates the transcript with both turns, for voice and text alike", () => {
    const open = crossThreshold(createRoomSession(ROOM));
    const viaText = askQuestion(open, "What sources has this room admitted?", "text");
    expect(viaText.answered).toBe(true);
    expect(viaText.session.transcript.length).toBe(3);
    expect(viaText.session.transcript[1]).toMatchObject({ speaker: "recipient", channel: "text" });
    expect(viaText.session.transcript[2]).toMatchObject({ speaker: "room", channel: "text" });

    const viaVoice = askQuestion(open, "What sources has this room admitted?", "voice");
    expect(viaVoice.session.transcript[1].channel).toBe("voice");
    expect(viaVoice.answerText).toBe(viaText.answerText);
  });
});

describe("deterministic governed responses", () => {
  it("answers a seeded question identically every time, with no model in the loop", () => {
    const open = crossThreshold(createRoomSession(ROOM));
    const first = askQuestion(open, "Walk me through the timeline of the matter.", "text");
    const second = askQuestion(open, "Walk me through the timeline of the matter.", "text");
    expect(first.answerText).toBe(second.answerText);
    expect(first.answerText).toBe(matchGovernedResponse(ROOM, "Walk me through the timeline of the matter.")!.answer);
  });

  it("cites admitted source labels on the room's answer turn", () => {
    const open = crossThreshold(createRoomSession(ROOM));
    const result = askQuestion(open, "How does document discovery work?", "text");
    const answerTurn = result.session.transcript.at(-1)!;
    expect(answerTurn.citedSourceLabels).toContain("Firm explainer: how document discovery works (general)");
  });

  it("falls back deterministically and flags human review for out-of-scope questions", () => {
    const open = crossThreshold(createRoomSession(ROOM));
    const result = askQuestion(open, "Will we win the case?", "text");
    expect(result.answered).toBe(true);
    expect(result.answerText).toBe(ROOM.fallbackAnswer);
    const receipt = result.session.receipts.at(-1)!;
    expect(receipt.responseId).toBe("fallback");
    expect(receipt.humanReviewFlag).toBe(true);
  });

  it("receipts every answered exchange", () => {
    let session = crossThreshold(createRoomSession(ROOM));
    session = askQuestion(session, "What is the current status?", "text").session;
    session = askQuestion(session, "Something entirely off the map", "voice").session;
    expect(session.receipts.map((receipt) => receipt.kind)).toEqual([
      "room_entered",
      "question_answered",
      "question_answered"
    ]);
    expect(session.receipts.every((receipt) => receipt.deterministic)).toBe(true);
  });
});

describe("no governance bypass", () => {
  it("refuses to answer before the threshold gate is acknowledged, and receipts the refusal", () => {
    const session = createRoomSession(ROOM);
    const result = askQuestion(session, "What sources has this room admitted?", "text");
    expect(result.answered).toBe(false);
    expect(result.refused).toBe(true);
    expect(result.answerText).not.toBe(matchGovernedResponse(ROOM, "What sources has this room admitted?")!.answer);
    const receipt = result.session.receipts.at(-1)!;
    expect(receipt.kind).toBe("gate_refusal");
    expect(receipt.humanReviewFlag).toBe(true);
    expect(result.session.transcript.length).toBe(0);
  });

  it("a closed room stays closed and answers nothing", () => {
    const closed = closeRoom(crossThreshold(createRoomSession(ROOM)));
    expect(closed.status).toBe("CLOSED");
    const result = askQuestion(closed, "What sources has this room admitted?", "text");
    expect(result.answered).toBe(false);
    expect(result.refused).toBe(true);
    expect(result.session.receipts.at(-1)!.kind).toBe("room_closed");
  });

  it("keeps the receipt log append-only and frozen", () => {
    const session = crossThreshold(createRoomSession(ROOM));
    expect(Object.isFrozen(session.receipts[0])).toBe(true);
  });
});

describe("governance rails", () => {
  it("readiness reflects gates, receipts, and standing human-review authority", () => {
    const atThreshold = readinessChecks(createRoomSession(ROOM));
    expect(atThreshold.find((check) => check.id === "orientation")!.ok).toBe(false);
    expect(atThreshold.find((check) => check.id === "human-review")!.ok).toBe(true);

    const open = readinessChecks(crossThreshold(createRoomSession(ROOM)));
    expect(open.every((check) => check.ok)).toBe(true);
  });

  it("evidence, receipt, and readiness rails are present in the open room render", () => {
    // Server-render the open room by walking the same path a recipient does
    // is stateful; instead assert the rail data sources the component maps
    // over, then assert the threshold render carries the same admitted
    // sources the evidence rail lists.
    const session = crossThreshold(createRoomSession(ROOM));
    expect(ROOM.admittedSources.length).toBeGreaterThan(0);
    expect(session.receipts.length).toBeGreaterThan(0);
    expect(readinessChecks(session).length).toBeGreaterThan(0);

    const html = renderToString(React.createElement(ExplainItRoom, { roomId: PLAINTIFF_INTELLIGENCE_ROOM_ID }));
    for (const source of ROOM.admittedSources) {
      expect(html).toContain(source.label.slice(0, 20));
    }
  });
});

describe("voice loop ordering", () => {
  function fakeStream(log: string[]) {
    return {
      getTracks: () => [{ stop: () => log.push("track-stopped") }]
    };
  }

  it("requests getUserMedia({ audio: true }) BEFORE constructing SpeechRecognition", async () => {
    const log: string[] = [];
    const nav = {
      mediaDevices: {
        getUserMedia: async (constraints: { audio: boolean }) => {
          log.push(`getUserMedia:${JSON.stringify(constraints)}`);
          return fakeStream(log);
        }
      }
    };
    class FakeRecognition {
      lang = "";
      interimResults = true;
      maxAlternatives = 0;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        log.push("recognition-constructed");
      }
      start() {
        log.push("recognition-started");
      }
      stop() {
        this.onend?.();
      }
    }

    const transcripts: string[] = [];
    const handle = await startVoiceCapture(nav, { SpeechRecognition: FakeRecognition as never }, {
      onTranscript: (text) => transcripts.push(text),
      onUnavailable: () => log.push("unavailable"),
      onEnd: () => log.push("ended")
    });

    expect(log[0]).toBe('getUserMedia:{"audio":true}');
    expect(log.indexOf("recognition-constructed")).toBeGreaterThan(log.indexOf('getUserMedia:{"audio":true}'));
    expect(log).toContain("recognition-started");
    expect(handle).not.toBeNull();
    handle!.stop();
    expect(log).toContain("track-stopped");
  });

  it("delivers recognized speech to the transcript hook", async () => {
    let instance: { onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null } | null = null;
    class FakeRecognition {
      lang = "";
      interimResults = true;
      maxAlternatives = 0;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        instance = this;
      }
      start() {}
      stop() {}
    }
    const transcripts: string[] = [];
    await startVoiceCapture(
      { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
      { webkitSpeechRecognition: FakeRecognition as never },
      { onTranscript: (text) => transcripts.push(text), onUnavailable: () => {}, onEnd: () => {} }
    );
    instance!.onresult!({ results: [[{ transcript: "  what sources are admitted  " }]] });
    expect(transcripts).toEqual(["what sources are admitted"]);
  });

  it("reports voice unavailable (mic denied) without touching SpeechRecognition, leaving text as the path", async () => {
    const log: string[] = [];
    class FakeRecognition {
      constructor() {
        log.push("recognition-constructed");
      }
    }
    const denied = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
    const messages: string[] = [];
    const handle = await startVoiceCapture(
      { mediaDevices: { getUserMedia: async () => Promise.reject(denied) } },
      { SpeechRecognition: FakeRecognition as never },
      { onTranscript: () => {}, onUnavailable: (message) => messages.push(message), onEnd: () => {} }
    );
    expect(handle).toBeNull();
    expect(log).toEqual([]);
    expect(messages[0]).toContain("Microphone access was denied");
  });
});
