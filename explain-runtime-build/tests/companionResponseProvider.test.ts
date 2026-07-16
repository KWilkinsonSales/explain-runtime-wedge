import { afterEach, describe, expect, it, vi } from "vitest";
import { companionResponseProvider } from "../src/prototype/companionResponseProvider";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser Companion response provider", () => {
  it("normalizes endpoint output into guidance plus preserved admission evidence", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      answer: "ADL turns source evidence into bounded, reviewable assistance.",
      understood_intent: "Explain ADL",
      speak: "ADL helps us work from evidence without surrendering judgment.",
      steer: "Connect the explanation to the listener's world.",
      provider: "openai",
      model: "gpt-test",
      provider_request_id: "resp_safe",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const receipt = await companionResponseProvider({
      source_provider: "paste_text",
      session_id: "session-1",
      event_id: "event-1",
      text_chunk: "Explain ADL.",
      context: [],
    });
    expect(receipt.answer).toContain("bounded");
    expect(receipt.event.text_chunk).toBe("Explain ADL.");
    expect(receipt.output.speak).toContain("evidence");
    expect(receipt.provider).toBe("openai");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("OPENAI_API_KEY");
  });

  it("rejects malformed and failed endpoint responses for the engine fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ answer: "missing cues" }), { status: 200 })));
    await expect(companionResponseProvider({
      source_provider: "paste_text", session_id: "s", event_id: "e", text_chunk: "hello", context: [],
    })).rejects.toThrow("Malformed Companion response");

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "provider_timeout" }), { status: 504 })));
    await expect(companionResponseProvider({
      source_provider: "paste_text", session_id: "s", event_id: "e2", text_chunk: "hello again", context: [],
    })).rejects.toThrow("provider_timeout");
  });
});
