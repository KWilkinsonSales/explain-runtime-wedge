import { buildAdmissionReceipt, normalizeAdmissionInput, type AdmissionReceipt } from "./admissionSourceAdapter";
import type { ResponseProvider } from "./responseEngine";

export const COMPANION_RESPONSE_ENDPOINT = "/.netlify/functions/companion-response";

interface EndpointResponse {
  answer?: unknown;
  understood_intent?: unknown;
  speak?: unknown;
  steer?: unknown;
  provider?: unknown;
  model?: unknown;
  provider_request_id?: unknown;
  error?: unknown;
  code?: unknown;
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Malformed Companion response.");
  return value.trim();
}

export const companionResponseProvider: ResponseProvider = async (input) => {
  const response = await fetch(COMPANION_RESPONSE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      utterance: input.text_chunk,
      context: input.context,
      mode: input.source_provider === "browser_mic" ? "voice" : "text",
      session_id: input.session_id,
      event_id: input.event_id,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as EndpointResponse;
  if (!response.ok) throw new Error(typeof body.code === "string" ? body.code : "provider_failed");

  const output = { speak: requiredText(body.speak), steer: requiredText(body.steer) };
  const event = normalizeAdmissionInput(input);
  const receipt: AdmissionReceipt = {
    ...buildAdmissionReceipt(event, output),
    answer: requiredText(body.answer),
    understood_intent: requiredText(body.understood_intent),
    provider: typeof body.provider === "string" ? body.provider : "openai",
    model: typeof body.model === "string" ? body.model : "unknown",
    provider_request_id: typeof body.provider_request_id === "string" ? body.provider_request_id : null,
  };
  return receipt;
};
