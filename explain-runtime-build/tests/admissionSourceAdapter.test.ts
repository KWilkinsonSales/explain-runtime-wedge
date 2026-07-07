import { describe, expect, it } from "vitest";
import {
  detectEventType,
  normalizeAdmissionInput,
  normalizeOtterArchiveTranscript,
  runAdmissionRail,
  runOtterArchiveImportRail,
  runPasteTextRail,
  toCompanionOutput,
  type SourceProvider
} from "../src/prototype/admissionSourceAdapter";

describe("detectEventType", () => {
  it("classifies text ending in ? as a question", () => {
    expect(detectEventType("Is this the right approach?").event_type).toBe("question");
  });

  it("classifies text starting with a question word as a question", () => {
    expect(detectEventType("How does this affect timeline").event_type).toBe("question");
    expect(detectEventType("Can we ship this Friday").event_type).toBe("question");
  });

  it("classifies everything else as a statement", () => {
    expect(detectEventType("We shipped the fix yesterday.").event_type).toBe("statement");
  });

  it("gives higher confidence to a trailing question mark than a lead word alone", () => {
    const byMark = detectEventType("What time is it?");
    const byLeadWord = detectEventType("What a nice day");
    expect(byMark.confidence).toBeGreaterThan(byLeadWord.confidence);
  });
});

describe("normalizeAdmissionInput", () => {
  const SOURCES: SourceProvider[] = ["browser_mic", "otter_archive", "paste_text"];

  it("produces the required normalized event shape", () => {
    const event = normalizeAdmissionInput({
      source_provider: "paste_text",
      session_id: "sess-1",
      text_chunk: "Why did the deploy fail?"
    });

    expect(event).toMatchObject({
      source_provider: "paste_text",
      session_id: "sess-1",
      text_chunk: "Why did the deploy fail?",
      event_type: "question"
    });
    expect(typeof event.timestamp).toBe("string");
    expect(typeof event.confidence).toBe("number");
    expect(event.source_receipt.source_provider).toBe("paste_text");
  });

  it("does not vary event_type or confidence by source_provider for identical text", () => {
    const text = "What is the current status?";
    const results = SOURCES.map((source_provider) =>
      normalizeAdmissionInput({ source_provider, session_id: "sess-2", text_chunk: text })
    );
    const [first, ...rest] = results;
    for (const result of rest) {
      expect(result.event_type).toBe(first.event_type);
      expect(result.confidence).toBe(first.confidence);
    }
  });

  it("does vary source_receipt evidence_quality by source_provider", () => {
    const text = "Status update: on track.";
    const qualities = new Set(
      SOURCES.map(
        (source_provider) =>
          normalizeAdmissionInput({ source_provider, session_id: "sess-3", text_chunk: text }).source_receipt
            .evidence_quality
      )
    );
    expect(qualities.size).toBe(SOURCES.length);
  });
});

describe("toCompanionOutput", () => {
  it("answers directly for a question event", () => {
    const event = normalizeAdmissionInput({
      source_provider: "otter_archive",
      session_id: "sess-4",
      text_chunk: "Should we escalate this?"
    });
    const output = toCompanionOutput(event);
    expect(output.speak.toLowerCase()).toContain("answer");
    expect(output.steer.toLowerCase()).toContain("answer the question");
  });

  it("holds observation posture for a statement event", () => {
    const event = normalizeAdmissionInput({
      source_provider: "browser_mic",
      session_id: "sess-5",
      text_chunk: "The build is green."
    });
    const output = toCompanionOutput(event);
    expect(output.speak.toLowerCase()).toContain("noted");
    expect(output.steer.toLowerCase()).toContain("observe");
  });
});

describe("runAdmissionRail (acceptance rail)", () => {
  it("carries a single text_chunk through event detection, SPEAK, STEER, and receipt", () => {
    const receipt = runAdmissionRail({
      source_provider: "paste_text",
      session_id: "sess-6",
      text_chunk: "What is blocking this decision?"
    });

    expect(receipt.event.event_type).toBe("question");
    expect(receipt.event.confidence).toBeGreaterThan(0);
    expect(receipt.output.speak.length).toBeGreaterThan(0);
    expect(receipt.output.steer.length).toBeGreaterThan(0);
    expect(receipt.source_provider).toBe("paste_text");
    expect(receipt.source_receipt.source_provider).toBe("paste_text");
  });

  it("produces the same SPEAK/STEER output across all three source providers for the same text", () => {
    const text = "We are blocked on legal review.";
    const outputs = (["browser_mic", "otter_archive", "paste_text"] as SourceProvider[]).map(
      (source_provider) => runAdmissionRail({ source_provider, session_id: "sess-7", text_chunk: text }).output
    );
    expect(outputs[0]).toEqual(outputs[1]);
    expect(outputs[1]).toEqual(outputs[2]);
  });
});

describe("Stage 1 acceptance fixture", () => {
  it("carries the ADL question fixture through event_type -> confidence -> SPEAK -> STEER -> receipt", () => {
    const receipt = runPasteTextRail({
      session_id: "stage1-fixture",
      text_chunk: "So I'm just trying to understand, why would I even want to go with ADL and help me understand that?"
    });

    expect(receipt.event.event_type).toBe("question");
    expect(receipt.event.confidence).toBeGreaterThan(0);
    expect(receipt.output.speak.length).toBeGreaterThan(0);
    expect(receipt.output.steer.length).toBeGreaterThan(0);
    expect(receipt).toBeTruthy();
  });
});

describe("otter_archive adapter", () => {
  it("normalizes each line of an archived transcript into its own event", () => {
    const events = normalizeOtterArchiveTranscript({
      session_id: "sess-8",
      otter_meeting_id: "meeting-123",
      transcript_text: "Why did the migration fail?\nWe rolled it back at 3pm.\n\n"
    });

    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe("question");
    expect(events[1].event_type).toBe("statement");
    expect(events[0].source_provider).toBe("otter_archive");
    expect(events[0].source_receipt.otter_meeting_id).toBe("meeting-123");
  });

  it("accepts a meeting ID with no transcript text yet without throwing", () => {
    const events = normalizeOtterArchiveTranscript({ session_id: "sess-9", otter_meeting_id: "meeting-456" });
    expect(events).toEqual([]);
  });

  it("runs the full rail per chunk via runOtterArchiveImportRail", () => {
    const receipts = runOtterArchiveImportRail({
      session_id: "sess-10",
      otter_meeting_id: "meeting-789",
      transcript_text: "How should we handle the handoff?"
    });

    expect(receipts).toHaveLength(1);
    expect(receipts[0].event.event_type).toBe("question");
    expect(receipts[0].output.speak.length).toBeGreaterThan(0);
    expect(receipts[0].output.steer.length).toBeGreaterThan(0);
    expect(receipts[0].source_receipt.otter_meeting_id).toBe("meeting-789");
  });

  it("never requires a live connection — only ever consumes already-provided transcript text", () => {
    const receipts = runOtterArchiveImportRail({ session_id: "sess-11", otter_meeting_id: "meeting-000" });
    expect(receipts).toEqual([]);
  });
});
