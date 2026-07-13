// Mints a short-lived Deepgram auth token so the browser can open a streaming
// WebSocket without ever seeing the master key. Requires ADLDeepgram in the
// Netlify environment. DEEPGRAM_API_KEY remains a temporary compatibility
// fallback. DEEPGRAM_PROJECT_ID is not required for the token grant path.

const DEEPGRAM_API = "https://api.deepgram.com/v1";
const DEEPGRAM_TOKEN_GRANT_ENDPOINT = `${DEEPGRAM_API}/auth/grant`;
const TOKEN_TTL_SECONDS = 30;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function log(event: string, details: Record<string, unknown> = {}) {
  console.log("[deepgram-token]", event, JSON.stringify(details));
}

function deepgramErrorMessage(status: number): string {
  if (status === 401) {
    return "Deepgram rejected the configured credential (401). Verify the Deepgram key is current and copied exactly.";
  }
  if (status === 403) {
    return "Deepgram rejected token grant (403). The configured credential must have Member or higher permissions.";
  }
  return `Deepgram token grant failed (${status}).`;
}

function sanitizeProviderText(value: unknown, apiKey: string): string | undefined {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return undefined;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  const looksLikeJwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text);
  const looksLikeToken = text.length > 96 && /^[A-Za-z0-9._/+=:-]+$/.test(text);
  if (text.includes(apiKey) || looksLikeJwt || looksLikeToken) return "[redacted]";
  return text.slice(0, 240);
}

async function providerDiagnostics(response: Response, apiKey: string): Promise<Record<string, string>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof body !== "object" || body === null) return {};

  const source = body as Record<string, unknown>;
  const diagnostics: Record<string, string> = {};
  const providerCode = sanitizeProviderText(source.err_code ?? source.code, apiKey);
  const providerMessage = sanitizeProviderText(source.err_msg ?? source.message ?? source.error, apiKey);
  if (providerCode) diagnostics.provider_code = providerCode;
  if (providerMessage) diagnostics.provider_message = providerMessage;
  return diagnostics;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    log("method_rejected", { method: req.method });
    return json(405, { error: "POST only." });
  }

  const apiKey = process.env.ADLDeepgram?.trim() || process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    log("missing_env", { missing: "ADLDeepgram" });
    return json(503, { error: "Live transcription is not configured. Set the ADLDeepgram production secret." });
  }

  if (!process.env.DEEPGRAM_PROJECT_ID) {
    log("project_id_not_set", {
      message: "DEEPGRAM_PROJECT_ID is optional and not used by /v1/auth/grant.",
    });
  }

  const auth = { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" };
  log("grant_request", {
    endpoint: DEEPGRAM_TOKEN_GRANT_ENDPOINT,
    ttl_seconds: TOKEN_TTL_SECONDS,
  });

  const tokenResponse = await fetch(DEEPGRAM_TOKEN_GRANT_ENDPOINT, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ ttl_seconds: TOKEN_TTL_SECONDS }),
  });

  if (!tokenResponse.ok) {
    const diagnostics = await providerDiagnostics(tokenResponse, apiKey);
    log("grant_failed", {
      endpoint: DEEPGRAM_TOKEN_GRANT_ENDPOINT,
      status: tokenResponse.status,
      ...diagnostics,
    });
    return json(502, {
      error: deepgramErrorMessage(tokenResponse.status),
      ...diagnostics,
      endpoint: DEEPGRAM_TOKEN_GRANT_ENDPOINT,
    });
  }

  const granted = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  if (!granted.access_token) {
    log("grant_malformed", { endpoint: DEEPGRAM_TOKEN_GRANT_ENDPOINT });
    return json(502, { error: "Deepgram did not return an access token." });
  }

  log("grant_succeeded", {
    endpoint: DEEPGRAM_TOKEN_GRANT_ENDPOINT,
    expires_in: granted.expires_in ?? TOKEN_TTL_SECONDS,
  });
  return json(200, {
    key: granted.access_token,
    access_token: granted.access_token,
    token_type: "bearer",
    expires_in: granted.expires_in ?? TOKEN_TTL_SECONDS,
  });
};
