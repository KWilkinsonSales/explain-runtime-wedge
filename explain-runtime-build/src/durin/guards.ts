// Deterministic, dependency-free runtime validators for the Slice 0
// contracts. Each guard mirrors its JSON schema under ./schemas and returns
// the full error list rather than throwing, so fixtures and (later) the
// intake spine can report every violation at once.

import {
  CONTENT_HASH_PATTERN,
  DELETION_STATES,
  DERIVED_KINDS,
  DURIN_CONTRACT_VERSION,
  PRIVACY_LANES,
  REVIEW_STATES,
  SOURCE_STATES,
  SOURCE_TYPES,
  THEME_TYPES
} from "./contracts";

export type GuardResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ok(errors: string[]): GuardResult {
  return { valid: errors.length === 0, errors };
}

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function checkString(raw: Raw, field: string, errors: string[], opts?: { nonEmpty?: boolean }): void {
  const value = raw[field];
  if (typeof value !== "string") {
    errors.push(`${field}: expected string, got ${typeof value}`);
    return;
  }
  if (opts?.nonEmpty && value.trim().length === 0) {
    errors.push(`${field}: must be non-empty`);
  }
}

function checkTimestamp(raw: Raw, field: string, errors: string[], nullable = false): void {
  const value = raw[field];
  if (nullable && value === null) return;
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) {
    errors.push(`${field}: expected ISO-8601 timestamp`);
  }
}

function checkHash(raw: Raw, field: string, errors: string[]): void {
  const value = raw[field];
  if (typeof value !== "string" || !CONTENT_HASH_PATTERN.test(value)) {
    errors.push(`${field}: expected "sha256:<64 hex chars>"`);
  }
}

function checkEnum(raw: Raw, field: string, allowed: readonly string[], errors: string[], nullable = false): void {
  const value = raw[field];
  if (nullable && value === null) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${field}: expected one of [${allowed.join(", ")}], got ${JSON.stringify(value)}`);
  }
}

function checkVersion(raw: Raw, errors: string[]): void {
  if (raw["contractVersion"] !== DURIN_CONTRACT_VERSION) {
    errors.push(`contractVersion: expected "${DURIN_CONTRACT_VERSION}"`);
  }
}

function checkActor(value: unknown, field: string, errors: string[], nullable = false): void {
  if (nullable && value === null) return;
  if (!isRecord(value)) {
    errors.push(`${field}: expected actor object`);
    return;
  }
  if (typeof value["actorId"] !== "string" || value["actorId"].trim().length === 0) {
    errors.push(`${field}.actorId: must be non-empty string`);
  }
  if (value["actorType"] !== "human" && value["actorType"] !== "system") {
    errors.push(`${field}.actorType: expected "human" | "system"`);
  }
}

function checkGenerator(value: unknown, field: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${field}: expected generator object`);
    return;
  }
  if (typeof value["name"] !== "string" || value["name"].trim().length === 0) {
    errors.push(`${field}.name: must be non-empty string`);
  }
  if (typeof value["version"] !== "string" || value["version"].trim().length === 0) {
    errors.push(`${field}.version: must be non-empty string`);
  }
  const method = value["method"];
  if (method !== "human_manual" && method !== "deterministic_rule" && method !== "model_proposal") {
    errors.push(`${field}.method: expected human_manual | deterministic_rule | model_proposal`);
  }
}

function checkStringArray(raw: Raw, field: string, errors: string[]): void {
  const value = raw[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${field}: expected string array`);
  }
}

export function validateIntakeEnvelope(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["IntakeEnvelope: expected object"]);
  checkVersion(input, errors);
  checkString(input, "intakeId", errors, { nonEmpty: true });
  checkEnum(input, "sourceType", SOURCE_TYPES, errors);
  checkString(input, "sourceUri", errors, { nonEmpty: true });
  checkTimestamp(input, "capturedAt", errors, true);
  checkTimestamp(input, "receivedAt", errors);
  checkHash(input, "contentHash", errors);
  checkActor(input["owner"], "owner", errors);
  checkEnum(input, "privacyHint", PRIVACY_LANES, errors, true);
  checkEnum(input, "requestedAction", ["admit", "hold"], errors);
  if (typeof input["rawPreserved"] !== "boolean") {
    errors.push("rawPreserved: expected boolean");
  }
  return ok(errors);
}

export function validateSourceArtifact(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["SourceArtifact: expected object"]);
  checkVersion(input, errors);
  checkString(input, "artifactId", errors, { nonEmpty: true });
  checkString(input, "intakeId", errors, { nonEmpty: true });
  checkHash(input, "contentHash", errors);
  if (typeof input["byteLength"] !== "number" || input["byteLength"] < 0 || !Number.isInteger(input["byteLength"])) {
    errors.push("byteLength: expected non-negative integer");
  }
  checkString(input, "mediaType", errors, { nonEmpty: true });
  checkString(input, "originalFilename", errors, { nonEmpty: true });
  checkString(input, "storageRef", errors, { nonEmpty: true });
  checkTimestamp(input, "preservedAt", errors);
  checkEnum(input, "state", SOURCE_STATES, errors);
  checkEnum(input, "deletionState", DELETION_STATES, errors);
  if (input["isOriginal"] !== true) {
    errors.push("isOriginal: SourceArtifact must have isOriginal === true");
  }
  return ok(errors);
}

export function validateDerivedRepresentation(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["DerivedRepresentation: expected object"]);
  checkVersion(input, errors);
  checkString(input, "derivedId", errors, { nonEmpty: true });
  checkString(input, "sourceArtifactId", errors, { nonEmpty: true });
  checkEnum(input, "kind", DERIVED_KINDS, errors);
  checkGenerator(input["generator"], "generator", errors);
  checkHash(input, "contentHash", errors);
  checkTimestamp(input, "createdAt", errors);
  checkString(input, "storageRef", errors, { nonEmpty: true });
  if (input["isOriginal"] !== false) {
    errors.push("isOriginal: DerivedRepresentation must have isOriginal === false");
  }
  return ok(errors);
}

export function validateThemeAssertion(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["ThemeAssertion: expected object"]);
  checkVersion(input, errors);
  checkString(input, "assertionId", errors, { nonEmpty: true });
  checkString(input, "sourceArtifactId", errors, { nonEmpty: true });
  const derivedRef = input["derivedRepresentationId"];
  if (derivedRef !== null && typeof derivedRef !== "string") {
    errors.push("derivedRepresentationId: expected string or null");
  }
  checkEnum(input, "themeType", THEME_TYPES, errors);
  checkString(input, "value", errors, { nonEmpty: true });
  const confidence = input["confidence"];
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    errors.push("confidence: expected number in [0, 1]");
  }
  checkString(input, "evidencePointer", errors, { nonEmpty: true });
  checkGenerator(input["generator"], "generator", errors);
  checkEnum(input, "reviewState", REVIEW_STATES, errors);
  checkActor(input["reviewedBy"], "reviewedBy", errors, true);
  if (typeof input["approvedForRetrieval"] !== "boolean") {
    errors.push("approvedForRetrieval: expected boolean");
  }
  checkEnum(input, "privacyScope", PRIVACY_LANES, errors);
  checkTimestamp(input, "assertedAt", errors);
  for (const link of ["supersedesAssertionId", "supersededByAssertionId"] as const) {
    const value = input[link];
    if (value !== null && typeof value !== "string") {
      errors.push(`${link}: expected string or null`);
    }
  }
  // Contract invariants that cross fields:
  if (input["approvedForRetrieval"] === true && input["reviewState"] !== "approved") {
    errors.push("approvedForRetrieval: only an approved assertion may be retrievable");
  }
  if (input["reviewState"] === "proposed" && input["reviewedBy"] !== null) {
    errors.push("reviewedBy: a proposed assertion has no reviewer yet");
  }
  return ok(errors);
}

function checkLaneCrossing(value: unknown, field: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${field}: expected crossing object`);
    return;
  }
  checkEnum(value, "fromLane", PRIVACY_LANES, errors);
  checkEnum(value, "toLane", PRIVACY_LANES, errors);
  checkActor(value["approvedBy"], `${field}.approvedBy`, errors);
  checkString(value, "reason", errors, { nonEmpty: true });
  checkTimestamp(value, "approvedAt", errors);
  if (isRecord(value) && value["approvedBy"] && isRecord(value["approvedBy"]) && value["approvedBy"]["actorType"] !== "human") {
    errors.push(`${field}.approvedBy: only a human may approve a lane crossing`);
  }
}

export function validateRouteDisposition(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["RouteDisposition: expected object"]);
  checkVersion(input, errors);
  checkString(input, "dispositionId", errors, { nonEmpty: true });
  checkString(input, "intakeId", errors, { nonEmpty: true });
  checkString(input, "sourceArtifactId", errors, { nonEmpty: true });
  checkEnum(input, "lane", PRIVACY_LANES, errors);
  checkActor(input["authority"], "authority", errors);
  checkString(input, "reason", errors, { nonEmpty: true });
  checkEnum(input, "deletionState", DELETION_STATES, errors);
  const crossings = input["approvedCrossings"];
  if (!Array.isArray(crossings)) {
    errors.push("approvedCrossings: expected array");
  } else {
    crossings.forEach((crossing, index) => checkLaneCrossing(crossing, `approvedCrossings[${index}]`, errors));
  }
  checkStringArray(input, "unresolvedQuestions", errors);
  checkTimestamp(input, "decidedAt", errors);
  return ok(errors);
}

export function validateIntakeReceipt(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["IntakeReceipt: expected object"]);
  checkVersion(input, errors);
  checkString(input, "receiptId", errors, { nonEmpty: true });
  checkString(input, "intakeId", errors, { nonEmpty: true });
  checkTimestamp(input, "createdAt", errors);
  const entered = input["whatEntered"];
  if (!isRecord(entered)) {
    errors.push("whatEntered: expected object");
  } else {
    checkString(entered, "sourceArtifactId", errors, { nonEmpty: true });
    checkEnum(entered, "sourceType", SOURCE_TYPES, errors);
    checkHash(entered, "contentHash", errors);
  }
  checkStringArray(input, "whatWasDerived", errors);
  checkStringArray(input, "whatWasApproved", errors);
  checkStringArray(input, "whatWasRejectedOrHeld", errors);
  checkStringArray(input, "whatRemainedPrivate", errors);
  checkEnum(input, "routedTo", PRIVACY_LANES, errors);
  checkString(input, "dispositionId", errors, { nonEmpty: true });
  checkEnum(input, "sourceState", SOURCE_STATES, errors);
  checkEnum(input, "deletionState", DELETION_STATES, errors);
  checkHash(input, "reopenDigest", errors);
  return ok(errors);
}

export function validateCorrectionTelemetry(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["CorrectionTelemetry: expected object"]);
  checkVersion(input, errors);
  checkString(input, "telemetryId", errors, { nonEmpty: true });
  checkString(input, "supersededAssertionId", errors, { nonEmpty: true });
  checkString(input, "supersedingAssertionId", errors, { nonEmpty: true });
  if (input["supersededAssertionId"] === input["supersedingAssertionId"]) {
    errors.push("supersedingAssertionId: an assertion cannot supersede itself");
  }
  checkString(input, "reason", errors, { nonEmpty: true });
  checkEnum(
    input,
    "cause",
    ["wrong_person", "wrong_relationship", "wrong_theme_value", "wrong_lane_scope", "low_confidence_resolved", "other"],
    errors
  );
  checkActor(input["correctedBy"], "correctedBy", errors);
  checkTimestamp(input, "correctedAt", errors);
  return ok(errors);
}

export function validateDuplicateObservation(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["DuplicateObservation: expected object"]);
  checkVersion(input, errors);
  checkString(input, "observationId", errors, { nonEmpty: true });
  checkHash(input, "contentHash", errors);
  checkString(input, "canonicalArtifactId", errors, { nonEmpty: true });
  checkString(input, "duplicateIntakeId", errors, { nonEmpty: true });
  checkTimestamp(input, "observedAt", errors);
  checkEnum(input, "action", ["idempotent_receipt", "linked_duplicate"], errors);
  return ok(errors);
}

// ---------------------------------------------------------------------------
// Fixture manifests
// ---------------------------------------------------------------------------

export type FixtureManifest = {
  readonly contractVersion: string;
  readonly fixtureId: string;
  readonly title: string;
  readonly provenanceLabel: string;
  readonly sourceType: string;
  readonly syntheticContent: string;
  readonly expectedLane: string;
  readonly expectedInitialRoute: string;
  readonly expectedThemes: readonly {
    readonly themeType: string;
    readonly value: string;
    readonly expectedReviewOutcome: string;
  }[];
  readonly negativeVisibility: readonly string[];
  readonly duplicateBehavior: string;
  readonly retrievalProofQueries: readonly string[];
  readonly acceptanceLinkage: readonly string[];
};

const ACCEPTANCE_IDS = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];

export function validateFixtureManifest(input: unknown): GuardResult {
  const errors: string[] = [];
  if (!isRecord(input)) return ok(["FixtureManifest: expected object"]);
  checkVersion(input, errors);
  checkString(input, "fixtureId", errors, { nonEmpty: true });
  checkString(input, "title", errors, { nonEmpty: true });
  checkString(input, "provenanceLabel", errors, { nonEmpty: true });
  if (typeof input["provenanceLabel"] === "string" && !input["provenanceLabel"].startsWith("synthetic")) {
    errors.push('provenanceLabel: Slice 0 fixtures must be truthfully labeled and start with "synthetic"');
  }
  checkEnum(input, "sourceType", SOURCE_TYPES, errors);
  checkString(input, "syntheticContent", errors, { nonEmpty: true });
  checkEnum(input, "expectedLane", PRIVACY_LANES, errors);
  checkEnum(input, "expectedInitialRoute", PRIVACY_LANES, errors);
  const themes = input["expectedThemes"];
  if (!Array.isArray(themes) || themes.length === 0) {
    errors.push("expectedThemes: expected non-empty array");
  } else {
    themes.forEach((theme, index) => {
      if (!isRecord(theme)) {
        errors.push(`expectedThemes[${index}]: expected object`);
        return;
      }
      checkEnum(theme, "themeType", THEME_TYPES, errors);
      checkString(theme, "value", errors, { nonEmpty: true });
      checkEnum(theme, "expectedReviewOutcome", REVIEW_STATES, errors);
    });
  }
  const negative = input["negativeVisibility"];
  if (!Array.isArray(negative) || negative.length === 0) {
    errors.push("negativeVisibility: expected non-empty array of lanes");
  } else {
    negative.forEach((lane, index) => {
      if (typeof lane !== "string" || !(PRIVACY_LANES as readonly string[]).includes(lane)) {
        errors.push(`negativeVisibility[${index}]: expected a privacy lane`);
      }
    });
  }
  checkString(input, "duplicateBehavior", errors, { nonEmpty: true });
  checkStringArray(input, "retrievalProofQueries", errors);
  const linkage = input["acceptanceLinkage"];
  if (!Array.isArray(linkage) || linkage.length === 0) {
    errors.push("acceptanceLinkage: expected non-empty array");
  } else {
    linkage.forEach((id, index) => {
      if (typeof id !== "string" || !ACCEPTANCE_IDS.includes(id)) {
        errors.push(`acceptanceLinkage[${index}]: expected one of A1–A10`);
      }
    });
  }
  return ok(errors);
}
