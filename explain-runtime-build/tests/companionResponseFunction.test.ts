import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import companionResponse from "../../netlify/functions/companion-response.mts";

const ORIGINAL_ENV = { ...process.env };

function request(body: Record<string, unknown>) {
  return new Request("https://example.test/.netlify/functions/companion-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: "session-1", event_id: "event-1", mode: "text", context: [], ...body }),
  });
}

async function body(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function successfulProvider(answer = "ADL is a governed operating system for turning evidence into bounded assistance.") {
  return new Response(JSON.stringify({
    id: "resp_safe_123",
    model: "gpt-test",
    output: [{ content: [{ type: "output_text", text: JSON.stringify({
      answer,
      understood_intent: "Explain ADL",
      speak: "ADL keeps evidence, judgment, and action in their proper lanes.",
      steer: "Use a concrete example and keep the human decision explicit.",
    }) }] }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("companion-response Netlify function", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, OPENAI_API_KEY: "local-test-key", COMPANION_OPENAI_MODEL: "gpt-test" };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a useful structured answer with safe receipt metadata", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => successfulProvider());
    vi.stubGlobal("fetch", fetchMock);
    const response = await companionResponse(request({ utterance: "Explain ADL." }));
    const result = await body(response);

    expect(response.status).toBe(200);
    expect(result.answer).toContain("governed operating system");
    expect(result.speak).toContain("evidence");
    expect(result.steer).toContain("human decision");
    expect(result).toMatchObject({ provider: "openai", model: "gpt-test", event_id: "event-1" });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer local-test-key" });
    const providerRequest = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(providerRequest).not.toHaveProperty("tools");
    expect(JSON.stringify(providerRequest)).toContain("Explain ADL.");
  });

  it("passes bounded active-session context for a follow-up", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => successfulProvider("Actors use ADL like a shared script; stage managers use it like a governed cue sheet."));
    vi.stubGlobal("fetch", fetchMock);
    const response = await companionResponse(request({
      utterance: "How would actors and stage managers use it?",
      context: [
        { role: "user", text: "Explain ADL to someone who understands theater." },
        { role: "assistant", text: "Think of ADL as the production system around the performance." },
      ],
    }));
    expect(response.status).toBe(200);
    const providerRequest = JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body)) as { input: unknown[] };
    expect(providerRequest.input).toHaveLength(3);
    expect(JSON.stringify(providerRequest.input)).toContain("stage managers");
  });

  it("supports a concise clarification response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => successfulProvider("Which part would you like help with: the concept, a specific workflow, or how to explain it?")));
    const response = await companionResponse(request({ utterance: "Help me with that." }));
    expect((await body(response)).answer).toContain("Which part");
  });

  it("rejects oversized or malformed governed input before calling OpenAI", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let response = await companionResponse(request({ utterance: "x".repeat(2_001) }));
    expect(response.status).toBe(400);
    expect((await body(response)).code).toBe("invalid_request");
    response = await companionResponse(request({ utterance: "hello", context: Array.from({ length: 9 }, () => ({ role: "user", text: "x" })) }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the server credential is absent", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await companionResponse(request({ utterance: "Explain ADL." }));
    expect(response.status).toBe(503);
    expect(await body(response)).toMatchObject({ code: "provider_not_configured" });
  });

  it("sanitizes provider rejection and never returns provider bodies or the key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "bad local-test-key" } }), { status: 401 })));
    const response = await companionResponse(request({ utterance: "Explain ADL." }));
    const serialized = JSON.stringify(await body(response));
    expect(response.status).toBe(502);
    expect(serialized).toContain("not authorized");
    expect(serialized).not.toContain("local-test-key");
    expect(serialized).not.toContain("bad");
  });

  it("rejects malformed provider output", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ output_text: "not json" }), { status: 200 })));
    const response = await companionResponse(request({ utterance: "Explain ADL." }));
    expect(response.status).toBe(502);
    expect((await body(response)).code).toBe("malformed_provider_response");
  });

  it("aborts provider work at the bounded timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const pending = companionResponse(request({ utterance: "Explain ADL." }));
    await vi.advanceTimersByTimeAsync(15_001);
    const response = await pending;
    expect(response.status).toBe(504);
    expect((await body(response)).code).toBe("provider_timeout");
  });
});
