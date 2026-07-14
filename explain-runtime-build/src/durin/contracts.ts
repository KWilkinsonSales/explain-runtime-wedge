// Durin Multimodal Theme Intake — Slice 0 contract pack.
//
// Governing authorities:
//   - Slice 0 Build Authorization (Notion 39d8ac7fc2f181aa8a69c1fbd83b686b)
//   - Historical Audio Intake Sweep Lock (Notion 39d8ac7fc2f181c285fee513b4777152)
//   - Google Drive build mirror (doc 1QFJC_Q6ipgh-qzTZ56YWmlGlowWV9qno0ltUsrzAxXk)
//
// These types are the single source of truth for Slice 0 objects. The JSON
// schemas under ./schemas mirror them field-for-field, and the fixture
// manifests under ./fixtures must validate against them. State enums are
// LOCKED by the build authorization: changing a member is a governed
// decision, not a refactor.

export const DURIN_CONTRACT_VERSION = "0.1.0";
export type DurinContractVersion = typeof DURIN_CONTRACT_VERSION;

// ---------------------------------------------------------------------------
// Locked enumerations
// ---------------------------------------------------------------------------

export const SOURCE_STATES = [
  "received",
  "preserved",
  "derived",
  "reviewed",
  "admitted",
  "routed",
  "archived",
  "held",
  "rejected"
] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export const REVIEW_STATES = [
  "proposed",
  "approved",
  "corrected",
  "rejected",
  "uncertain",
  "superseded"
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const DELETION_STATES = [
  "not_requested",
  "requested",
  "approved",
  "executed",
  "denied"
] as const;
export type DeletionState = (typeof DELETION_STATES)[number];

export const PRIVACY_LANES = [
  "adl_business",
  "private_journal",
  "family_memory",
  "faith_study",
  "object_archive",
  "unsorted_holding",
  "restricted_health_legal"
] as const;
export type PrivacyLane = (typeof PRIVACY_LANES)[number];

export const SOURCE_TYPES = [
  "audio_recording",
  "text_note_export",
  "pdf_scan",
  "family_photo",
  "object_photo"
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// Theme model v0 dimensions, per the build authorization.
export const THEME_TYPES = [
  "person",
  "relationship",
  "event_life_chapter",
  "place_time",
  "object",
  "activity",
  "emotion_atmosphere",
  "story_memory",
  "purpose_intended_use",
  "project",
  "provenance",
  "privacy"
] as const;
export type ThemeType = (typeof THEME_TYPES)[number];

export const DERIVED_KINDS = [
  "transcript",
  "extracted_text",
  "thumbnail",
  "description",
  "normalized_metadata"
] as const;
export type DerivedKind = (typeof DERIVED_KINDS)[number];

// ---------------------------------------------------------------------------
// Legal state transitions (contract-level; the Command 2 spine enforces them)
// ---------------------------------------------------------------------------

// Sources move forward through the governed loop. `held` is the fail-closed
// resting state for unknown/mixed content and may re-enter review. There is
// deliberately NO transition out of `rejected` and NO transition anywhere
// that implies deletion — deletion is a separate DeletionState machine.
export const SOURCE_TRANSITIONS: Readonly<Record<SourceState, readonly SourceState[]>> = {
  received: ["preserved", "held", "rejected"],
  preserved: ["derived", "held", "rejected"],
  derived: ["reviewed", "held"],
  reviewed: ["admitted", "held", "rejected"],
  admitted: ["routed"],
  routed: ["archived"],
  archived: [],
  held: ["reviewed", "rejected"],
  rejected: []
};

// Review moves from proposed toward a terminal disposition. A correction is
// modeled as: old assertion -> superseded, new assertion enters at
// corrected/approved. Nothing ever leaves `superseded` or `rejected`.
export const REVIEW_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> = {
  proposed: ["approved", "corrected", "rejected", "uncertain"],
  approved: ["superseded"],
  corrected: ["approved", "superseded"],
  rejected: [],
  uncertain: ["approved", "corrected", "rejected"],
  superseded: []
};

// Deletion is closed by default and requires explicit human escalation at
// every step. `executed` is terminal; `denied` may be re-requested.
export const DELETION_TRANSITIONS: Readonly<Record<DeletionState, readonly DeletionState[]>> = {
  not_requested: ["requested"],
  requested: ["approved", "denied"],
  approved: ["executed"],
  executed: [],
  denied: ["requested"]
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

// sha-256 lowercase hex. Slice 0 uses content hashes for integrity and
// duplicate detection, never as a privacy mechanism.
export type ContentHash = string;
export const CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export type IsoTimestamp = string;

export type Actor = {
  readonly actorId: string;
  readonly actorType: "human" | "system";
};

export type Generator = {
  readonly name: string;
  readonly version: string;
  // "human_manual" and "deterministic_rule" are the only methods allowed in
  // Slice 0 Commands 1–3; "model_proposal" arrives (behind review) in
  // Command 4 and is never allowed to approve, route, cross, or delete.
  readonly method: "human_manual" | "deterministic_rule" | "model_proposal";
};

// An approved abstraction crossing between lanes. The underlying private
// source never moves; only an explicitly approved theme-level abstraction is
// visible across the boundary.
export type LaneCrossing = {
  readonly fromLane: PrivacyLane;
  readonly toLane: PrivacyLane;
  readonly approvedBy: Actor;
  readonly reason: string;
  readonly approvedAt: IsoTimestamp;
};

// ---------------------------------------------------------------------------
// Core objects
// ---------------------------------------------------------------------------

export type IntakeEnvelope = {
  readonly contractVersion: DurinContractVersion;
  readonly intakeId: string;
  readonly sourceType: SourceType;
  readonly sourceUri: string;
  readonly capturedAt: IsoTimestamp | null;
  readonly receivedAt: IsoTimestamp;
  readonly contentHash: ContentHash;
  readonly owner: Actor;
  // A hint only. Routing authority stays with the human review step; a null
  // hint (or any doubt) fails closed to unsorted_holding.
  readonly privacyHint: PrivacyLane | null;
  readonly requestedAction: "admit" | "hold";
  readonly rawPreserved: boolean;
};

// Immutable reference to the original bytes (or the authoritative export).
// No silent alteration: any processing output is a DerivedRepresentation.
export type SourceArtifact = {
  readonly contractVersion: DurinContractVersion;
  readonly artifactId: string;
  readonly intakeId: string;
  readonly contentHash: ContentHash;
  readonly byteLength: number;
  readonly mediaType: string;
  readonly originalFilename: string;
  readonly storageRef: string;
  readonly preservedAt: IsoTimestamp;
  readonly state: SourceState;
  readonly deletionState: DeletionState;
  // Literal marker so a derived record can never satisfy this type.
  readonly isOriginal: true;
};

export type DerivedRepresentation = {
  readonly contractVersion: DurinContractVersion;
  readonly derivedId: string;
  readonly sourceArtifactId: string;
  readonly kind: DerivedKind;
  readonly generator: Generator;
  readonly contentHash: ContentHash;
  readonly createdAt: IsoTimestamp;
  readonly storageRef: string;
  // Literal marker: derived outputs cannot masquerade as originals (A2).
  readonly isOriginal: false;
};

export type ThemeAssertion = {
  readonly contractVersion: DurinContractVersion;
  readonly assertionId: string;
  readonly sourceArtifactId: string;
  readonly derivedRepresentationId: string | null;
  readonly themeType: ThemeType;
  readonly value: string;
  readonly confidence: number; // 0..1
  // Where in the source/derivation the evidence lives (offset, region, page,
  // timecode, or "manual:<note>" for human-entered assertions).
  readonly evidencePointer: string;
  readonly generator: Generator;
  readonly reviewState: ReviewState;
  readonly reviewedBy: Actor | null;
  readonly approvedForRetrieval: boolean;
  readonly privacyScope: PrivacyLane;
  readonly assertedAt: IsoTimestamp;
  // Append-only history: corrections link, they never overwrite (A8).
  readonly supersedesAssertionId: string | null;
  readonly supersededByAssertionId: string | null;
};

export type RouteDisposition = {
  readonly contractVersion: DurinContractVersion;
  readonly dispositionId: string;
  readonly intakeId: string;
  readonly sourceArtifactId: string;
  readonly lane: PrivacyLane;
  readonly authority: Actor;
  readonly reason: string;
  readonly deletionState: DeletionState;
  // Closed by default: an empty list means no cross-lane visibility at all.
  readonly approvedCrossings: readonly LaneCrossing[];
  readonly unresolvedQuestions: readonly string[];
  readonly decidedAt: IsoTimestamp;
};

export type IntakeReceipt = {
  readonly contractVersion: DurinContractVersion;
  readonly receiptId: string;
  readonly intakeId: string;
  readonly createdAt: IsoTimestamp;
  readonly whatEntered: {
    readonly sourceArtifactId: string;
    readonly sourceType: SourceType;
    readonly contentHash: ContentHash;
  };
  readonly whatWasDerived: readonly string[]; // DerivedRepresentation ids
  readonly whatWasApproved: readonly string[]; // approved ThemeAssertion ids
  readonly whatWasRejectedOrHeld: readonly string[]; // assertion/source ids
  readonly whatRemainedPrivate: readonly string[]; // ids never visible outside their lane
  readonly routedTo: PrivacyLane;
  readonly dispositionId: string;
  readonly sourceState: SourceState;
  readonly deletionState: DeletionState;
  // Digest over the canonical serialization of every record above, so a
  // fresh session can reopen the receipt and prove it reconstructs the same
  // records (A10).
  readonly reopenDigest: ContentHash;
};

export type CorrectionTelemetry = {
  readonly contractVersion: DurinContractVersion;
  readonly telemetryId: string;
  readonly supersededAssertionId: string;
  readonly supersedingAssertionId: string;
  readonly reason: string;
  readonly cause:
    | "wrong_person"
    | "wrong_relationship"
    | "wrong_theme_value"
    | "wrong_lane_scope"
    | "low_confidence_resolved"
    | "other";
  readonly correctedBy: Actor;
  readonly correctedAt: IsoTimestamp;
};

export type DuplicateObservation = {
  readonly contractVersion: DurinContractVersion;
  readonly observationId: string;
  readonly contentHash: ContentHash;
  // The one canonical artifact this duplicate resolves to. Re-import never
  // creates a second canonical SourceArtifact (A7).
  readonly canonicalArtifactId: string;
  readonly duplicateIntakeId: string;
  readonly observedAt: IsoTimestamp;
  readonly action: "idempotent_receipt" | "linked_duplicate";
};

// ---------------------------------------------------------------------------
// Lane visibility policy (pure contract rule; storage enforcement is Command 2)
// ---------------------------------------------------------------------------

// Retrieval scopes that "ordinary" queries may use. restricted_health_legal
// is NEVER an ordinary scope: it requires explicit scope selection (A6).
export const ORDINARY_RETRIEVAL_LANES: readonly PrivacyLane[] = [
  "adl_business",
  "private_journal",
  "family_memory",
  "faith_study",
  "object_archive",
  "unsorted_holding"
];

// Whether a record whose privacy scope is `recordLane` may surface in a
// query scoped to `queryLane`. Closed by default; the only opening is an
// explicitly approved crossing from the record's lane to the query's lane.
export function isVisibleInLane(
  recordLane: PrivacyLane,
  queryLane: PrivacyLane,
  approvedCrossings: readonly LaneCrossing[]
): boolean {
  if (recordLane === queryLane) return true;
  return approvedCrossings.some(
    (crossing) => crossing.fromLane === recordLane && crossing.toLane === queryLane
  );
}

// Whether an assertion may drive ordinary retrieval at all: it must be
// approved, marked retrievable, and not superseded/rejected (A4), and
// restricted material never rides an ordinary query (A6).
export function mayDriveOrdinaryRetrieval(assertion: ThemeAssertion): boolean {
  return (
    assertion.approvedForRetrieval &&
    assertion.reviewState === "approved" &&
    assertion.privacyScope !== "restricted_health_legal"
  );
}

export function isLegalSourceTransition(from: SourceState, to: SourceState): boolean {
  return SOURCE_TRANSITIONS[from].includes(to);
}

export function isLegalReviewTransition(from: ReviewState, to: ReviewState): boolean {
  return REVIEW_TRANSITIONS[from].includes(to);
}

export function isLegalDeletionTransition(from: DeletionState, to: DeletionState): boolean {
  return DELETION_TRANSITIONS[from].includes(to);
}
