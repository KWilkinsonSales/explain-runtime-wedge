// Durin Slice 0 — Command 1 contract, schema, fixture, and policy tests.
// These run BEFORE any intake implementation exists, per the A1–A10 matrix
// in src/durin/ACCEPTANCE.md. Spine/adapter/retrieval behavior is Commands
// 2–4; everything here must stay true independent of storage.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DELETION_STATES,
  DELETION_TRANSITIONS,
  DURIN_CONTRACT_VERSION,
  ORDINARY_RETRIEVAL_LANES,
  PRIVACY_LANES,
  REVIEW_STATES,
  REVIEW_TRANSITIONS,
  SOURCE_STATES,
  SOURCE_TRANSITIONS,
  isLegalDeletionTransition,
  isLegalReviewTransition,
  isLegalSourceTransition,
  isVisibleInLane,
  mayDriveOrdinaryRetrieval,
  type ThemeAssertion
} from "../src/durin/contracts";
import {
  validateCorrectionTelemetry,
  validateDerivedRepresentation,
  validateDuplicateObservation,
  validateFixtureManifest,
  validateIntakeEnvelope,
  validateIntakeReceipt,
  validateRouteDisposition,
  validateSourceArtifact,
  validateThemeAssertion
} from "../src/durin/guards";

const durinDir = join(__dirname, "..", "src", "durin");
const fixturesDir = join(durinDir, "fixtures");
const schemasDir = join(durinDir, "schemas");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const HASH = `sha256:${"a".repeat(64)}`;
const NOW = "2026-07-14T12:00:00Z";
const HUMAN = { actorId: "founder", actorType: "human" } as const;

function sampleEnvelope() {
  return {
    contractVersion: DURIN_CONTRACT_VERSION,
    intakeId: "intake-1",
    sourceType: "audio_recording",
    sourceUri: "fixture://durin-s0-audio-01",
    capturedAt: null,
    receivedAt: NOW,
    contentHash: HASH,
    owner: HUMAN,
    privacyHint: "private_journal",
    requestedAction: "admit",
    rawPreserved: true
  };
}

function sampleAssertion(): ThemeAssertion {
  return {
    contractVersion: DURIN_CONTRACT_VERSION,
    assertionId: "assert-1",
    sourceArtifactId: "artifact-1",
    derivedRepresentationId: "derived-1",
    themeType: "project",
    value: "Durin intake-router",
    confidence: 0.9,
    evidencePointer: "transcript:00:00:12-00:00:31",
    generator: { name: "manual-tagger", version: "0.1.0", method: "human_manual" },
    reviewState: "approved",
    reviewedBy: HUMAN,
    approvedForRetrieval: true,
    privacyScope: "private_journal",
    assertedAt: NOW,
    supersedesAssertionId: null,
    supersededByAssertionId: null
  };
}

describe("locked state enumerations", () => {
  it("locks source states exactly as authorized", () => {
    expect([...SOURCE_STATES]).toEqual([
      "received", "preserved", "derived", "reviewed", "admitted",
      "routed", "archived", "held", "rejected"
    ]);
  });

  it("locks review states exactly as authorized", () => {
    expect([...REVIEW_STATES]).toEqual([
      "proposed", "approved", "corrected", "rejected", "uncertain", "superseded"
    ]);
  });

  it("locks deletion states exactly as authorized", () => {
    expect([...DELETION_STATES]).toEqual([
      "not_requested", "requested", "approved", "executed", "denied"
    ]);
  });

  it("locks the seven privacy lanes exactly as authorized", () => {
    expect([...PRIVACY_LANES]).toEqual([
      "adl_business", "private_journal", "family_memory", "faith_study",
      "object_archive", "unsorted_holding", "restricted_health_legal"
    ]);
  });
});

describe("state transition tables", () => {
  it("moves a source through the governed loop", () => {
    const happyPath = ["received", "preserved", "derived", "reviewed", "admitted", "routed", "archived"] as const;
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(isLegalSourceTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it("fails closed to held and lets held re-enter review, never admission directly", () => {
    expect(isLegalSourceTransition("received", "held")).toBe(true);
    expect(isLegalSourceTransition("derived", "held")).toBe(true);
    expect(isLegalSourceTransition("held", "reviewed")).toBe(true);
    expect(isLegalSourceTransition("held", "admitted")).toBe(false);
    expect(isLegalSourceTransition("held", "routed")).toBe(false);
  });

  it("makes rejected and archived terminal, with no skip into routing", () => {
    expect(SOURCE_TRANSITIONS.rejected).toEqual([]);
    expect(SOURCE_TRANSITIONS.archived).toEqual([]);
    expect(isLegalSourceTransition("received", "routed")).toBe(false);
    expect(isLegalSourceTransition("preserved", "admitted")).toBe(false);
  });

  it("A9: no source transition implies deletion, and deletion needs explicit escalation", () => {
    for (const targets of Object.values(SOURCE_TRANSITIONS)) {
      expect(targets).not.toContain("deleted");
    }
    expect(isLegalDeletionTransition("not_requested", "executed")).toBe(false);
    expect(isLegalDeletionTransition("not_requested", "approved")).toBe(false);
    expect(isLegalDeletionTransition("not_requested", "requested")).toBe(true);
    expect(isLegalDeletionTransition("requested", "approved")).toBe(true);
    expect(isLegalDeletionTransition("approved", "executed")).toBe(true);
    expect(isLegalDeletionTransition("requested", "denied")).toBe(true);
    expect(DELETION_TRANSITIONS.executed).toEqual([]);
  });

  it("A8: superseded and rejected review states are terminal; proposed cannot jump to superseded", () => {
    expect(REVIEW_TRANSITIONS.superseded).toEqual([]);
    expect(REVIEW_TRANSITIONS.rejected).toEqual([]);
    expect(isLegalReviewTransition("proposed", "superseded")).toBe(false);
    expect(isLegalReviewTransition("approved", "superseded")).toBe(true);
    expect(isLegalReviewTransition("uncertain", "approved")).toBe(true);
  });
});

describe("core object guards (A1, A2)", () => {
  it("accepts a valid IntakeEnvelope and rejects a broken one", () => {
    expect(validateIntakeEnvelope(sampleEnvelope())).toEqual({ valid: true, errors: [] });
    const bad = validateIntakeEnvelope({ ...sampleEnvelope(), sourceType: "spreadsheet", contentHash: "md5:abc" });
    expect(bad.valid).toBe(false);
    expect(bad.errors.join("\n")).toMatch(/sourceType/);
    expect(bad.errors.join("\n")).toMatch(/contentHash/);
  });

  it("A2: a derived record cannot masquerade as an original, and vice versa", () => {
    const artifact = {
      contractVersion: DURIN_CONTRACT_VERSION,
      artifactId: "artifact-1",
      intakeId: "intake-1",
      contentHash: HASH,
      byteLength: 2048,
      mediaType: "audio/mp4",
      originalFilename: "synthetic-memo.m4a",
      storageRef: "local://originals/artifact-1",
      preservedAt: NOW,
      state: "preserved",
      deletionState: "not_requested",
      isOriginal: true
    };
    expect(validateSourceArtifact(artifact).valid).toBe(true);
    expect(validateSourceArtifact({ ...artifact, isOriginal: false }).valid).toBe(false);

    const derived = {
      contractVersion: DURIN_CONTRACT_VERSION,
      derivedId: "derived-1",
      sourceArtifactId: "artifact-1",
      kind: "transcript",
      generator: { name: "manual-transcriber", version: "0.1.0", method: "human_manual" },
      contentHash: HASH,
      createdAt: NOW,
      storageRef: "local://derived/derived-1",
      isOriginal: false
    };
    expect(validateDerivedRepresentation(derived).valid).toBe(true);
    expect(validateDerivedRepresentation({ ...derived, isOriginal: true }).valid).toBe(false);
  });

  it("A4: retrieval approval is only legal on an approved assertion", () => {
    expect(validateThemeAssertion(sampleAssertion()).valid).toBe(true);
    const smuggled = validateThemeAssertion({ ...sampleAssertion(), reviewState: "proposed", reviewedBy: null });
    expect(smuggled.valid).toBe(false);
    expect(smuggled.errors.join("\n")).toMatch(/approvedForRetrieval/);
  });

  it("A3: only a human may approve a lane crossing", () => {
    const disposition = {
      contractVersion: DURIN_CONTRACT_VERSION,
      dispositionId: "disp-1",
      intakeId: "intake-1",
      sourceArtifactId: "artifact-1",
      lane: "family_memory",
      authority: HUMAN,
      reason: "family memory routed by owner",
      deletionState: "not_requested",
      approvedCrossings: [
        { fromLane: "family_memory", toLane: "adl_business", approvedBy: HUMAN, reason: "approved abstraction for a talk", approvedAt: NOW }
      ],
      unresolvedQuestions: [],
      decidedAt: NOW
    };
    expect(validateRouteDisposition(disposition).valid).toBe(true);
    const systemCrossing = {
      ...disposition,
      approvedCrossings: [
        { ...disposition.approvedCrossings[0], approvedBy: { actorId: "auto", actorType: "system" } }
      ]
    };
    const result = validateRouteDisposition(systemCrossing);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toMatch(/only a human/);
  });

  it("A10: a receipt requires a reopen digest and full accounting fields", () => {
    const receipt = {
      contractVersion: DURIN_CONTRACT_VERSION,
      receiptId: "receipt-1",
      intakeId: "intake-1",
      createdAt: NOW,
      whatEntered: { sourceArtifactId: "artifact-1", sourceType: "audio_recording", contentHash: HASH },
      whatWasDerived: ["derived-1"],
      whatWasApproved: ["assert-1"],
      whatWasRejectedOrHeld: [],
      whatRemainedPrivate: ["artifact-1"],
      routedTo: "private_journal",
      dispositionId: "disp-1",
      sourceState: "routed",
      deletionState: "not_requested",
      reopenDigest: HASH
    };
    expect(validateIntakeReceipt(receipt).valid).toBe(true);
    expect(validateIntakeReceipt({ ...receipt, reopenDigest: "corrupted" }).valid).toBe(false);
  });

  it("A8: correction telemetry links two distinct assertions with a cause", () => {
    const telemetry = {
      contractVersion: DURIN_CONTRACT_VERSION,
      telemetryId: "telemetry-1",
      supersededAssertionId: "assert-1",
      supersedingAssertionId: "assert-2",
      reason: "memo author was misattributed",
      cause: "wrong_person",
      correctedBy: HUMAN,
      correctedAt: NOW
    };
    expect(validateCorrectionTelemetry(telemetry).valid).toBe(true);
    const selfLink = validateCorrectionTelemetry({ ...telemetry, supersedingAssertionId: "assert-1" });
    expect(selfLink.valid).toBe(false);
    expect(selfLink.errors.join("\n")).toMatch(/supersede itself/);
  });

  it("A7: a duplicate observation must resolve to a canonical artifact", () => {
    const observation = {
      contractVersion: DURIN_CONTRACT_VERSION,
      observationId: "dup-1",
      contentHash: HASH,
      canonicalArtifactId: "artifact-1",
      duplicateIntakeId: "intake-2",
      observedAt: NOW,
      action: "linked_duplicate"
    };
    expect(validateDuplicateObservation(observation).valid).toBe(true);
    expect(validateDuplicateObservation({ ...observation, canonicalArtifactId: "" }).valid).toBe(false);
    expect(validateDuplicateObservation({ ...observation, action: "second_canonical" }).valid).toBe(false);
  });
});

describe("lane visibility policy (A3, A6)", () => {
  it("denies cross-lane visibility by default and opens only on an approved crossing", () => {
    expect(isVisibleInLane("family_memory", "adl_business", [])).toBe(false);
    expect(isVisibleInLane("family_memory", "family_memory", [])).toBe(true);
    const crossing = {
      fromLane: "family_memory",
      toLane: "adl_business",
      approvedBy: HUMAN,
      reason: "approved abstraction",
      approvedAt: NOW
    } as const;
    expect(isVisibleInLane("family_memory", "adl_business", [crossing])).toBe(true);
    // The crossing is directional; it does not open the reverse door.
    expect(isVisibleInLane("adl_business", "family_memory", [crossing])).toBe(false);
  });

  it("A6: restricted health material never rides ordinary retrieval", () => {
    expect(ORDINARY_RETRIEVAL_LANES).not.toContain("restricted_health_legal");
    const restricted = { ...sampleAssertion(), privacyScope: "restricted_health_legal" } as ThemeAssertion;
    expect(mayDriveOrdinaryRetrieval(restricted)).toBe(false);
  });

  it("A4: rejected, superseded, uncertain, and proposed assertions cannot drive retrieval", () => {
    for (const reviewState of ["rejected", "superseded", "uncertain", "proposed"] as const) {
      const assertion = {
        ...sampleAssertion(),
        reviewState,
        approvedForRetrieval: false,
        reviewedBy: reviewState === "proposed" ? null : HUMAN
      } as ThemeAssertion;
      expect(mayDriveOrdinaryRetrieval(assertion)).toBe(false);
    }
    expect(mayDriveOrdinaryRetrieval(sampleAssertion())).toBe(true);
  });
});

describe("JSON schemas mirror the contracts", () => {
  const schemaFiles = readdirSync(schemasDir).filter((name) => name.endsWith(".schema.json"));

  it("ships one schema per core object plus the fixture manifest", () => {
    expect(schemaFiles.sort()).toEqual([
      "correction-telemetry.schema.json",
      "derived-representation.schema.json",
      "duplicate-observation.schema.json",
      "fixture-manifest.schema.json",
      "intake-envelope.schema.json",
      "intake-receipt.schema.json",
      "route-disposition.schema.json",
      "source-artifact.schema.json",
      "theme-assertion.schema.json"
    ]);
  });

  it.each(schemaFiles)("%s parses, is versioned, and is closed to unknown fields", (name) => {
    const schema = readJson(join(schemasDir, name)) as Record<string, unknown>;
    expect(schema["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(String(schema["$id"])).toContain(`/${DURIN_CONTRACT_VERSION}`);
    expect(schema["additionalProperties"]).toBe(false);
    expect(Array.isArray(schema["required"])).toBe(true);
    const properties = schema["properties"] as Record<string, unknown>;
    expect(Object.keys(properties).sort()).toEqual([...(schema["required"] as string[])].sort());
    expect((properties["contractVersion"] as Record<string, unknown>)["const"]).toBe(DURIN_CONTRACT_VERSION);
  });
});

describe("fixture manifests", () => {
  const fixtureFiles = readdirSync(fixturesDir).filter((name) => name.endsWith(".json"));
  const manifests = fixtureFiles.map((name) => ({
    name,
    manifest: readJson(join(fixturesDir, name)) as Record<string, unknown>
  }));

  it("defines exactly the five authorized fixtures, one per source type", () => {
    expect(fixtureFiles).toHaveLength(5);
    const sourceTypes = manifests.map(({ manifest }) => manifest["sourceType"]).sort();
    expect(sourceTypes).toEqual([
      "audio_recording", "family_photo", "object_photo", "pdf_scan", "text_note_export"
    ]);
  });

  it.each(fixtureFiles)("%s validates against the fixture contract", (name) => {
    const manifest = readJson(join(fixturesDir, name));
    expect(validateFixtureManifest(manifest)).toEqual({ valid: true, errors: [] });
  });

  it("labels every fixture truthfully as synthetic", () => {
    for (const { name, manifest } of manifests) {
      expect(String(manifest["provenanceLabel"]), name).toMatch(/^synthetic/);
    }
  });

  it("covers all of A1–A10 across the fixture set", () => {
    const covered = new Set(manifests.flatMap(({ manifest }) => manifest["acceptanceLinkage"] as string[]));
    for (const id of ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"]) {
      expect(covered.has(id), `${id} must be linked by at least one fixture`).toBe(true);
    }
  });

  it("routes the mixed/unknown fixture to holding first, restricted only after review", () => {
    const note = manifests.find(({ manifest }) => manifest["sourceType"] === "text_note_export")!.manifest;
    expect(note["expectedInitialRoute"]).toBe("unsorted_holding");
    expect(note["expectedLane"]).toBe("restricted_health_legal");
  });

  it("declares negative visibility and duplicate behavior on every fixture", () => {
    for (const { name, manifest } of manifests) {
      expect((manifest["negativeVisibility"] as string[]).length, name).toBeGreaterThan(0);
      expect(String(manifest["duplicateBehavior"]), name).toMatch(/canonical/i);
    }
  });

  it("pins the five governing retrieval-proof queries across the set", () => {
    const queries = manifests.flatMap(({ manifest }) => manifest["retrievalProofQueries"] as string[]).join("\n");
    expect(queries).toMatch(/teaching or learning/);
    expect(queries).toMatch(/family provenance/);
    expect(queries).toMatch(/exclude health material/);
    expect(queries).toMatch(/Durin intake-router idea/);
    expect(queries).toMatch(/unresolved or unsorted/);
  });
});
