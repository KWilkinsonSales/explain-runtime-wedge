import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import deepgramToken from "../../netlify/functions/deepgram-token.mts";

const ORIGINAL_ENV = { ...process.env };

async function invoke() {
  return deepgramToken(new Request("https://example.test/.netlify/functions/deepgram-token", { method: "POST" }));
}

async function responseBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function mockGrantResponse(
  status = 200,
  body: Record<string, unknown> =
    status === 200 ? { access_token: "temporary-grant", expires_in: 30 } : {},
) {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function grantRequestBody(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function logText(logMock: ReturnType<typeof vi.spyOn>) {
  return logMock.mock.calls.flat().map(String).join("\n");
}

describe("deepgram-token function credential resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.ADLDeepgram;
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.DEEPGRAM_PROJECT_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accepts ADLDeepgram as the canonical credential", async () => {
    process.env.ADLDeepgram = "adl-test-secret";
    const fetchMock = mockGrantResponse();

    const response = await invoke();
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(body.token_type).toBe("bearer");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepgram.com/v1/auth/grant",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Token adl-test-secret" }),
      }),
    );
  });

  it("sends the official ttl_seconds grant field with a valid TTL", async () => {
    process.env.ADLDeepgram = "adl-test-secret";
    const fetchMock = mockGrantResponse();

    await invoke();

    expect(grantRequestBody(fetchMock)).toEqual({ ttl_seconds: 30 });
  });

  it("prefers ADLDeepgram when both supported variables are set", async () => {
    process.env.ADLDeepgram = "canonical-secret";
    process.env.DEEPGRAM_API_KEY = "legacy-secret";
    const fetchMock = mockGrantResponse();

    await invoke();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Token canonical-secret" }),
      }),
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("legacy-secret");
  });

  it("accepts DEEPGRAM_API_KEY as a temporary fallback", async () => {
    process.env.DEEPGRAM_API_KEY = "legacy-secret";
    const fetchMock = mockGrantResponse();

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Token legacy-secret" }),
      }),
    );
  });

  it("returns the configuration error when both supported variables are missing", async () => {
    const logMock = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await invoke();
    const body = await responseBody(response);

    expect(response.status).toBe(503);
    expect(body.error).toBe("Live transcription is not configured. Set the ADLDeepgram production secret.");
    expect(logText(logMock)).toContain("missing_env");
  });

  it("does not include credentials in errors or logs", async () => {
    const secret = "credential-that-must-not-appear";
    process.env.ADLDeepgram = secret;
    const logMock = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockGrantResponse(403, {
      err_code: "BAD_REQUEST",
      err_msg: `credential ${secret} rejected`,
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGwtY29tcGFuaW9uIn0.fake-signature",
    });

    const response = await invoke();
    const body = await responseBody(response);
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(502);
    expect(serializedBody).not.toContain(secret);
    expect(logText(logMock)).not.toContain(secret);
    expect(serializedBody).not.toContain("fake-signature");
    expect(logText(logMock)).not.toContain("fake-signature");
  });

  it("maps a successful Deepgram grant response", async () => {
    process.env.ADLDeepgram = "adl-test-secret";
    mockGrantResponse(200, { access_token: "temporary-grant", expires_in: 30 });

    const response = await invoke();
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      key: "temporary-grant",
      access_token: "temporary-grant",
      token_type: "bearer",
      expires_in: 30,
    });
  });

  it("returns sanitized Deepgram 400 diagnostics", async () => {
    process.env.ADLDeepgram = "adl-test-secret";
    const logMock = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockGrantResponse(400, { err_code: "BAD_REQUEST", err_msg: "Invalid credentials." });

    const response = await invoke();
    const body = await responseBody(response);

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: "Deepgram token grant failed (400).",
      provider_code: "BAD_REQUEST",
      provider_message: "Invalid credentials.",
      endpoint: "https://api.deepgram.com/v1/auth/grant",
    });
    expect(logText(logMock)).toContain("BAD_REQUEST");
    expect(logText(logMock)).toContain("Invalid credentials.");
  });

  it("keeps 401 and 403 credential/permission mappings", async () => {
    process.env.ADLDeepgram = "adl-test-secret";
    mockGrantResponse(401, { err_code: "UNAUTHORIZED", err_msg: "Invalid API key." });

    let response = await invoke();
    let body = await responseBody(response);
    expect(response.status).toBe(502);
    expect(body.error).toBe(
      "Deepgram rejected the configured credential (401). Verify the Deepgram key is current and copied exactly.",
    );
    expect(body.provider_code).toBe("UNAUTHORIZED");

    mockGrantResponse(403, { err_code: "FORBIDDEN", err_msg: "Member or higher role required." });

    response = await invoke();
    body = await responseBody(response);
    expect(response.status).toBe(502);
    expect(body.error).toBe(
      "Deepgram rejected token grant (403). The configured credential must have Member or higher permissions.",
    );
    expect(body.provider_code).toBe("FORBIDDEN");
  });
});
