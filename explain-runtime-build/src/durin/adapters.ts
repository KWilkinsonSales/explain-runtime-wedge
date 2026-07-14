// Durin Slice 0 — bounded manual source adapters (Command 3).
//
// Five manual adapters — audio recording, exported Note/text, PDF/scan,
// family photo, object/heirloom photo — all funnel into the SAME
// IntakeEnvelope contract and the same DurinSpine.admit path. There is no
// live connection to Apple Photos, Apple Notes, or anything else: input
// arrives only as an operator-chosen file or pasted text, and sources are
// never moved or deleted by an adapter.
//
// Ordering guarantees per the build authorization:
//   1. PRESERVE — the authoritative export (text, or the base64
//      serialization of binary bytes) is the exact string handed to
//      DurinSpine.admit, which writes it to the content store before any
//      state advances.
//   2. HASH BEFORE ADMISSION — the adapter hashes that string itself and
//      places the hash in the envelope; admit() independently recomputes
//      and refuses on mismatch.
//   3. DERIVE AFTER — deterministic metadata becomes a separate
//      DerivedRepresentation (never a mutation of the original); manual
//      transcripts/descriptions are attached as human_manual derivations.
//
// Libraries and limits (documented per Command 3):
//   - No external parsing libraries. Only TextEncoder (byte length) and
//     the repo's own pure sha256. Versions: durin adapters 0.1.0 over
//     contracts 0.1.0.
//   - Binary payloads are preserved and hashed as their base64
//     serialization, not raw bytes — deterministic, but a hash of the
//     base64 string, which is a documented Slice 0 limit.
//   - "Safe deterministic metadata" is exactly: source type, filename,
//     declared media type, encoding, byte length, and (for text) line and
//     character counts. Deliberately NOT extracted: EXIF, GPS, faces,
//     device identifiers, embedded PDF metadata, audio duration — those
//     require parsers and/or leak more than Slice 0 authorizes.

import {
  DURIN_CONTRACT_VERSION,
  type Actor,
  type DerivedRepresentation,
  type IntakeEnvelope,
  type PrivacyLane,
  type SourceType,
  type ThemeAssertion
} from "./contracts";
import { contentHashOf, canonicalStringify } from "./sha256";
import type { AdmissionResult, DurinSpine } from "./spine";

export const ADAPTER_VERSION = "0.1.0";

export const ADAPTER_GENERATOR = {
  name: "durin-manual-adapter",
  version: ADAPTER_VERSION,
  method: "deterministic_rule"
} as const;

export const MANUAL_GENERATOR = {
  name: "durin-manual-entry",
  version: ADAPTER_VERSION,
  method: "human_manual"
} as const;

export type ManualImportInput = {
  readonly sourceType: SourceType;
  readonly filename: string;
  // utf8_text: the exported note/text itself. base64: binary file bytes as
  // base64 (the authoritative export representation for Slice 0).
  readonly encoding: "utf8_text" | "base64";
  readonly content: string;
  readonly mediaType: string;
  readonly capturedAt: string | null;
  readonly owner: Actor;
  // null = the operator did not confirm a lane; the spine fails closed to
  // held + unsorted_holding. Choosing a lane here is a hint, not a route —
  // routing itself stays a separate human review step.
  readonly privacyLaneChoice: PrivacyLane | null;
  readonly requestedAction: "admit" | "hold";
};

export type SafeMetadata = {
  readonly adapterVersion: string;
  readonly sourceType: SourceType;
  readonly filename: string;
  readonly mediaType: string;
  readonly encoding: "utf8_text" | "base64";
  readonly byteLength: number;
  readonly characterCount: number | null;
  readonly lineCount: number | null;
};

export type ManualImportResult = {
  readonly envelope: IntakeEnvelope;
  readonly admission: AdmissionResult;
  readonly metadata: SafeMetadata;
  // Present only on a fresh (non-duplicate) admission.
  readonly metadataDerivation: DerivedRepresentation | null;
};

// Deterministic, parser-free metadata. Same input, same output, always.
export function extractSafeMetadata(input: ManualImportInput): SafeMetadata {
  const isText = input.encoding === "utf8_text";
  return {
    adapterVersion: ADAPTER_VERSION,
    sourceType: input.sourceType,
    filename: input.filename,
    mediaType: input.mediaType,
    encoding: input.encoding,
    byteLength: new TextEncoder().encode(input.content).length,
    characterCount: isText ? input.content.length : null,
    lineCount: isText ? input.content.split(/\r?\n/).length : null
  };
}

export function buildEnvelope(input: ManualImportInput, receivedAt: string, intakeId: string): IntakeEnvelope {
  return {
    contractVersion: DURIN_CONTRACT_VERSION,
    intakeId,
    sourceType: input.sourceType,
    sourceUri: `manual://${input.sourceType}/${input.filename}`,
    capturedAt: input.capturedAt,
    receivedAt,
    contentHash: contentHashOf(input.content), // hashed before admission
    owner: input.owner,
    privacyHint: input.privacyLaneChoice,
    requestedAction: input.requestedAction,
    rawPreserved: true
  };
}

// The one shared import rail. Every adapter difference is data (sourceType,
// mediaType, encoding) — never a different admission path.
export function importSource(
  spine: DurinSpine,
  input: ManualImportInput,
  options?: { intakeId?: string; receivedAt?: string }
): ManualImportResult {
  const receivedAt = options?.receivedAt ?? new Date().toISOString();
  const intakeId = options?.intakeId ?? `intake-${contentHashOf(input.content).slice(7, 19)}`;
  const envelope = buildEnvelope(input, receivedAt, intakeId);
  const metadata = extractSafeMetadata(input);
  const admission = spine.admit(envelope, input.content);
  if (admission.status !== "admitted") {
    return { envelope, admission, metadata, metadataDerivation: null };
  }
  const metadataDerivation = spine.derive(
    admission.artifact.artifactId,
    "normalized_metadata",
    canonicalStringify(metadata),
    ADAPTER_GENERATOR,
    input.owner
  );
  return { envelope, admission, metadata, metadataDerivation };
}

// Manual transcript (audio), extracted text (PDF/scan), or description
// (photos), entered by a human. Always a DerivedRepresentation — the
// original is never touched.
export function attachManualDerivation(
  spine: DurinSpine,
  artifactId: string,
  kind: "transcript" | "extracted_text" | "description",
  text: string,
  actor: Actor
): DerivedRepresentation {
  return spine.derive(artifactId, kind, text, MANUAL_GENERATOR, actor);
}

// ---------------------------------------------------------------------------
// Object / heirloom detail tagging (first-class manual tagging, no pricing)
// ---------------------------------------------------------------------------

export type ObjectDetails = {
  readonly objectLabel: string;
  readonly familyProvenance?: string;
  readonly conditionNote?: string;
  readonly intent: "keep" | "sell" | "unknown";
  readonly relatedPersonOrEvent?: string;
};

// Maps the authorized object-fixture fields onto theme assertions. Unknown
// intent is asserted at low confidence so the reviewer naturally marks it
// `uncertain`. There is deliberately no listing, pricing, or valuation
// field anywhere in this type or mapping.
export function proposeObjectDetails(
  spine: DurinSpine,
  artifactId: string,
  derivedRepresentationId: string | null,
  details: ObjectDetails,
  privacyScope: PrivacyLane
): readonly ThemeAssertion[] {
  const evidence = "manual:object-detail-form";
  const proposals: ThemeAssertion[] = [];
  const propose = (themeType: ThemeAssertion["themeType"], value: string, confidence: number) => {
    proposals.push(
      spine.proposeAssertion({
        sourceArtifactId: artifactId,
        derivedRepresentationId,
        themeType,
        value,
        confidence,
        evidencePointer: evidence,
        generator: MANUAL_GENERATOR,
        privacyScope
      })
    );
  };
  propose("object", details.objectLabel, 0.95);
  if (details.familyProvenance) propose("provenance", details.familyProvenance, 0.9);
  if (details.conditionNote) propose("object", `condition: ${details.conditionNote}`, 0.9);
  propose(
    "purpose_intended_use",
    `intent: ${details.intent}`,
    details.intent === "unknown" ? 0.3 : 0.85
  );
  if (details.relatedPersonOrEvent) propose("relationship", details.relatedPersonOrEvent, 0.7);
  return proposals;
}
