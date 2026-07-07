// Companion Admission Source Adapter.
//
// Normalizes text arriving from any admission source into one event shape,
// classifies it deterministically as a question or statement, and feeds that
// classification into the existing Companion output path (SPEAK + STEER +
// receipt). The source_provider only ever changes the evidence-quality note
// carried on source_receipt — it never changes event_type, confidence, or the
// resulting SPEAK/STEER output. Those are derived from text_chunk alone.

export type SourceProvider = "browser_mic" | "otter" | "paste_text";

export type CompanionEventType = "question" | "statement";

export interface SourceReceipt {
  source_provider: SourceProvider;
  session_id: string;
  timestamp: string;
  evidence_quality: string;
}

export interface NormalizedAdmissionEvent {
  source_provider: SourceProvider;
  session_id: string;
  timestamp: string;
  speaker_label?: string;
  text_chunk: string;
  event_type: CompanionEventType;
  confidence: number;
  source_receipt: SourceReceipt;
}

export interface CompanionOutput {
  speak: string;
  steer: string;
}

export interface AdmissionReceipt {
  source: SourceReceipt;
  event: {
    event_type: CompanionEventType;
    confidence: number;
    text_chunk: string;
  };
  output: CompanionOutput;
}

export interface AdmissionInput {
  source_provider: SourceProvider;
  session_id: string;
  text_chunk: string;
  speaker_label?: string;
  timestamp?: string;
}

// Each source's evidence-quality note is fixed and descriptive only — it never
// feeds into event detection or Companion output.
const SOURCE_EVIDENCE_QUALITY: Record<SourceProvider, string> = {
  browser_mic: "live audio capture; transcript fidelity unverified",
  otter: "third-party transcript; provider-attributed speaker labels",
  paste_text: "verbatim operator-entered text; highest textual fidelity"
};

const QUESTION_LEAD_WORDS = new Set([
  "who", "what", "when", "where", "why", "how",
  "can", "could", "would", "should",
  "is", "are", "do", "does", "did"
]);

interface EventDetection {
  event_type: CompanionEventType;
  confidence: number;
  reason: string;
}

// Deterministic, text-only classification. No source_provider input on purpose.
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

export function normalizeAdmissionInput(input: AdmissionInput): NormalizedAdmissionEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const { event_type, confidence } = detectEventType(input.text_chunk);

  return {
    source_provider: input.source_provider,
    session_id: input.session_id,
    timestamp,
    speaker_label: input.speaker_label,
    text_chunk: input.text_chunk,
    event_type,
    confidence,
    source_receipt: {
      source_provider: input.source_provider,
      session_id: input.session_id,
      timestamp,
      evidence_quality: SOURCE_EVIDENCE_QUALITY[input.source_provider]
    }
  };
}

// The existing Companion output path: SPEAK is one next line, STEER is the
// posture/boundary behind it. Driven only by event_type — never by
// source_provider — per the evidence-quality-not-behavior rule.
export function toCompanionOutput(event: NormalizedAdmissionEvent): CompanionOutput {
  const text = event.text_chunk.trim();

  if (event.event_type === "question") {
    return {
      speak: `Direct answer: addressing "${text}" now, without deflecting to a new topic.`,
      steer: "Answer the question that was asked. Do not redirect or postpone it."
    };
  }

  return {
    speak: `Noted: "${text}". Holding that as observed, not yet acted on.`,
    steer: "Observe and hold. A statement alone does not authorize a decision."
  };
}

export function buildAdmissionReceipt(event: NormalizedAdmissionEvent, output: CompanionOutput): AdmissionReceipt {
  return {
    source: event.source_receipt,
    event: {
      event_type: event.event_type,
      confidence: event.confidence,
      text_chunk: event.text_chunk
    },
    output
  };
}

// The single acceptance rail: text_chunk -> event_type/confidence -> SPEAK ->
// STEER -> receipt, in one call.
export function runAdmissionRail(input: AdmissionInput): AdmissionReceipt {
  const event = normalizeAdmissionInput(input);
  const output = toCompanionOutput(event);
  return buildAdmissionReceipt(event, output);
}
