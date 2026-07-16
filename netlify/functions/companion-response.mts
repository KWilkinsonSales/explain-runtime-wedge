const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";
const MAX_UTTERANCE_CHARS = 2_000;
const MAX_CONTEXT_TURNS = 8;
const MAX_CONTEXT_CHARS = 8_000;
const MAX_RESPONSE_CHARS = 4_000;
const TIMEOUT_MS = 15_000;

type ContextTurn = { role: "user" | "assistant"; text: string };

interface CompanionRequest {
  utterance?: unknown;
  context?: unknown;
  mode?: unknown;
  session_id?: unknown;
  event_id?: unknown;
}

interface CompanionStructuredResponse {
  answer: string;
  understood_intent: string;
  speak: string;
  steer: string;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function parseContext(value: unknown): ContextTurn[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_CONTEXT_TURNS) return null;
  let total = 0;
  const turns: ContextTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const source = item as Record<string, unknown>;
    if (source.role !== "user" && source.role !== "assistant") return null;
    const text = boundedString(source.text, MAX_UTTERANCE_CHARS);
    if (!text) return null;
    total += text.length;
    if (total > MAX_CONTEXT_CHARS) return null;
    turns.push({ role: source.role, text });
  }
  return turns;
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text;
  if (!Array.isArray(body.output)) return null;
  for (const item of body.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }
  return null;
}

function parseStructuredResponse(text: string): CompanionStructuredResponse | null {
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const answer = boundedString(value.answer, MAX_RESPONSE_CHARS);
    const understoodIntent = boundedString(value.understood_intent, 300);
    const speak = boundedString(value.speak, 600);
    const steer = boundedString(value.steer, 600);
    if (!answer || !understoodIntent || !speak || !steer) return null;
    return { answer, understood_intent: understoodIntent, speak, steer };
  } catch {
    return null;
  }
}

function providerError(status: number): string {
  if (status === 401 || status === 403) return "Companion's response provider is not authorized.";
  if (status === 429) return "Companion's response provider is temporarily busy.";
  return "Companion's response provider could not complete the request.";
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json(405, { error: "POST only.", code: "method_not_allowed" });

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_000) {
    return json(413, { error: "Request is too large.", code: "request_too_large" });
  }

  let body: CompanionRequest;
  try {
    body = (await req.json()) as CompanionRequest;
  } catch {
    return json(400, { error: "Request must be valid JSON.", code: "invalid_json" });
  }

  const utterance = boundedString(body.utterance, MAX_UTTERANCE_CHARS);
  const context = parseContext(body.context);
  const mode = boundedString(body.mode ?? "conversation", 80);
  const sessionId = boundedString(body.session_id, 160);
  const eventId = boundedString(body.event_id, 200);
  if (!utterance || context === null || !mode || !sessionId || !eventId) {
    return json(400, { error: "The governed request payload is invalid or exceeds its limits.", code: "invalid_request" });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return json(503, { error: "Companion response service is not configured.", code: "provider_not_configured" });
  }

  const model = process.env.COMPANION_OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const input = [
      ...context.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: "user", content: utterance },
    ];
    const providerResponse = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions:
          "You are Companion, a calm bounded conversational assistant. Answer the user's actual request usefully. Use active-session context for follow-ups. If the input is ambiguous, ask one concise clarification. Never claim to take actions, use tools, or make decisions. The human remains final authority. Return answer as the useful user-facing response, understood_intent as a short description, speak as one concise sentence the user can say aloud, and steer as one concise coaching cue.",
        input,
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "companion_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string", maxLength: MAX_RESPONSE_CHARS },
                understood_intent: { type: "string", maxLength: 300 },
                speak: { type: "string", maxLength: 600 },
                steer: { type: "string", maxLength: 600 },
              },
              required: ["answer", "understood_intent", "speak", "steer"],
            },
          },
        },
      }),
    });

    if (!providerResponse.ok) {
      return json(502, {
        error: providerError(providerResponse.status),
        code: "provider_rejected",
        provider_status: providerResponse.status,
      });
    }

    const providerPayload = (await providerResponse.json()) as Record<string, unknown>;
    const outputText = extractOutputText(providerPayload);
    const structured = outputText ? parseStructuredResponse(outputText) : null;
    if (!structured) {
      return json(502, { error: "Companion received an invalid provider response.", code: "malformed_provider_response" });
    }

    return json(200, {
      ...structured,
      provider: "openai",
      model: typeof providerPayload.model === "string" ? providerPayload.model : model,
      provider_request_id: typeof providerPayload.id === "string" ? providerPayload.id : null,
      session_id: sessionId,
      event_id: eventId,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return json(504, { error: "Companion's response provider timed out.", code: "provider_timeout" });
    }
    return json(502, { error: "Companion's response provider is unavailable.", code: "provider_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
};
