// Durin Slice 0 — Command 3 adapter tests.
// Required by the build authorization: one IntakeEnvelope across all
// adapters, original/derived distinction, fail-closed lane defaults,
// append-only review history, rejected assertions staying unapproved,
// no-delete language on the surface, safe deterministic metadata only.

import { describe, expect, it } from "vitest";

import {
  ADAPTER_GENERATOR,
  ADAPTER_VERSION,
  attachManualDerivation,
  buildEnvelope,
  extractSafeMetadata,
  importSource,
  proposeObjectDetails,
  type ManualImportInput
} from "../src/durin/adapters";
import { type Actor, type SourceType } from "../src/durin/contracts";
import { validateIntakeEnvelope } from "../src/durin/guards";
import { createMemoryBackend } from "../src/durin/ledger";
import { contentHashOf } from "../src/durin/sha256";
import { DurinSpine } from "../src/durin/spine";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const OPERATOR: Actor = { actorId: "operator", actorType: "human" };

function makeClock(): () => string {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 6, 14, 13, 0, 0, tick++)).toISOString();
}

function inputFor(sourceType: SourceType, content: string, overrides?: Partial<ManualImportInput>): ManualImportInput {
  const binary = sourceType !== "text_note_export";
  return {
    sourceType,
    filename: `synthetic-${sourceType}.${binary ? "bin" : "txt"}`,
    encoding: binary ? "base64" : "utf8_text",
    content: binary ? `data:application/octet-stream;base64,${Buffer.from(content).toString("base64")}` : content,
    mediaType: binary ? "application/octet-stream" : "text/plain",
    capturedAt: null,
    owner: OPERATOR,
    privacyLaneChoice: "private_journal",
    requestedAction: "admit",
    ...overrides
  };
}

const ALL_SOURCE_TYPES: SourceType[] = [
  "audio_recording",
  "text_note_export",
  "pdf_scan",
  "family_photo",
  "object_photo"
];

describe("one IntakeEnvelope contract across all five adapters", () => {
  it("imports every source type through the same rail with a valid envelope and linked records", () => {
    const spine = new DurinSpine(createMemoryBackend(), { clock: makeClock() });
    for (const sourceType of ALL_SOURCE_TYPES) {
      const result = importSource(spine, inputFor(sourceType, `synthetic ${sourceType} payload`), {
        receivedAt: "2026-07-14T13:00:00Z"
      });
      expect(validateIntakeEnvelope(result.envelope)).toEqual({ valid: true, errors: [] });
      expect(result.envelope.sourceType).toBe(sourceType);
      expect(result.envelope.rawPreserved).toBe(true);
      expect(result.admission.status).toBe("admitted");
      if (result.admission.status === "admitted") {
        expect(result.admission.artifact.intakeId).toBe(result.envelope.intakeId);
        // The adapter hashed before admission; the spine verified it.
        expect(result.admission.artifact.contentHash).toBe(result.envelope.contentHash);
      }
    }
    expect(spine.listArtifacts()).toHaveLength(5);
  });

  it("hashes before admission: envelope hash is computed by the adapter, not trusted from the caller", () => {
    const input = inputFor("text_note_export", "hash me");
    const envelope = buildEnvelope(input, "2026-07-14T13:00:00Z", "intake-x");
    expect(envelope.contentHash).toBe(contentHashOf(input.content));
  });
});

describe("preservation and original/derived distinction", () => {
  it("preserves the exact export before derivation and keeps derivations separate", () => {
    const backend = createMemoryBackend();
    const spine = new DurinSpine(backend, { clock: makeClock() });
    const input = inputFor("pdf_scan", "synthetic scanned memo bytes");
    const result = importSource(spine, input);
    if (result.admission.status !== "admitted") throw new Error("expected admission");
    const artifact = result.admission.artifact;

    // Original preserved byte-for-byte at its storage ref.
    expect(backend.getItem(artifact.storageRef)).toBe(input.content);
    expect(artifact.isOriginal).toBe(true);

    // Deterministic metadata landed as a SEPARATE derived record.
    expect(result.metadataDerivation).not.toBeNull();
    expect(result.metadataDerivation!.isOriginal).toBe(false);
    expect(result.metadataDerivation!.kind).toBe("normalized_metadata");
    expect(result.metadataDerivation!.generator).toEqual(ADAPTER_GENERATOR);

    // Manual extracted text is another derived record; the original is untouched.
    const manual = attachManualDerivation(spine, artifact.artifactId, "extracted_text", "typed transcript of the memo", OPERATOR);
    expect(manual.isOriginal).toBe(false);
    expect(manual.generator.method).toBe("human_manual");
    expect(backend.getItem(artifact.storageRef)).toBe(input.content);
    expect(contentHashOf(backend.getItem(artifact.storageRef)!)).toBe(artifact.contentHash);
  });

  it("extracts only safe deterministic metadata — no parser-derived or device fields", () => {
    const metadata = extractSafeMetadata(inputFor("text_note_export", "line one\nline two"));
    expect(Object.keys(metadata).sort()).toEqual([
      "adapterVersion",
      "byteLength",
      "characterCount",
      "encoding",
      "filename",
      "lineCount",
      "mediaType",
      "sourceType"
    ]);
    expect(metadata.adapterVersion).toBe(ADAPTER_VERSION);
    expect(metadata.lineCount).toBe(2);
    // Binary payloads get no text stats and nothing parsed out of the bytes.
    const binary = extractSafeMetadata(inputFor("family_photo", "img"));
    expect(binary.characterCount).toBeNull();
    expect(binary.lineCount).toBeNull();
  });

  it("re-importing the same export through an adapter is idempotent", () => {
    const spine = new DurinSpine(createMemoryBackend(), { clock: makeClock() });
    const input = inputFor("family_photo", "same bytes");
    const first = importSource(spine, input);
    const second = importSource(spine, input);
    expect(first.admission.status).toBe("admitted");
    expect(second.admission.status).toBe("duplicate");
    expect(second.metadataDerivation).toBeNull();
    expect(spine.listArtifacts()).toHaveLength(1);
  });
});

describe("fail-closed lane defaults", () => {
  it("admits with no lane choice into held + unsorted_holding", () => {
    const spine = new DurinSpine(createMemoryBackend(), { clock: makeClock() });
    const result = importSource(
      spine,
      inputFor("text_note_export", "mixed unknown material", { privacyLaneChoice: null, requestedAction: "hold" })
    );
    if (result.admission.status !== "admitted") throw new Error("expected admission");
    expect(result.admission.artifact.state).toBe("held");
    expect(spine.dispositionFor(result.admission.artifact.artifactId)?.lane).toBe("unsorted_holding");
  });
});

describe("review history through the adapter flow", () => {
  it("keeps history append-only and rejected assertions unapproved", () => {
    const spine = new DurinSpine(createMemoryBackend(), { clock: makeClock() });
    const result = importSource(spine, inputFor("audio_recording", "synthetic voice memo"));
    if (result.admission.status !== "admitted") throw new Error("expected admission");
    const artifactId = result.admission.artifact.artifactId;

    const keep = spine.proposeAssertion({
      sourceArtifactId: artifactId,
      derivedRepresentationId: result.metadataDerivation!.derivedId,
      themeType: "project",
      value: "Durin intake-router",
      confidence: 0.9,
      evidencePointer: "manual:memo",
      generator: { name: "durin-manual-entry", version: ADAPTER_VERSION, method: "human_manual" },
      privacyScope: "private_journal"
    });
    const drop = spine.proposeAssertion({
      sourceArtifactId: artifactId,
      derivedRepresentationId: null,
      themeType: "activity",
      value: "wrong theme",
      confidence: 0.4,
      evidencePointer: "manual:memo",
      generator: { name: "durin-manual-entry", version: ADAPTER_VERSION, method: "human_manual" },
      privacyScope: "private_journal"
    });

    spine.reviewAssertion(keep.assertionId, "approved", OPERATOR);
    spine.reviewAssertion(drop.assertionId, "rejected", OPERATOR);
    const corrected = spine.correctAssertion(
      keep.assertionId,
      { value: "Durin intake-router (Slice 0)", confidence: 0.95, evidencePointer: "manual:relisten" },
      "sharper wording",
      "wrong_theme_value",
      OPERATOR
    );

    // Append-only: all three assertions remain on the record.
    const history = spine.assertionsFor(artifactId);
    expect(history).toHaveLength(3);
    expect(history.find((a) => a.assertionId === keep.assertionId)?.reviewState).toBe("superseded");
    expect(history.find((a) => a.assertionId === drop.assertionId)?.reviewState).toBe("rejected");
    expect(history.find((a) => a.assertionId === corrected.replacement.assertionId)?.reviewState).toBe("corrected");

    // Rejected stays unapproved, permanently.
    expect(() => spine.reviewAssertion(drop.assertionId, "approved", OPERATOR)).toThrowError(/not legal/);
    expect(history.find((a) => a.assertionId === drop.assertionId)?.approvedForRetrieval).toBe(false);
  });
});

describe("object / heirloom details", () => {
  it("maps the authorized fields to assertions with uncertainty and no valuation anywhere", () => {
    const spine = new DurinSpine(createMemoryBackend(), { clock: makeClock() });
    const result = importSource(spine, inputFor("object_photo", "sewing machine photo"), {});
    if (result.admission.status !== "admitted") throw new Error("expected admission");
    const proposals = proposeObjectDetails(
      spine,
      result.admission.artifact.artifactId,
      result.metadataDerivation!.derivedId,
      {
        objectLabel: "sewing machine (heirloom)",
        familyProvenance: "inherited from grandmother",
        conditionNote: "worn but working",
        intent: "unknown",
        relatedPersonOrEvent: "grandmother — inheritance"
      },
      "object_archive"
    );
    expect(proposals.map((assertion) => assertion.themeType)).toEqual([
      "object",
      "provenance",
      "object",
      "purpose_intended_use",
      "relationship"
    ]);
    const intent = proposals.find((assertion) => assertion.themeType === "purpose_intended_use")!;
    expect(intent.value).toBe("intent: unknown");
    expect(intent.confidence).toBeLessThan(0.5); // reads as uncertain to the reviewer
    // No listing, pricing, or valuation escapes into the record.
    for (const proposal of proposals) {
      expect(proposal.value).not.toMatch(/\$|price|valuation|list(ing)?\b/i);
    }
    // Every proposal awaits human review.
    for (const proposal of proposals) {
      expect(proposal.reviewState).toBe("proposed");
      expect(proposal.approvedForRetrieval).toBe(false);
    }
  });
});

describe("no-delete language on the surface", () => {
  it("states the no-delete boundary verbatim in the UI source", () => {
    const ui = readFileSync(join(__dirname, "..", "src", "durin", "ui", "DurinIntakeApp.tsx"), "utf8");
    expect(ui).toContain("Nothing here is ever deleted");
    expect(ui).toContain("not deletion");
    expect(ui).toContain("refuses to execute deletion");
    // And the adapters never touch removal APIs.
    const adapters = readFileSync(join(__dirname, "..", "src", "durin", "adapters.ts"), "utf8");
    expect(adapters).not.toContain("removeItem");
  });
});
