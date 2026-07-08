import { describe, expect, it } from "vitest";
import {
  appendSegment,
  createTranscriptBuffer,
  deepgramSocketUrl,
  deepgramSocketProtocols,
  isTranscriptReceiving,
  parseDeepgramMessage,
  pickRecorderMimeType,
  transcriptBufferText
} from "../src/prototype/liveTranscription";
import { runAdmissionRail } from "../src/prototype/admissionSourceAdapter";

describe("deepgramSocketUrl", () => {
  it("targets the Deepgram listen endpoint with interim results enabled", () => {
    const url = deepgramSocketUrl();
    expect(url.startsWith("wss://api.deepgram.com/v1/listen?")).toBe(true);
    expect(url).toContain("interim_results=true");
    expect(url).toContain("model=nova-2");
  });
});

describe("deepgramSocketProtocols", () => {
  it("uses bearer subprotocol credentials for temporary JWT grants", () => {
    expect(deepgramSocketProtocols({ tokenType: "bearer", value: "jwt-token" })).toEqual(["bearer", "jwt-token"]);
  });

  it("keeps token subprotocol credentials for temporary API keys", () => {
    expect(deepgramSocketProtocols({ tokenType: "token", value: "api-key" })).toEqual(["token", "api-key"]);
  });
});

describe("parseDeepgramMessage", () => {
  it("extracts transcript, finality, and confidence from a Results frame", () => {
    const raw = JSON.stringify({
      type: "Results",
      is_final: true,
      channel: { alternatives: [{ transcript: "sixty second live test", confidence: 0.98 }] }
    });
    expect(parseDeepgramMessage(raw)).toEqual({
      text: "sixty second live test",
      isFinal: true,
      confidence: 0.98
    });
  });

  it("treats missing is_final as an interim segment", () => {
    const raw = JSON.stringify({
      type: "Results",
      channel: { alternatives: [{ transcript: "partial" }] }
    });
    expect(parseDeepgramMessage(raw)).toEqual({ text: "partial", isFinal: false, confidence: null });
  });

  it("ignores non-Results frames, empty transcripts, and invalid JSON", () => {
    expect(parseDeepgramMessage(JSON.stringify({ type: "Metadata" }))).toBeNull();
    expect(parseDeepgramMessage(JSON.stringify({ type: "UtteranceEnd" }))).toBeNull();
    expect(
      parseDeepgramMessage(JSON.stringify({ type: "Results", channel: { alternatives: [{ transcript: "  " }] } }))
    ).toBeNull();
    expect(parseDeepgramMessage("not json")).toBeNull();
  });
});

describe("pickRecorderMimeType", () => {
  it("prefers webm/opus when supported (Chrome/Android)", () => {
    expect(pickRecorderMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("falls back to audio/mp4 when only that is supported (iOS Safari)", () => {
    expect(pickRecorderMimeType((mime) => mime === "audio/mp4")).toBe("audio/mp4");
  });

  it("returns null when nothing is supported", () => {
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });
});

describe("transcript buffer", () => {
  it("accumulates finals and replaces the trailing interim", () => {
    let buffer = createTranscriptBuffer();
    buffer = appendSegment(buffer, { text: "hello", isFinal: true });
    buffer = appendSegment(buffer, { text: "this is", isFinal: false });
    buffer = appendSegment(buffer, { text: "this is a", isFinal: false });
    expect(transcriptBufferText(buffer)).toBe("hello this is a");

    buffer = appendSegment(buffer, { text: "this is a live test", isFinal: true });
    expect(transcriptBufferText(buffer)).toBe("hello this is a live test");
    expect(buffer.interim).toBe("");
  });

  it("caps the rolling buffer so long sessions stay bounded", () => {
    let buffer = createTranscriptBuffer();
    for (let index = 0; index < 250; index += 1) {
      buffer = appendSegment(buffer, { text: `segment-${index}`, isFinal: true }, 200);
    }
    expect(buffer.finals).toHaveLength(200);
    expect(buffer.finals[0]).toBe("segment-50");
  });

  it("ignores empty segments", () => {
    const buffer = appendSegment(createTranscriptBuffer(), { text: "   ", isFinal: true });
    expect(buffer.finals).toHaveLength(0);
  });
});

describe("isTranscriptReceiving", () => {
  it("is true within the freshness window and false outside it", () => {
    const now = new Date("2026-07-08T00:00:30.000Z");
    expect(isTranscriptReceiving("2026-07-08T00:00:20.000Z", now)).toBe(true);
    expect(isTranscriptReceiving("2026-07-08T00:00:00.000Z", now)).toBe(false);
    expect(isTranscriptReceiving(null, now)).toBe(false);
    expect(isTranscriptReceiving("garbage", now)).toBe(false);
  });
});

describe("live segments drive SPEAK/STEER through the admission rail", () => {
  it("a final live segment produces a receipt with SPEAK and STEER", () => {
    const receipt = runAdmissionRail({
      source_provider: "browser_mic",
      session_id: "live-test",
      text_chunk: "why would I even want to go with ADL?"
    });
    expect(receipt.event.event_type).toBe("question");
    expect(receipt.output.speak.length).toBeGreaterThan(0);
    expect(receipt.output.steer.length).toBeGreaterThan(0);
    expect(receipt.source_provider).toBe("browser_mic");
  });
});
