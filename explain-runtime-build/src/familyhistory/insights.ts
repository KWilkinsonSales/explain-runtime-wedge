// Slice 1 derived views: command-center metrics and the work queue.
//
// Pure functions of fixture data — deterministic, no clock, no network.
// These read the ledger; they never write it. A queue item can point at a
// claim, but completing it always means a human records a new disposition.

import type { PersonEvidencePacket, SourceClaim } from "./types";
import {
  FACT_CHANGE_LOG,
  OPEN_MYSTERIES,
  TREE_NODES,
  type FactChangeEntry,
  type TreePersonNode,
} from "./treeFixtures";

export interface CommandCenterSummary {
  /** Counts that describe project health without scoring people. */
  claimCounts: {
    total: number;
    accepted: number;
    rejected: number;
    hold: number;
    sourceOnly: number;
  };
  openMysteries: readonly string[];
  /** Duplicate risks currently guarded by recorded dispositions. */
  duplicateRisksGuarded: number;
  unsourcedBranches: number;
  factChanges: readonly FactChangeEntry[];
  /** Next safe actions: never a merge, never a conclusion. */
  nextSafeActions: readonly string[];
}

export function buildCommandCenter(
  packet: PersonEvidencePacket,
  nodes: readonly TreePersonNode[] = TREE_NODES
): CommandCenterSummary {
  const byDisposition = (d: SourceClaim["disposition"]) =>
    packet.claims.filter((c) => c.disposition === d).length;

  return {
    claimCounts: {
      total: packet.claims.length,
      accepted: byDisposition("accepted"),
      rejected: byDisposition("rejected"),
      hold: byDisposition("hold"),
      sourceOnly: byDisposition("source_only"),
    },
    openMysteries: OPEN_MYSTERIES,
    duplicateRisksGuarded:
      packet.falseLeads.length +
      packet.claims.filter(
        (c) => c.claimType === "alias_candidate" && c.disposition === "hold"
      ).length,
    unsourcedBranches: nodes.filter((n) => n.evidenceHealth === "unsourced").length,
    factChanges: FACT_CHANGE_LOG,
    nextSafeActions: packet.tasks,
  };
}

export type WorkQueueKind =
  | "source_only_claim"
  | "hold_candidate"
  | "rejected_guard"
  | "merge_candidate"
  | "interview_follow_up"
  | "artifact_ocr";

export interface WorkQueueItem {
  queueId: string;
  kind: WorkQueueKind;
  label: string;
  detail: string;
  /** Claim or receipt this item points back to, when it has one. */
  refId?: string;
}

/** Deterministic work queue derived from the packet. Order is fixed:
 * source-only, holds, rejected guards, merge candidates, interviews, OCR. */
export function buildWorkQueue(packet: PersonEvidencePacket): WorkQueueItem[] {
  const items: WorkQueueItem[] = [];

  for (const claim of packet.claims) {
    if (claim.disposition === "source_only") {
      items.push({
        queueId: `queue-source-only-${claim.claimId}`,
        kind: "source_only_claim",
        label: claim.claimText,
        detail: claim.nextAction,
        refId: claim.claimId,
      });
    }
  }

  for (const candidate of packet.candidates) {
    items.push({
      queueId: `queue-hold-${candidate.candidateId}`,
      kind: "hold_candidate",
      label: candidate.label,
      detail: candidate.requirement,
      refId: candidate.claimId,
    });
  }

  for (const lead of packet.falseLeads) {
    items.push({
      queueId: `queue-guard-${lead.leadId}`,
      kind: "rejected_guard",
      label: lead.label,
      detail: `Rejected — ${lead.autoMergeBlock}`,
      refId: lead.claimId,
    });
  }

  // Merge candidates: Slice 1 has none that qualify. The dedupe stance is a
  // queue entry in its own right so the empty state is visible, not silent.
  items.push({
    queueId: "queue-merge-none",
    kind: "merge_candidate",
    label: "No merge candidates qualify",
    detail:
      "The alias cluster remains HOLD. A merge task appears here only after an official bridge record is captured and a human accepts it.",
  });

  for (const receipt of packet.interviewReceipts) {
    for (const task of receipt.followUpTasks) {
      items.push({
        queueId: `queue-interview-${receipt.receiptId}-${receipt.followUpTasks.indexOf(task)}`,
        kind: "interview_follow_up",
        label: task,
        detail: `From ${receipt.receiptId} — outputs are leads, never proof.`,
        refId: receipt.receiptId,
      });
    }
  }

  items.push({
    queueId: "queue-ocr-placeholder",
    kind: "artifact_ocr",
    label: "Artifact OCR/HTR transcription",
    detail:
      "Placeholder — no artifacts ingested yet. When upload lands, each artifact becomes an OCR task whose extracted claims enter the ledger as HOLD.",
  });

  return items;
}
