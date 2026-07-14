// Durin Slice 0 — Command 2 spine tests.
// Deterministic coverage for A1, A2, A3, A6, A7, A8, A9, A10 plus the six
// authorized failure injections: hash mismatch, missing original, duplicate
// race, invalid transition, unauthorized crossing, corrupted receipt
// reference. Everything runs against the in-memory KeyValueBackend, and
// fresh-session determinism is proven by opening second spine instances
// over the same backend.

import { describe, expect, it } from "vitest";

import {
  DURIN_CONTRACT_VERSION,
  type Actor,
  type IntakeEnvelope,
  type PrivacyLane,
  type SourceType,
  type ThemeType
} from "../src/durin/contracts";
import { createMemoryBackend, verifyChain, LedgerIntegrityError, type DurinLedgerEntry } from "../src/durin/ledger";
import { DurinSpine, DurinSpineError } from "../src/durin/spine";
import { canonicalStringify, contentHashOf, sha256Hex } from "../src/durin/sha256";

const FOUNDER: Actor = { actorId: "founder", actorType: "human" };
const ROBOT: Actor = { actorId: "auto-router", actorType: "system" };

function makeClock(): () => string {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 6, 14, 12, 0, 0, tick++)).toISOString();
}

function makeSpine(backend = createMemoryBackend()) {
  return { spine: new DurinSpine(backend, { clock: makeClock() }), backend };
}

let intakeCounter = 0;
function envelopeFor(
  content: string,
  overrides?: Partial<Pick<IntakeEnvelope, "sourceType" | "privacyHint" | "requestedAction" | "intakeId" | "contentHash">>
): IntakeEnvelope {
  intakeCounter += 1;
  return {
    contractVersion: DURIN_CONTRACT_VERSION,
    intakeId: overrides?.intakeId ?? `intake-${intakeCounter}`,
    sourceType: overrides?.sourceType ?? "text_note_export",
    sourceUri: `fixture://synthetic/${intakeCounter}`,
    capturedAt: null,
    receivedAt: "2026-07-14T11:00:00Z",
    contentHash: overrides?.contentHash ?? contentHashOf(content),
    owner: FOUNDER,
    privacyHint: overrides && "privacyHint" in overrides ? overrides.privacyHint! : "private_journal",
    requestedAction: overrides?.requestedAction ?? "admit",
    rawPreserved: true
  };
}

// Full governed loop: admit -> derive -> propose -> approve -> reviewed ->
// admitted -> route -> receipt. Returns every id the tests need.
function runFullIntake(
  spine: DurinSpine,
  options: {
    content: string;
    sourceType: SourceType;
    lane: PrivacyLane;
    themeType?: ThemeType;
    themeValue?: string;
    privacyScope?: PrivacyLane;
    crossings?: Parameters<DurinSpine["route"]>[4];
  }
) {
  const envelope = envelopeFor(options.content, { sourceType: options.sourceType, privacyHint: options.lane });
  const admission = spine.admit(envelope, options.content);
  if (admission.status !== "admitted") throw new Error("expected fresh admission");
  const artifactId = admission.artifact.artifactId;
  const derived = spine.derive(
    artifactId,
    "extracted_text",
    `derived form of: ${options.content}`,
    { name: "manual-transcriber", version: "0.1.0", method: "human_manual" },
    FOUNDER
  );
  const assertion = spine.proposeAssertion({
    sourceArtifactId: artifactId,
    derivedRepresentationId: derived.derivedId,
    themeType: options.themeType ?? "story_memory",
    value: options.themeValue ?? "synthetic theme",
    confidence: 0.9,
    evidencePointer: `extracted_text:${derived.derivedId}`,
    generator: { name: "manual-tagger", version: "0.1.0", method: "human_manual" },
    privacyScope: options.privacyScope ?? options.lane
  });
  spine.reviewAssertion(assertion.assertionId, "approved", FOUNDER);
  spine.transitionSource(artifactId, "reviewed", FOUNDER, "review complete");
  spine.transitionSource(artifactId, "admitted", FOUNDER, "admitted after review");
  const disposition = spine.route(artifactId, options.lane, FOUNDER, `routed to ${options.lane}`, options.crossings ?? []);
  const receipt = spine.issueReceipt(envelope.intakeId, FOUNDER);
  return { envelope, artifactId, derived, assertion, disposition, receipt };
}

describe("sha256 primitive", () => {
  it("matches the FIPS 180-4 test vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("produces contract-shaped content hashes and stable canonical JSON", () => {
    expect(contentHashOf("x")).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(canonicalStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});

describe("A1 — multimodal admission through one envelope contract", () => {
  it("admits all five source types through the same admit() path with linked records", () => {
    const { spine } = makeSpine();
    const sourceTypes: SourceType[] = ["audio_recording", "text_note_export", "pdf_scan", "family_photo", "object_photo"];
    for (const sourceType of sourceTypes) {
      const content = `synthetic ${sourceType} content`;
      const envelope = envelopeFor(content, { sourceType });
      const admission = spine.admit(envelope, content);
      expect(admission.status).toBe("admitted");
      if (admission.status === "admitted") {
        expect(admission.artifact.intakeId).toBe(envelope.intakeId);
        expect(admission.artifact.contentHash).toBe(envelope.contentHash);
        expect(admission.artifact.isOriginal).toBe(true);
      }
    }
    expect(spine.ledgerEntries().filter((entry) => entry.kind === "SOURCE_PRESERVED")).toHaveLength(5);
  });

  it("rejects an envelope that fails the contract and audits the denial", () => {
    const { spine } = makeSpine();
    const bad = { ...envelopeFor("x"), sourceType: "spreadsheet" } as unknown as IntakeEnvelope;
    expect(() => spine.admit(bad, "x")).toThrowError(DurinSpineError);
    expect(spine.auditEntries().some((entry) => entry.kind === "ADMISSION_DENIED")).toBe(true);
  });
});

describe("A2 — source integrity across processing", () => {
  it("keeps hashes and links intact and derived records distinguishable", () => {
    const { spine, backend } = makeSpine();
    const { artifactId, derived } = runFullIntake(spine, {
      content: "synthetic audio transcript source",
      sourceType: "audio_recording",
      lane: "private_journal"
    });
    const artifact = spine.getArtifact(artifactId);
    expect(artifact.isOriginal).toBe(true);
    expect(derived.isOriginal).toBe(false);
    expect(derived.sourceArtifactId).toBe(artifactId);
    expect(derived.generator).toEqual({ name: "manual-transcriber", version: "0.1.0", method: "human_manual" });
    // The preserved original still hashes to the admission hash.
    expect(contentHashOf(backend.getItem(artifact.storageRef)!)).toBe(artifact.contentHash);
    // And the ledger chain remains verifiable end to end.
    expect(() => verifyChain(spine.ledgerEntries())).not.toThrow();
  });

  it("FAILURE INJECTION (hash mismatch): admission with a false declared hash fails closed", () => {
    const { spine } = makeSpine();
    const envelope = envelopeFor("real content", { contentHash: contentHashOf("different content") });
    expect(() => spine.admit(envelope, "real content")).toThrowError(/does not match/);
    const audit = spine.auditEntries();
    expect(audit).toHaveLength(1);
    expect(audit[0].kind).toBe("ADMISSION_DENIED");
    // Nothing was preserved or admitted.
    expect(spine.ledgerEntries().filter((entry) => entry.kind === "SOURCE_PRESERVED")).toHaveLength(0);
  });

  it("FAILURE INJECTION (missing original): derivation refuses when the preservation path is broken", () => {
    const { spine, backend } = makeSpine();
    const content = "synthetic pdf text";
    const admission = spine.admit(envelopeFor(content, { sourceType: "pdf_scan" }), content);
    if (admission.status !== "admitted") throw new Error("expected admission");
    backend.removeItem(admission.artifact.storageRef);
    expect(() =>
      spine.derive(admission.artifact.artifactId, "extracted_text", "text", { name: "t", version: "1", method: "human_manual" }, FOUNDER)
    ).toThrowError(/original missing/);
    expect(() => spine.originalContent(admission.artifact.artifactId)).toThrowError(DurinSpineError);
    expect(spine.auditEntries().some((entry) => entry.kind === "TRANSITION_DENIED")).toBe(true);
  });

  it("FAILURE INJECTION (tampered original): a mutated original no longer matching its hash blocks derivation", () => {
    const { spine, backend } = makeSpine();
    const content = "synthetic note";
    const admission = spine.admit(envelopeFor(content), content);
    if (admission.status !== "admitted") throw new Error("expected admission");
    backend.setItem(admission.artifact.storageRef, "silently altered");
    expect(() =>
      spine.derive(admission.artifact.artifactId, "extracted_text", "text", { name: "t", version: "1", method: "human_manual" }, FOUNDER)
    ).toThrowError(/no longer matches/);
  });
});

describe("fail-closed holding for unknown or mixed material", () => {
  it("routes a hintless source to held + unsorted_holding, never a guessed lane", () => {
    const { spine } = makeSpine();
    const content = "synthetic mixed note: medication timing + errands";
    const admission = spine.admit(envelopeFor(content, { privacyHint: null }), content);
    if (admission.status !== "admitted") throw new Error("expected admission");
    expect(admission.artifact.state).toBe("held");
    const disposition = spine.dispositionFor(admission.artifact.artifactId);
    expect(disposition?.lane).toBe("unsorted_holding");
    expect(disposition?.unresolvedQuestions.length).toBeGreaterThan(0);
    // A held source can re-enter review, but can never jump straight to routing.
    expect(() => spine.route(admission.artifact.artifactId, "private_journal", FOUNDER, "premature")).toThrowError(/denied/);
    spine.transitionSource(admission.artifact.artifactId, "reviewed", FOUNDER, "human reviewed held material");
    spine.transitionSource(admission.artifact.artifactId, "admitted", FOUNDER, "admitted");
    const routed = spine.route(admission.artifact.artifactId, "restricted_health_legal", FOUNDER, "human routed to restricted");
    expect(routed.lane).toBe("restricted_health_legal");
  });

  it("honors an explicit hold request even when a lane hint exists", () => {
    const { spine } = makeSpine();
    const content = "synthetic hold-me note";
    const admission = spine.admit(envelopeFor(content, { requestedAction: "hold" }), content);
    if (admission.status !== "admitted") throw new Error("expected admission");
    expect(admission.artifact.state).toBe("held");
    expect(spine.dispositionFor(admission.artifact.artifactId)?.lane).toBe("unsorted_holding");
  });
});

describe("A3 — lane isolation and approved crossings", () => {
  it("keeps family material out of adl_business and audits the denied crossing", () => {
    const { spine } = makeSpine();
    const { assertion } = runFullIntake(spine, {
      content: "synthetic family photo description: teaching bread baking",
      sourceType: "family_photo",
      lane: "family_memory",
      themeType: "activity",
      themeValue: "teaching and learning"
    });
    expect(spine.queryAssertions("family_memory", FOUNDER).map((a) => a.assertionId)).toContain(assertion.assertionId);
    const business = spine.queryAssertions("adl_business", FOUNDER);
    expect(business).toHaveLength(0);
    const denied = spine.auditEntries().filter((entry) => entry.kind === "CROSSING_DENIED");
    expect(denied).toHaveLength(1);
    expect(denied[0].payload).toMatchObject({ recordLane: "family_memory", queryLane: "adl_business" });
  });

  it("opens exactly the approved crossing, directionally, and nothing else", () => {
    const { spine } = makeSpine();
    const { assertion } = runFullIntake(spine, {
      content: "synthetic family story approved as an abstraction for a talk",
      sourceType: "family_photo",
      lane: "family_memory",
      crossings: [
        {
          fromLane: "family_memory",
          toLane: "adl_business",
          approvedBy: FOUNDER,
          reason: "approved abstraction for a company talk",
          approvedAt: "2026-07-14T11:30:00Z"
        }
      ]
    });
    expect(spine.queryAssertions("adl_business", FOUNDER).map((a) => a.assertionId)).toContain(assertion.assertionId);
    // The crossing does not open any other lane.
    expect(spine.queryAssertions("faith_study", FOUNDER)).toHaveLength(0);
  });

  it("FAILURE INJECTION (unauthorized crossing): system actors cannot route or approve crossings", () => {
    const { spine } = makeSpine();
    const content = "synthetic business memo";
    const admission = spine.admit(envelopeFor(content, { sourceType: "pdf_scan", privacyHint: "adl_business" }), content);
    if (admission.status !== "admitted") throw new Error("expected admission");
    spine.transitionSource(admission.artifact.artifactId, "derived", ROBOT, "derivation step");
    spine.transitionSource(admission.artifact.artifactId, "reviewed", FOUNDER, "reviewed");
    spine.transitionSource(admission.artifact.artifactId, "admitted", FOUNDER, "admitted");
    expect(() => spine.route(admission.artifact.artifactId, "adl_business", ROBOT, "auto-route attempt")).toThrowError(
      /only a human/
    );
    expect(spine.auditEntries().some((entry) => entry.kind === "TRANSITION_DENIED")).toBe(true);
    // A crossing "approved" by a system actor is rejected at the contract gate.
    expect(() =>
      spine.route(admission.artifact.artifactId, "adl_business", FOUNDER, "routed", [
        { fromLane: "family_memory", toLane: "adl_business", approvedBy: ROBOT, reason: "auto", approvedAt: "2026-07-14T11:30:00Z" }
      ])
    ).toThrowError(/only a human/);
  });
});

describe("A6 — restricted health material never rides ordinary retrieval", () => {
  it("excludes restricted-scope assertions from every ordinary lane query", () => {
    const { spine } = makeSpine();
    runFullIntake(spine, {
      content: "synthetic health reflection",
      sourceType: "text_note_export",
      lane: "restricted_health_legal",
      themeType: "privacy",
      themeValue: "restricted health reflection",
      privacyScope: "restricted_health_legal"
    });
    for (const lane of ["private_journal", "family_memory", "adl_business"] as const) {
      expect(spine.queryAssertions(lane, FOUNDER)).toHaveLength(0);
    }
  });

  it("refuses restricted_health_legal as an ordinary query scope entirely", () => {
    const { spine } = makeSpine();
    expect(() => spine.queryAssertions("restricted_health_legal", FOUNDER)).toThrowError(/not an ordinary retrieval scope/);
  });
});

describe("A7 — duplicate idempotency", () => {
  it("FAILURE INJECTION (duplicate race): re-import never creates a second canonical source", () => {
    const { spine, backend } = makeSpine();
    const content = "synthetic heirloom photo bytes";
    const first = spine.admit(envelopeFor(content, { sourceType: "object_photo" }), content);
    if (first.status !== "admitted") throw new Error("expected admission");

    // Same content, different intake attempt (the race: a second import of
    // the same bytes before anyone noticed the first).
    const second = spine.admit(envelopeFor(content, { sourceType: "object_photo" }), content);
    expect(second.status).toBe("duplicate");
    if (second.status === "duplicate") {
      expect(second.canonicalArtifactId).toBe(first.artifact.artifactId);
      expect(second.observation.action).toBe("linked_duplicate");
    }

    // Same intake re-submitted verbatim: idempotent receipt.
    const replay = spine.admit(envelopeFor(content, { sourceType: "object_photo", intakeId: first.artifact.intakeId }), content);
    expect(replay.status).toBe("duplicate");
    if (replay.status === "duplicate") expect(replay.observation.action).toBe("idempotent_receipt");

    // A fresh session over the same backend still refuses a second canonical.
    const reopened = new DurinSpine(backend, { clock: makeClock() });
    const late = reopened.admit(envelopeFor(content, { sourceType: "object_photo" }), content);
    expect(late.status).toBe("duplicate");

    expect(reopened.ledgerEntries().filter((entry) => entry.kind === "SOURCE_PRESERVED")).toHaveLength(1);
    expect(reopened.ledgerEntries().filter((entry) => entry.kind === "DUPLICATE_OBSERVED")).toHaveLength(3);
  });
});

describe("A8 — correction by supersession with telemetry", () => {
  it("preserves the old assertion as superseded, links both directions, and records why", () => {
    const { spine } = makeSpine();
    const { assertion } = runFullIntake(spine, {
      content: "synthetic memo with misattributed author",
      sourceType: "pdf_scan",
      lane: "adl_business",
      themeType: "person",
      themeValue: "Author A (wrong)"
    });
    const { replacement, telemetry } = spine.correctAssertion(
      assertion.assertionId,
      { value: "Author B (correct)", confidence: 0.95, evidencePointer: "manual:signature block" },
      "memo author was misattributed",
      "wrong_person",
      FOUNDER
    );
    const old = spine.getAssertion(assertion.assertionId);
    expect(old.reviewState).toBe("superseded");
    expect(old.approvedForRetrieval).toBe(false);
    expect(old.supersededByAssertionId).toBe(replacement.assertionId);
    expect(replacement.supersedesAssertionId).toBe(assertion.assertionId);
    expect(replacement.reviewState).toBe("corrected");
    expect(telemetry.cause).toBe("wrong_person");
    expect(telemetry.supersededAssertionId).toBe(assertion.assertionId);

    // The superseded value no longer drives retrieval; the approved
    // replacement does.
    spine.reviewAssertion(replacement.assertionId, "approved", FOUNDER);
    const visible = spine.queryAssertions("adl_business", FOUNDER);
    expect(visible.map((a) => a.assertionId)).toContain(replacement.assertionId);
    expect(visible.map((a) => a.assertionId)).not.toContain(assertion.assertionId);
  });

  it("FAILURE INJECTION (invalid transition): terminal review states stay terminal", () => {
    const { spine } = makeSpine();
    const admission = spine.admit(envelopeFor("synthetic content"), "synthetic content");
    if (admission.status !== "admitted") throw new Error("expected admission");
    const assertion = spine.proposeAssertion({
      sourceArtifactId: admission.artifact.artifactId,
      derivedRepresentationId: null,
      themeType: "story_memory",
      value: "theme",
      confidence: 0.5,
      evidencePointer: "manual:note",
      generator: { name: "manual-tagger", version: "0.1.0", method: "human_manual" },
      privacyScope: "private_journal"
    });
    spine.reviewAssertion(assertion.assertionId, "rejected", FOUNDER);
    expect(() => spine.reviewAssertion(assertion.assertionId, "approved", FOUNDER)).toThrowError(/not legal/);
    expect(() =>
      spine.correctAssertion(assertion.assertionId, { value: "v", confidence: 0.5, evidencePointer: "manual:x" }, "r", "other", FOUNDER)
    ).toThrowError(/not legal/);
    expect(spine.auditEntries().filter((entry) => entry.kind === "TRANSITION_DENIED")).toHaveLength(2);
  });

  it("FAILURE INJECTION (invalid transition): sources cannot skip the governed loop", () => {
    const { spine } = makeSpine();
    const admission = spine.admit(envelopeFor("synthetic content two"), "synthetic content two");
    if (admission.status !== "admitted") throw new Error("expected admission");
    expect(() => spine.transitionSource(admission.artifact.artifactId, "routed", FOUNDER, "skip")).toThrowError(/denied/);
    expect(() => spine.transitionSource(admission.artifact.artifactId, "admitted", FOUNDER, "skip")).toThrowError(/denied/);
    const denied = spine.auditEntries().filter((entry) => entry.kind === "TRANSITION_DENIED");
    expect(denied).toHaveLength(2);
  });
});

describe("A9 — explicit no-delete boundary", () => {
  it("never executes deletion in Slice 0, even after explicit request and approval", () => {
    const { spine, backend } = makeSpine();
    const { artifactId } = runFullIntake(spine, {
      content: "synthetic object photo",
      sourceType: "object_photo",
      lane: "object_archive"
    });
    spine.requestDeletion(artifactId, FOUNDER, "owner asked to delete");
    spine.approveDeletion(artifactId, FOUNDER, "owner confirmed");
    expect(() => spine.executeDeletion(artifactId, FOUNDER)).toThrowError(/no deletion execution/);
    // The refusal is audited and the original is untouched.
    expect(
      spine
        .auditEntries()
        .some((entry) => entry.kind === "TRANSITION_DENIED" && (entry.payload as { to: string }).to === "executed")
    ).toBe(true);
    const artifact = spine.getArtifact(artifactId);
    expect(artifact.deletionState).toBe("approved");
    expect(backend.getItem(artifact.storageRef)).not.toBeNull();
    // Processing states never implied deletion: the source is routed, not gone.
    expect(artifact.state).toBe("routed");
  });

  it("denies deletion shortcuts and non-human deletion authority", () => {
    const { spine } = makeSpine();
    const admission = spine.admit(envelopeFor("synthetic keeper"), "synthetic keeper");
    if (admission.status !== "admitted") throw new Error("expected admission");
    expect(() => spine.approveDeletion(admission.artifact.artifactId, FOUNDER, "skip request step")).toThrowError(/not legal/);
    expect(() => spine.requestDeletion(admission.artifact.artifactId, ROBOT, "auto-cleanup")).toThrowError(/human/);
    // denied -> requested may be retried; requested -> denied is legal.
    spine.requestDeletion(admission.artifact.artifactId, FOUNDER, "asked");
    spine.denyDeletion(admission.artifact.artifactId, FOUNDER, "second thoughts");
    expect(spine.getArtifact(admission.artifact.artifactId).deletionState).toBe("denied");
  });
});

describe("A10 — deterministic receipt reopen", () => {
  it("reopens to identical records and digest, including from a fresh session", () => {
    const { spine, backend } = makeSpine();
    const { receipt, artifactId } = runFullIntake(spine, {
      content: "synthetic founder voice memo about the Durin intake-router",
      sourceType: "audio_recording",
      lane: "private_journal",
      themeType: "project",
      themeValue: "Durin intake-router"
    });
    const reopened = spine.reopenReceipt(receipt.receiptId);
    expect(reopened.records.artifact.artifactId).toBe(artifactId);
    expect(reopened.receipt.reopenDigest).toBe(receipt.reopenDigest);

    // Fresh session over the same backend: identical reconstruction.
    const freshSession = new DurinSpine(backend, { clock: makeClock() });
    const freshReopen = freshSession.reopenReceipt(receipt.receiptId);
    expect(canonicalStringify(freshReopen.records)).toBe(canonicalStringify(reopened.records));

    // Later history (a post-receipt correction) does not disturb the
    // receipt's deterministic reconstruction: reopen replays to issuance.
    const assertionId = reopened.records.assertions[0].assertionId;
    freshSession.correctAssertion(
      assertionId,
      { value: "Durin intake-router (refined)", confidence: 0.95, evidencePointer: "manual:relisten" },
      "refined wording",
      "wrong_theme_value",
      FOUNDER
    );
    expect(freshSession.reopenReceipt(receipt.receiptId).receipt.reopenDigest).toBe(receipt.reopenDigest);
  });

  it("FAILURE INJECTION (corrupted receipt reference): a re-signed-but-altered receipt fails closed on reopen", () => {
    const { spine, backend } = makeSpine();
    const { receipt } = runFullIntake(spine, {
      content: "synthetic receipt-corruption target",
      sourceType: "text_note_export",
      lane: "private_journal"
    });

    // Adversarial tamper: alter the receipt's reopenDigest inside the
    // persisted ledger AND recompute every entry hash so the chain itself
    // still verifies. Only the reopen digest check can catch this.
    const stored = JSON.parse(backend.getItem("durin.ledger.v1")!) as { version: string; entries: DurinLedgerEntry[] };
    let prevHash = `sha256:${"0".repeat(64)}`;
    stored.entries = stored.entries.map((entry) => {
      const payload =
        entry.kind === "RECEIPT_ISSUED"
          ? {
              receipt: {
                ...(entry.payload as { receipt: typeof receipt }).receipt,
                reopenDigest: `sha256:${"f".repeat(64)}`
              }
            }
          : entry.payload;
      const unsigned = { seq: entry.seq, occurredAt: entry.occurredAt, actor: entry.actor, kind: entry.kind, payload, prevHash };
      const entryHash = `sha256:${sha256Hex(canonicalStringify(unsigned))}`;
      prevHash = entryHash;
      return { ...unsigned, entryHash } as DurinLedgerEntry;
    });
    backend.setItem("durin.ledger.v1", JSON.stringify(stored));

    const attacked = new DurinSpine(backend, { clock: makeClock() });
    expect(() => attacked.reopenReceipt(receipt.receiptId)).toThrowError(/does not deterministically reconstruct/);
  });

  it("FAILURE INJECTION (mutated ledger): naive tampering is caught by the hash chain before anything opens", () => {
    const { spine, backend } = makeSpine();
    runFullIntake(spine, { content: "synthetic tamper target", sourceType: "pdf_scan", lane: "adl_business" });
    const stored = JSON.parse(backend.getItem("durin.ledger.v1")!) as { version: string; entries: DurinLedgerEntry[] };
    (stored.entries[2] as { occurredAt: string }).occurredAt = "1999-01-01T00:00:00Z";
    backend.setItem("durin.ledger.v1", JSON.stringify(stored));
    expect(() => new DurinSpine(backend, { clock: makeClock() })).toThrowError(LedgerIntegrityError);
  });

  it("fails closed on an unknown storage version instead of migrating destructively", () => {
    const backend = createMemoryBackend();
    backend.setItem("durin.ledger.v1", JSON.stringify({ version: "durin.ledger.v999", entries: [] }));
    expect(() => new DurinSpine(backend, { clock: makeClock() })).toThrowError(/refusing to migrate/);
  });
});

describe("receipt content accounting", () => {
  it("accounts for approved, rejected/held, private, and deletion state truthfully", () => {
    const { spine } = makeSpine();
    const { receipt, assertion } = runFullIntake(spine, {
      content: "synthetic accounting target",
      sourceType: "family_photo",
      lane: "family_memory"
    });
    expect(receipt.whatWasApproved).toContain(assertion.assertionId);
    expect(receipt.whatRemainedPrivate.length).toBeGreaterThan(0);
    expect(receipt.routedTo).toBe("family_memory");
    expect(receipt.sourceState).toBe("routed");
    expect(receipt.deletionState).toBe("not_requested");
  });
});
