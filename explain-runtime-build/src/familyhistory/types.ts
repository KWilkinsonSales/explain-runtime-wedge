// Family History & Genealogy Intelligence OS — Slice 0 domain model.
//
// Everything here is a typed local model over deterministic fixture data.
// There are no network calls, no external APIs, and no live-person exposure:
// the only person in Slice 0 is a private test-case packet whose privacyClass
// keeps it out of any public surface.
//
// The spine of the product is the evidence ledger: SourceClaim rows with
// exactly one Disposition each. Interviews and reconstruction attach to that
// spine as leads — they never bypass it.

/** Where a claim stands in the audit ledger. Exactly one per claim. */
export type Disposition =
  | "accepted"
  | "rejected"
  | "duplicate_candidate"
  | "conflict"
  | "hold"
  | "private"
  /** Research-direction only: a lead that may guide research but is never itself evidence. */
  | "rd_only"
  /** Documents that a source was examined (e.g. a negative search); asserts nothing about the person. */
  | "source_only";

export const ALL_DISPOSITIONS: readonly Disposition[] = [
  "accepted",
  "rejected",
  "duplicate_candidate",
  "conflict",
  "hold",
  "private",
  "rd_only",
  "source_only",
];

/** Epistemic label for any reconstructed statement. Reconstruction cannot convert uncertainty into fact. */
export type ReconstructionLabel =
  | "observed_fact"
  | "likely"
  | "possible_narrative_fill"
  | "unknown";

export const RECONSTRUCTION_LABELS: readonly ReconstructionLabel[] = [
  "observed_fact",
  "likely",
  "possible_narrative_fill",
  "unknown",
];

export type ClaimType =
  | "birth"
  | "parentage"
  | "residence"
  | "marriage"
  | "obituary"
  | "alias_candidate"
  | "negative_search";

/** Genealogical source quality (original record, derivative copy, or authored narrative). */
export type SourceQuality = "original" | "derivative" | "authored" | "unverified_aggregate";

export type EvidenceType = "direct" | "indirect" | "negative";

export type ConfidenceBand = "high" | "medium" | "low" | "none";

/** One sourced claim. A row in the Source/Claim Matrix — never a person summary. */
export interface SourceClaim {
  claimId: string;
  /** The packet this claim is anchored to (packetId). */
  personAnchor: string;
  claimType: ClaimType;
  claimText: string;
  claimedName?: string;
  claimedDob?: string;
  claimedAddress?: string;
  claimedDateRange?: string;
  sourcePlatform: string;
  collectionName: string;
  recordIdOrArk?: string;
  artifactLink?: string;
  sourceQuality: SourceQuality;
  evidenceType: EvidenceType;
  /** Fields on which this claim matches the accepted anchor facts. */
  matchFields: string[];
  /** Conflicts with accepted anchor facts. Non-empty on rejected/conflict rows. */
  conflicts: string[];
  disposition: Disposition;
  confidence: ConfidenceBand;
  nextAction: string;
  notes?: string;
}

/** A rejected lead, kept on the ledger so it can never silently return via auto-match. */
export interface FalseLead {
  leadId: string;
  /** The claimId of the rejected SourceClaim row backing this entry. */
  claimId: string;
  label: string;
  rejectionReason: string;
  /** Why this lead is permanently blocked from any future auto-merge. */
  autoMergeBlock: string;
}

/** An open candidate that may or may not concern the anchor person. Never merged without an official bridge record. */
export interface CandidateLead {
  candidateId: string;
  /** The claimId of the HOLD SourceClaim row backing this entry. */
  claimId: string;
  label: string;
  disposition: Extract<Disposition, "hold">;
  /** Always states the bridge requirement — Slice 0 renders this verbatim. */
  requirement: string;
}

/** One bounded interview prompt inside a receipt's prompt set. */
export interface InterviewPrompt {
  promptId: string;
  /** The artifact or evidence gap this prompt targets. */
  artifactOrGap: string;
  suggestedPrompt: string;
  /** The literal "Say This" line for the interviewer. */
  sayThis: string;
  followUpLead: string;
}

/** Receipt for a bounded, purpose-driven interview. Outputs are leads, not proof. */
export interface InterviewReceipt {
  receiptId: string;
  purpose: string;
  subject: string;
  targetInterviewee: string;
  promptSet: InterviewPrompt[];
  /** claimIds of ledger rows generated from this interview (always rd_only until sourced). */
  claimsGenerated: string[];
  uncertaintyNotes: string;
  followUpTasks: string[];
  disposition: Disposition;
  createdAt: string;
}

/** The audited evidence packet for one person. */
export interface PersonEvidencePacket {
  packetId: string;
  primaryName: string;
  knownNames: string[];
  dob: string;
  birthplace: string;
  parents: string[];
  status: string;
  privacyClass: string;
  summary: string;
  claims: SourceClaim[];
  falseLeads: FalseLead[];
  candidates: CandidateLead[];
  tasks: string[];
  interviewReceipts: InterviewReceipt[];
  reconstructionNotes: ReconstructionNote[];
}

/** A reconstructed statement, always carrying its epistemic label. */
export interface ReconstructionNote {
  noteId: string;
  label: ReconstructionLabel;
  text: string;
}
