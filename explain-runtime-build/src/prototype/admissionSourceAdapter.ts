// Companion Admission Source Adapter — Stage 1.
//
// Normalizes text arriving from any admission source into one event shape,
// classifies it deterministically as a question or statement, and feeds that
// classification into the existing Companion output path (SPEAK + STEER +
// receipt). Architecture rule: source changes evidence quality, not Companion
// behavior — source_provider only ever changes the evidence-quality note
// carried on source_receipt. event_type, confidence, and the resulting
// SPEAK/STEER output are derived from text_chunk alone, regardless of source.
//
// otter_archive is archive/import-only: it normalizes transcript text already
// obtained from Otter (or a meeting reference to it). It never opens a live
// Otter connection.
//
// Event classification itself (detectEventType) lives in @adl/companion-shared
// so Companion and ExplainIT classify recipient text identically — see that
// package for the single source of truth.
import { detectEventType } from "../../../packages/companion-shared/src/eventDetection";
export { detectEventType };

export type SourceProvider = "browser_mic" | "otter_archive" | "paste_text";

export type CompanionEventType = "question" | "statement";

export interface SourceReceipt {
  source_provider: SourceProvider;
  session_id: string;
  timestamp: string;
  evidence_quality: string;
  otter_meeting_id?: string;
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
  source_provider: SourceProvider;
  source_receipt: SourceReceipt;
  event: {
    event_type: CompanionEventType;
    confidence: number;
    text_chunk: string;
  };
  output: CompanionOutput;
  answer?: string;
  understood_intent?: string;
  provider?: string;
  model?: string;
  provider_request_id?: string | null;
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
  otter_archive: "archived third-party transcript; imported, not live-streamed",
  paste_text: "verbatim operator-entered text; highest textual fidelity"
};

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

// The existing Companion output path: SPEAK is one concise next line, STEER is
// the posture/boundary behind it. Driven only by event_type — never by
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
    source_provider: event.source_provider,
    source_receipt: event.source_receipt,
    event: {
      event_type: event.event_type,
      confidence: event.confidence,
      text_chunk: event.text_chunk
    },
    output
  };
}

// The single acceptance rail: text_chunk -> event_type/confidence -> SPEAK ->
// STEER -> receipt, in one call. Works identically regardless of source_provider.
export function runAdmissionRail(input: AdmissionInput): AdmissionReceipt {
  const event = normalizeAdmissionInput(input);
  const output = toCompanionOutput(event);
  return buildAdmissionReceipt(event, output);
}

// --- paste_text adapter -----------------------------------------------

export interface PasteTextInput {
  session_id: string;
  text_chunk: string;
  speaker_label?: string;
}

export function runPasteTextRail(input: PasteTextInput): AdmissionReceipt {
  return runAdmissionRail({ ...input, source_provider: "paste_text" });
}

// --- otter_archive adapter ----------------------------------------------
// Archive/import only. Accepts an Otter meeting ID for provenance, and/or
// transcript text already obtained from Otter (e.g. a copy-pasted export).
// Never opens a live connection to Otter.

export interface OtterArchiveImportInput {
  session_id: string;
  otter_meeting_id?: string;
  transcript_text?: string;
  speaker_label?: string;
}

function withOtterMeetingId(event: NormalizedAdmissionEvent, otter_meeting_id?: string): NormalizedAdmissionEvent {
  if (!otter_meeting_id) return event;
  return {
    ...event,
    source_receipt: { ...event.source_receipt, otter_meeting_id }
  };
}

// Splits an archived transcript into line-based chunks and normalizes each
// into the same event contract as any other source.
export function normalizeOtterArchiveTranscript(input: OtterArchiveImportInput): NormalizedAdmissionEvent[] {
  const lines = (input.transcript_text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) =>
    withOtterMeetingId(
      normalizeAdmissionInput({
        source_provider: "otter_archive",
        session_id: input.session_id,
        text_chunk: line,
        speaker_label: input.speaker_label
      }),
      input.otter_meeting_id
    )
  );
}

// Runs every chunk of an archived Otter transcript through the same
// event -> SPEAK -> STEER -> receipt rail as any other source.
export function runOtterArchiveImportRail(input: OtterArchiveImportInput): AdmissionReceipt[] {
  return normalizeOtterArchiveTranscript(input).map((event) => buildAdmissionReceipt(event, toCompanionOutput(event)));
}
