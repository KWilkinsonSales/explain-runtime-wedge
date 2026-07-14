// Durin Slice 0 — deterministic governed intake spine (Command 2).
//
// Every state-changing operation goes through the append-only hash-chained
// ledger (./ledger.ts); projections are pure folds over ledger entries, so
// a fresh session over the same backend reconstructs identical state.
// Denied actions never mutate state — they append an audit entry
// (ADMISSION_DENIED / TRANSITION_DENIED / CROSSING_DENIED) and throw.
//
// Slice 0 boundaries enforced here: no deletion execution under any input,
// no model proposals, no network, no cross-lane visibility without an
// explicit human-approved crossing, restricted_health_legal never rides
// ordinary retrieval, and unknown/mixed material fails closed to
// unsorted_holding.

import {
  DURIN_CONTRACT_VERSION,
  ORDINARY_RETRIEVAL_LANES,
  isLegalDeletionTransition,
  isLegalReviewTransition,
  isLegalSourceTransition,
  isVisibleInLane,
  mayDriveOrdinaryRetrieval,
  type Actor,
  type CorrectionTelemetry,
  type DeletionState,
  type DerivedKind,
  type DerivedRepresentation,
  type DuplicateObservation,
  type Generator,
  type IntakeEnvelope,
  type IntakeReceipt,
  type LaneCrossing,
  type PrivacyLane,
  type RouteDisposition,
  type SourceArtifact,
  type SourceState,
  type ThemeAssertion,
  type ThemeType
} from "./contracts";
import {
  validateDerivedRepresentation,
  validateDuplicateObservation,
  validateIntakeEnvelope,
  validateIntakeReceipt,
  validateRouteDisposition,
  validateSourceArtifact,
  validateThemeAssertion
} from "./guards";
import { DurinLedger, type DurinLedgerEntry, type KeyValueBackend } from "./ledger";
import { canonicalStringify, contentHashOf, sha256Hex } from "./sha256";

export const SYSTEM_ACTOR: Actor = { actorId: "durin-spine", actorType: "system" };
export const ORIGINALS_KEY_PREFIX = "durin.originals.v1.";
export const DERIVED_KEY_PREFIX = "durin.derived.v1.";

export type DurinSpineErrorCode =
  | "ENVELOPE_INVALID"
  | "HASH_MISMATCH"
  | "MISSING_ORIGINAL"
  | "ILLEGAL_TRANSITION"
  | "NON_HUMAN_AUTHORITY"
  | "RESTRICTED_SCOPE"
  | "RECORD_INVALID"
  | "UNKNOWN_RECORD"
  | "REOPEN_DIGEST_MISMATCH"
  | "DELETION_EXECUTION_REFUSED";

export class DurinSpineError extends Error {
  readonly code: DurinSpineErrorCode;
  constructor(code: DurinSpineErrorCode, message: string) {
    super(message);
    this.name = "DurinSpineError";
    this.code = code;
  }
}

export type AdmissionResult =
  | { readonly status: "admitted"; readonly artifact: SourceArtifact }
  | {
      readonly status: "duplicate";
      readonly observation: DuplicateObservation;
      readonly canonicalArtifactId: string;
    };

type Projection = {
  readonly envelopes: Map<string, IntakeEnvelope>;
  readonly artifacts: Map<string, SourceArtifact>;
  readonly derivations: Map<string, DerivedRepresentation>;
  readonly assertions: Map<string, ThemeAssertion>;
  readonly dispositions: Map<string, RouteDisposition>; // latest per artifactId
  readonly receipts: Map<string, IntakeReceipt>;
};

function assertValid(result: { valid: boolean; errors: readonly string[] }, label: string): void {
  if (!result.valid) {
    throw new DurinSpineError("RECORD_INVALID", `${label} failed contract validation: ${result.errors.join("; ")}`);
  }
}

export class DurinSpine {
  private readonly backend: KeyValueBackend;
  private readonly ledger: DurinLedger;
  private readonly clock: () => string;

  constructor(backend: KeyValueBackend, options?: { storageKey?: string; clock?: () => string }) {
    this.backend = backend;
    this.clock = options?.clock ?? (() => new Date().toISOString());
    this.ledger = new DurinLedger(backend, { storageKey: options?.storageKey, clock: this.clock });
  }

  // ---------------------------------------------------------------- ids ---

  private nextId(prefix: string): string {
    return `${prefix}-${String(this.ledger.nextSeq()).padStart(6, "0")}`;
  }

  // --------------------------------------------------------- projections ---

  // Pure fold over the ledger. `upToSeq` (exclusive) enables deterministic
  // time-travel reconstruction for receipt reopen (A10).
  private project(upToSeq?: number): Projection {
    const projection: Projection = {
      envelopes: new Map(),
      artifacts: new Map(),
      derivations: new Map(),
      assertions: new Map(),
      dispositions: new Map(),
      receipts: new Map()
    };
    for (const entry of this.ledger.all()) {
      if (upToSeq !== undefined && entry.seq >= upToSeq) break;
      switch (entry.kind) {
        case "SOURCE_RECEIVED": {
          const { envelope } = entry.payload as { envelope: IntakeEnvelope };
          projection.envelopes.set(envelope.intakeId, envelope);
          break;
        }
        case "SOURCE_PRESERVED": {
          const { artifact } = entry.payload as { artifact: SourceArtifact };
          projection.artifacts.set(artifact.artifactId, artifact);
          break;
        }
        case "SOURCE_STATE_CHANGED": {
          const payload = entry.payload as { artifactId: string; to: SourceState };
          const artifact = projection.artifacts.get(payload.artifactId);
          if (artifact) {
            projection.artifacts.set(payload.artifactId, { ...artifact, state: payload.to });
          }
          break;
        }
        case "DELETION_STATE_CHANGED": {
          const payload = entry.payload as { artifactId: string; to: DeletionState };
          const artifact = projection.artifacts.get(payload.artifactId);
          if (artifact) {
            projection.artifacts.set(payload.artifactId, { ...artifact, deletionState: payload.to });
          }
          break;
        }
        case "DERIVATION_CREATED": {
          const { derived } = entry.payload as { derived: DerivedRepresentation };
          projection.derivations.set(derived.derivedId, derived);
          break;
        }
        case "ASSERTION_PROPOSED": {
          const { assertion } = entry.payload as { assertion: ThemeAssertion };
          projection.assertions.set(assertion.assertionId, assertion);
          break;
        }
        case "ASSERTION_REVIEWED": {
          const payload = entry.payload as { assertionId: string; outcome: "approved" | "rejected" | "uncertain" };
          const assertion = projection.assertions.get(payload.assertionId);
          if (assertion) {
            projection.assertions.set(payload.assertionId, {
              ...assertion,
              reviewState: payload.outcome,
              reviewedBy: entry.actor,
              approvedForRetrieval: payload.outcome === "approved"
            });
          }
          break;
        }
        case "ASSERTION_SUPERSEDED": {
          const payload = entry.payload as { supersededAssertionId: string; replacement: ThemeAssertion };
          const old = projection.assertions.get(payload.supersededAssertionId);
          if (old) {
            projection.assertions.set(payload.supersededAssertionId, {
              ...old,
              reviewState: "superseded",
              approvedForRetrieval: false,
              supersededByAssertionId: payload.replacement.assertionId
            });
          }
          projection.assertions.set(payload.replacement.assertionId, payload.replacement);
          break;
        }
        case "ROUTE_DECIDED": {
          const { disposition } = entry.payload as { disposition: RouteDisposition };
          projection.dispositions.set(disposition.sourceArtifactId, disposition);
          break;
        }
        case "RECEIPT_ISSUED": {
          const { receipt } = entry.payload as { receipt: IntakeReceipt };
          projection.receipts.set(receipt.receiptId, receipt);
          break;
        }
        default:
          break; // audit entries and duplicates do not change state
      }
    }
    return projection;
  }

  getArtifact(artifactId: string): SourceArtifact {
    const artifact = this.project().artifacts.get(artifactId);
    if (!artifact) throw new DurinSpineError("UNKNOWN_RECORD", `unknown artifact ${artifactId}`);
    return artifact;
  }

  getAssertion(assertionId: string): ThemeAssertion {
    const assertion = this.project().assertions.get(assertionId);
    if (!assertion) throw new DurinSpineError("UNKNOWN_RECORD", `unknown assertion ${assertionId}`);
    return assertion;
  }

  dispositionFor(artifactId: string): RouteDisposition | null {
    return this.project().dispositions.get(artifactId) ?? null;
  }

  auditEntries(): readonly DurinLedgerEntry[] {
    return this.ledger
      .all()
      .filter((entry) => entry.kind === "ADMISSION_DENIED" || entry.kind === "TRANSITION_DENIED" || entry.kind === "CROSSING_DENIED");
  }

  ledgerEntries(): readonly DurinLedgerEntry[] {
    return this.ledger.all();
  }

  // ----------------------------------------------------------- admission ---

  // Idempotent admission keyed on content hash. Preserves the original
  // bytes before anything else, verifies the declared hash against the
  // actual content, and fails closed to `held` + unsorted_holding when the
  // lane is unknown or the owner asked to hold.
  admit(envelope: IntakeEnvelope, content: string): AdmissionResult {
    const guard = validateIntakeEnvelope(envelope);
    if (!guard.valid) {
      this.ledger.append(
        "ADMISSION_DENIED",
        { intakeId: String((envelope as { intakeId?: unknown }).intakeId ?? "unknown"), reason: `invalid envelope: ${guard.errors.join("; ")}` },
        SYSTEM_ACTOR
      );
      throw new DurinSpineError("ENVELOPE_INVALID", guard.errors.join("; "));
    }

    const actualHash = contentHashOf(content);
    if (actualHash !== envelope.contentHash) {
      this.ledger.append(
        "ADMISSION_DENIED",
        { intakeId: envelope.intakeId, reason: `hash mismatch: declared ${envelope.contentHash}, actual ${actualHash}` },
        SYSTEM_ACTOR
      );
      throw new DurinSpineError("HASH_MISMATCH", `declared ${envelope.contentHash} does not match actual ${actualHash}`);
    }

    const projection = this.project();
    const canonical = [...projection.artifacts.values()].find((artifact) => artifact.contentHash === envelope.contentHash);
    if (canonical) {
      const observation: DuplicateObservation = {
        contractVersion: DURIN_CONTRACT_VERSION,
        observationId: this.nextId("dup"),
        contentHash: envelope.contentHash,
        canonicalArtifactId: canonical.artifactId,
        duplicateIntakeId: envelope.intakeId,
        observedAt: this.clock(),
        action: canonical.intakeId === envelope.intakeId ? "idempotent_receipt" : "linked_duplicate"
      };
      assertValid(validateDuplicateObservation(observation), "DuplicateObservation");
      this.ledger.append("DUPLICATE_OBSERVED", { observation }, envelope.owner);
      return { status: "duplicate", observation, canonicalArtifactId: canonical.artifactId };
    }

    // Preserve the original before any state advances.
    const storageRef = `${ORIGINALS_KEY_PREFIX}${envelope.contentHash}`;
    this.backend.setItem(storageRef, content);

    this.ledger.append("SOURCE_RECEIVED", { envelope }, envelope.owner);
    const artifact: SourceArtifact = {
      contractVersion: DURIN_CONTRACT_VERSION,
      artifactId: this.nextId("artifact"),
      intakeId: envelope.intakeId,
      contentHash: envelope.contentHash,
      byteLength: new TextEncoder().encode(content).length,
      mediaType: mediaTypeFor(envelope),
      originalFilename: envelope.sourceUri.split("/").pop() ?? envelope.sourceUri,
      storageRef,
      preservedAt: this.clock(),
      state: "preserved",
      deletionState: "not_requested",
      isOriginal: true
    };
    assertValid(validateSourceArtifact(artifact), "SourceArtifact");
    this.ledger.append("SOURCE_PRESERVED", { artifact }, SYSTEM_ACTOR);

    // Fail-closed holding: unknown or mixed material never gets a guessed
    // destination. It rests in `held` with an unsorted_holding disposition
    // until a human routes it through held -> reviewed -> admitted.
    if (envelope.privacyHint === null || envelope.requestedAction === "hold") {
      this.ledger.append(
        "SOURCE_STATE_CHANGED",
        { artifactId: artifact.artifactId, from: "preserved", to: "held", reason: "fail-closed: lane unknown or hold requested" },
        SYSTEM_ACTOR
      );
      const holding: RouteDisposition = {
        contractVersion: DURIN_CONTRACT_VERSION,
        dispositionId: this.nextId("disp"),
        intakeId: envelope.intakeId,
        sourceArtifactId: artifact.artifactId,
        lane: "unsorted_holding",
        authority: SYSTEM_ACTOR,
        reason: "fail-closed holding: unknown or mixed material is never routed to a guessed destination",
        deletionState: "not_requested",
        approvedCrossings: [],
        unresolvedQuestions: ["destination lane unconfirmed; requires human review"],
        decidedAt: this.clock()
      };
      assertValid(validateRouteDisposition(holding), "RouteDisposition");
      this.ledger.append("ROUTE_DECIDED", { disposition: holding }, SYSTEM_ACTOR);
      return { status: "admitted", artifact: { ...artifact, state: "held" } };
    }

    return { status: "admitted", artifact };
  }

  originalContent(artifactId: string): string {
    const artifact = this.getArtifact(artifactId);
    const content = this.backend.getItem(artifact.storageRef);
    if (content === null) {
      throw new DurinSpineError("MISSING_ORIGINAL", `original for ${artifactId} missing at ${artifact.storageRef}`);
    }
    return content;
  }

  // ---------------------------------------------------------- derivation ---

  derive(artifactId: string, kind: DerivedKind, content: string, generator: Generator, actor: Actor): DerivedRepresentation {
    const artifact = this.getArtifact(artifactId);
    // The original must still be present and intact before deriving.
    const original = this.backend.getItem(artifact.storageRef);
    if (original === null) {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: artifactId, machine: "source", from: artifact.state, to: "derived", reason: "missing original: preservation path broken" },
        SYSTEM_ACTOR
      );
      throw new DurinSpineError("MISSING_ORIGINAL", `cannot derive: original missing at ${artifact.storageRef}`);
    }
    if (contentHashOf(original) !== artifact.contentHash) {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: artifactId, machine: "source", from: artifact.state, to: "derived", reason: "stored original no longer matches its admission hash" },
        SYSTEM_ACTOR
      );
      throw new DurinSpineError("HASH_MISMATCH", `stored original for ${artifactId} no longer matches its admission hash`);
    }
    if (artifact.state !== "preserved" && artifact.state !== "derived" && artifact.state !== "held") {
      this.denyAndThrowSourceTransition(artifactId, artifact.state, "derived", "derivation is only legal before review completes");
    }

    const derivedHash = contentHashOf(content);
    const storageRef = `${DERIVED_KEY_PREFIX}${derivedHash}`;
    this.backend.setItem(storageRef, content);
    const derived: DerivedRepresentation = {
      contractVersion: DURIN_CONTRACT_VERSION,
      derivedId: this.nextId("derived"),
      sourceArtifactId: artifactId,
      kind,
      generator,
      contentHash: derivedHash,
      createdAt: this.clock(),
      storageRef,
      isOriginal: false
    };
    assertValid(validateDerivedRepresentation(derived), "DerivedRepresentation");
    this.ledger.append("DERIVATION_CREATED", { derived }, actor);
    if (artifact.state === "preserved") {
      this.ledger.append(
        "SOURCE_STATE_CHANGED",
        { artifactId, from: "preserved", to: "derived", reason: `first derivation ${derived.derivedId}` },
        SYSTEM_ACTOR
      );
    }
    return derived;
  }

  // -------------------------------------------------------------- review ---

  proposeAssertion(input: {
    readonly sourceArtifactId: string;
    readonly derivedRepresentationId: string | null;
    readonly themeType: ThemeType;
    readonly value: string;
    readonly confidence: number;
    readonly evidencePointer: string;
    readonly generator: Generator;
    readonly privacyScope: PrivacyLane;
  }): ThemeAssertion {
    this.getArtifact(input.sourceArtifactId);
    const assertion: ThemeAssertion = {
      contractVersion: DURIN_CONTRACT_VERSION,
      assertionId: this.nextId("assert"),
      ...input,
      reviewState: "proposed",
      reviewedBy: null,
      approvedForRetrieval: false,
      assertedAt: this.clock(),
      supersedesAssertionId: null,
      supersededByAssertionId: null
    };
    assertValid(validateThemeAssertion(assertion), "ThemeAssertion");
    this.ledger.append("ASSERTION_PROPOSED", { assertion }, SYSTEM_ACTOR);
    return assertion;
  }

  reviewAssertion(assertionId: string, outcome: "approved" | "rejected" | "uncertain", actor: Actor): ThemeAssertion {
    if (actor.actorType !== "human") {
      throw new DurinSpineError("NON_HUMAN_AUTHORITY", "only a human may review a theme assertion");
    }
    const assertion = this.getAssertion(assertionId);
    if (!isLegalReviewTransition(assertion.reviewState, outcome)) {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: assertionId, machine: "review", from: assertion.reviewState, to: outcome, reason: "illegal review transition" },
        actor
      );
      throw new DurinSpineError("ILLEGAL_TRANSITION", `review ${assertion.reviewState} -> ${outcome} is not legal`);
    }
    this.ledger.append("ASSERTION_REVIEWED", { assertionId, outcome }, actor);
    return this.getAssertion(assertionId);
  }

  // Correction by supersession (A8): the old assertion is preserved as
  // `superseded`, the replacement enters as `corrected` (a human then
  // approves it for retrieval), and telemetry records why.
  correctAssertion(
    assertionId: string,
    replacementFields: {
      readonly themeType?: ThemeType;
      readonly value: string;
      readonly confidence: number;
      readonly evidencePointer: string;
      readonly privacyScope?: PrivacyLane;
    },
    reason: string,
    cause: CorrectionTelemetry["cause"],
    actor: Actor
  ): { readonly replacement: ThemeAssertion; readonly telemetry: CorrectionTelemetry } {
    if (actor.actorType !== "human") {
      throw new DurinSpineError("NON_HUMAN_AUTHORITY", "only a human may correct a theme assertion");
    }
    const old = this.getAssertion(assertionId);
    if (!isLegalReviewTransition(old.reviewState, "superseded")) {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: assertionId, machine: "review", from: old.reviewState, to: "superseded", reason: "illegal supersession" },
        actor
      );
      throw new DurinSpineError("ILLEGAL_TRANSITION", `review ${old.reviewState} -> superseded is not legal`);
    }
    const replacement: ThemeAssertion = {
      contractVersion: DURIN_CONTRACT_VERSION,
      assertionId: this.nextId("assert"),
      sourceArtifactId: old.sourceArtifactId,
      derivedRepresentationId: old.derivedRepresentationId,
      themeType: replacementFields.themeType ?? old.themeType,
      value: replacementFields.value,
      confidence: replacementFields.confidence,
      evidencePointer: replacementFields.evidencePointer,
      generator: { name: "manual-correction", version: DURIN_CONTRACT_VERSION, method: "human_manual" },
      reviewState: "corrected",
      reviewedBy: actor,
      approvedForRetrieval: false,
      privacyScope: replacementFields.privacyScope ?? old.privacyScope,
      assertedAt: this.clock(),
      supersedesAssertionId: assertionId,
      supersededByAssertionId: null
    };
    assertValid(validateThemeAssertion(replacement), "ThemeAssertion");
    const telemetry: CorrectionTelemetry = {
      contractVersion: DURIN_CONTRACT_VERSION,
      telemetryId: this.nextId("telemetry"),
      supersededAssertionId: assertionId,
      supersedingAssertionId: replacement.assertionId,
      reason,
      cause,
      correctedBy: actor,
      correctedAt: this.clock()
    };
    this.ledger.append("ASSERTION_SUPERSEDED", { supersededAssertionId: assertionId, replacement, telemetry }, actor);
    return { replacement, telemetry };
  }

  // ---------------------------------------------------- source lifecycle ---

  private denyAndThrowSourceTransition(artifactId: string, from: SourceState, to: SourceState, reason: string): never {
    this.ledger.append("TRANSITION_DENIED", { subjectId: artifactId, machine: "source", from, to, reason }, SYSTEM_ACTOR);
    throw new DurinSpineError("ILLEGAL_TRANSITION", `source ${from} -> ${to} denied: ${reason}`);
  }

  transitionSource(artifactId: string, to: SourceState, actor: Actor, reason: string): SourceArtifact {
    const artifact = this.getArtifact(artifactId);
    if (!isLegalSourceTransition(artifact.state, to)) {
      this.denyAndThrowSourceTransition(artifactId, artifact.state, to, "illegal source transition");
    }
    this.ledger.append("SOURCE_STATE_CHANGED", { artifactId, from: artifact.state, to, reason }, actor);
    return this.getArtifact(artifactId);
  }

  // ------------------------------------------------------------- routing ---

  route(
    artifactId: string,
    lane: PrivacyLane,
    actor: Actor,
    reason: string,
    approvedCrossings: readonly LaneCrossing[] = []
  ): RouteDisposition {
    if (actor.actorType !== "human") {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: artifactId, machine: "source", from: "admitted", to: "routed", reason: "routing authority must be human" },
        actor
      );
      throw new DurinSpineError("NON_HUMAN_AUTHORITY", "only a human may route a source to a lane");
    }
    const artifact = this.getArtifact(artifactId);
    if (artifact.state !== "admitted") {
      this.denyAndThrowSourceTransition(artifactId, artifact.state, "routed", "only an admitted source may be routed");
    }
    const disposition: RouteDisposition = {
      contractVersion: DURIN_CONTRACT_VERSION,
      dispositionId: this.nextId("disp"),
      intakeId: artifact.intakeId,
      sourceArtifactId: artifactId,
      lane,
      authority: actor,
      reason,
      deletionState: artifact.deletionState,
      approvedCrossings,
      unresolvedQuestions: [],
      decidedAt: this.clock()
    };
    assertValid(validateRouteDisposition(disposition), "RouteDisposition");
    this.ledger.append("ROUTE_DECIDED", { disposition }, actor);
    this.ledger.append("SOURCE_STATE_CHANGED", { artifactId, from: "admitted", to: "routed", reason: `routed to ${lane}` }, actor);
    return disposition;
  }

  // ------------------------------------------------------------ deletion ---

  private changeDeletionState(artifactId: string, to: DeletionState, actor: Actor, reason: string): SourceArtifact {
    if (actor.actorType !== "human") {
      throw new DurinSpineError("NON_HUMAN_AUTHORITY", "deletion state changes require an explicit human action");
    }
    const artifact = this.getArtifact(artifactId);
    if (!isLegalDeletionTransition(artifact.deletionState, to)) {
      this.ledger.append(
        "TRANSITION_DENIED",
        { subjectId: artifactId, machine: "deletion", from: artifact.deletionState, to, reason: "illegal deletion transition" },
        actor
      );
      throw new DurinSpineError("ILLEGAL_TRANSITION", `deletion ${artifact.deletionState} -> ${to} is not legal`);
    }
    this.ledger.append("DELETION_STATE_CHANGED", { artifactId, from: artifact.deletionState, to, reason }, actor);
    return this.getArtifact(artifactId);
  }

  requestDeletion(artifactId: string, actor: Actor, reason: string): SourceArtifact {
    return this.changeDeletionState(artifactId, "requested", actor, reason);
  }

  approveDeletion(artifactId: string, actor: Actor, reason: string): SourceArtifact {
    return this.changeDeletionState(artifactId, "approved", actor, reason);
  }

  denyDeletion(artifactId: string, actor: Actor, reason: string): SourceArtifact {
    return this.changeDeletionState(artifactId, "denied", actor, reason);
  }

  // Slice 0 authorizes NO deletion execution, ever — not even after an
  // approved request. The refusal itself is audited (A9).
  executeDeletion(artifactId: string, actor: Actor): never {
    const artifact = this.getArtifact(artifactId);
    this.ledger.append(
      "TRANSITION_DENIED",
      {
        subjectId: artifactId,
        machine: "deletion",
        from: artifact.deletionState,
        to: "executed",
        reason: "Slice 0 authorizes no deletion execution; originals are preserved"
      },
      actor
    );
    throw new DurinSpineError("DELETION_EXECUTION_REFUSED", "Slice 0 authorizes no deletion execution; the original is preserved");
  }

  // ------------------------------------------------------------ receipts ---

  private receiptRecords(intakeId: string, upToSeq?: number) {
    const projection = this.project(upToSeq);
    const envelope = projection.envelopes.get(intakeId);
    if (!envelope) throw new DurinSpineError("UNKNOWN_RECORD", `unknown intake ${intakeId}`);
    const artifact = [...projection.artifacts.values()].find((candidate) => candidate.intakeId === intakeId);
    if (!artifact) throw new DurinSpineError("UNKNOWN_RECORD", `no artifact for intake ${intakeId}`);
    const derivations = [...projection.derivations.values()]
      .filter((derived) => derived.sourceArtifactId === artifact.artifactId)
      .sort((a, b) => a.derivedId.localeCompare(b.derivedId));
    const assertions = [...projection.assertions.values()]
      .filter((assertion) => assertion.sourceArtifactId === artifact.artifactId)
      .sort((a, b) => a.assertionId.localeCompare(b.assertionId));
    const disposition = projection.dispositions.get(artifact.artifactId) ?? null;
    return { envelope, artifact, derivations, assertions, disposition };
  }

  private reopenDigestFor(records: ReturnType<DurinSpine["receiptRecords"]>): string {
    return `sha256:${sha256Hex(canonicalStringify(records))}`;
  }

  issueReceipt(intakeId: string, actor: Actor): IntakeReceipt {
    const records = this.receiptRecords(intakeId);
    const { envelope, artifact, derivations, assertions, disposition } = records;
    if (!disposition) {
      throw new DurinSpineError("UNKNOWN_RECORD", `intake ${intakeId} has no route disposition; nothing to receipt`);
    }
    const receipt: IntakeReceipt = {
      contractVersion: DURIN_CONTRACT_VERSION,
      receiptId: this.nextId("receipt"),
      intakeId,
      createdAt: this.clock(),
      whatEntered: {
        sourceArtifactId: artifact.artifactId,
        sourceType: envelope.sourceType,
        contentHash: artifact.contentHash
      },
      whatWasDerived: derivations.map((derived) => derived.derivedId),
      whatWasApproved: assertions.filter((a) => a.reviewState === "approved").map((a) => a.assertionId),
      whatWasRejectedOrHeld: [
        ...assertions
          .filter((a) => a.reviewState === "rejected" || a.reviewState === "uncertain" || a.reviewState === "superseded")
          .map((a) => a.assertionId),
        ...(artifact.state === "held" ? [artifact.artifactId] : [])
      ],
      whatRemainedPrivate: disposition.approvedCrossings.length === 0 ? [artifact.artifactId] : [],
      routedTo: disposition.lane,
      dispositionId: disposition.dispositionId,
      sourceState: artifact.state,
      deletionState: artifact.deletionState,
      // Digest over the canonical serialization of every record above; the
      // ledger seq at which the receipt is issued makes reopen replay to
      // exactly this point (A10).
      reopenDigest: this.reopenDigestFor(records)
    };
    assertValid(validateIntakeReceipt(receipt), "IntakeReceipt");
    this.ledger.append("RECEIPT_ISSUED", { receipt }, actor);
    return receipt;
  }

  // Deterministic reopen (A10): replay the ledger up to the receipt's own
  // entry, rebuild the exact records, and verify the digest. Any drift —
  // corrupted reference, tampered payload, wrong ledger — fails closed.
  reopenReceipt(receiptId: string): {
    readonly receipt: IntakeReceipt;
    readonly records: ReturnType<DurinSpine["receiptRecords"]>;
  } {
    const entry = this.ledger
      .ofKind("RECEIPT_ISSUED")
      .find((candidate) => (candidate.payload as { receipt: IntakeReceipt }).receipt.receiptId === receiptId);
    if (!entry) throw new DurinSpineError("UNKNOWN_RECORD", `unknown receipt ${receiptId}`);
    const receipt = (entry.payload as { receipt: IntakeReceipt }).receipt;
    const records = this.receiptRecords(receipt.intakeId, entry.seq);
    const digest = this.reopenDigestFor(records);
    if (digest !== receipt.reopenDigest) {
      throw new DurinSpineError(
        "REOPEN_DIGEST_MISMATCH",
        `receipt ${receiptId} does not deterministically reconstruct: expected ${receipt.reopenDigest}, got ${digest}`
      );
    }
    return { receipt, records };
  }

  // ----------------------------------------------------------- retrieval ---

  // Ordinary retrieval enforcement (A3, A6). Full meaning retrieval with
  // explanations is Command 4; this is the lane gate everything must pass.
  queryAssertions(queryLane: PrivacyLane, actor: Actor): readonly ThemeAssertion[] {
    if (!ORDINARY_RETRIEVAL_LANES.includes(queryLane)) {
      throw new DurinSpineError(
        "RESTRICTED_SCOPE",
        `${queryLane} is not an ordinary retrieval scope; restricted access requires explicit scope (not in Slice 0 Command 2)`
      );
    }
    const projection = this.project();
    const visible: ThemeAssertion[] = [];
    for (const assertion of projection.assertions.values()) {
      if (!mayDriveOrdinaryRetrieval(assertion)) continue;
      const artifact = projection.artifacts.get(assertion.sourceArtifactId);
      if (!artifact || (artifact.state !== "admitted" && artifact.state !== "routed" && artifact.state !== "archived")) continue;
      const disposition = projection.dispositions.get(assertion.sourceArtifactId);
      const crossings = disposition?.approvedCrossings ?? [];
      if (!isVisibleInLane(assertion.privacyScope, queryLane, crossings)) {
        this.ledger.append(
          "CROSSING_DENIED",
          {
            artifactId: assertion.sourceArtifactId,
            recordLane: assertion.privacyScope,
            queryLane,
            reason: "no approved crossing; lanes are closed by default"
          },
          actor
        );
        continue;
      }
      visible.push(assertion);
    }
    return visible;
  }
}

function mediaTypeFor(envelope: IntakeEnvelope): string {
  switch (envelope.sourceType) {
    case "audio_recording":
      return "audio/mp4";
    case "text_note_export":
      return "text/plain";
    case "pdf_scan":
      return "application/pdf";
    case "family_photo":
    case "object_photo":
      return "image/jpeg";
  }
}
