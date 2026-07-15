// Deterministic, text-only question/statement classification. Shared by
// Companion (admissionSourceAdapter) and ExplainIT (roomSession) so both
// products classify recipient text identically — one detector, not two.
// No source_provider or channel input on purpose: source changes evidence
// provenance, never classification behavior.

export type EventType = "question" | "statement";

export interface EventDetection {
  event_type: EventType;
  confidence: number;
  reason: string;
}

const QUESTION_LEAD_WORDS = new Set([
  "who", "what", "when", "where", "why", "how",
  "can", "could", "would", "should",
  "is", "are", "do", "does", "did"
]);

export function detectEventType(text: string): EventDetection {
  const trimmed = text.trim();

  if (trimmed.endsWith("?")) {
    return { event_type: "question", confidence: 0.95, reason: "ends-with-question-mark" };
  }

  const firstWord = trimmed.toLowerCase().split(/\s+/)[0] ?? "";
  if (QUESTION_LEAD_WORDS.has(firstWord)) {
    return { event_type: "question", confidence: 0.7, reason: `leads-with-question-word:${firstWord}` };
  }

  return { event_type: "statement", confidence: 0.6, reason: "no-question-signal" };
}
