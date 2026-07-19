// Deterministic export-receipt preview for a PersonEvidencePacket.
//
// Pure function of the packet: no clock, no randomness, no network. The
// receipt restates the ledger — it never upgrades a disposition, merges an
// alias, or concludes a death.

import { LEAD_NOT_PROOF_LABEL } from "./fixtures";
import type { PersonEvidencePacket, SourceClaim } from "./types";

function claimLine(claim: SourceClaim): string {
  return `  - [${claim.disposition.toUpperCase()}] ${claim.claimId}: ${claim.claimText}`;
}

export function buildExportReceipt(packet: PersonEvidencePacket): string {
  const accepted = packet.claims.filter((c) => c.disposition === "accepted");
  const rejected = packet.claims.filter((c) => c.disposition === "rejected");
  const hold = packet.claims.filter((c) => c.disposition === "hold");
  const negativeSearches = packet.claims.filter((c) => c.claimType === "negative_search");

  const lines: string[] = [
    "FAMILY HISTORY INTELLIGENCE OS — EVIDENCE RECEIPT (Slice 0 preview)",
    `Packet: ${packet.packetId}`,
    `Person: ${packet.primaryName} (known names: ${packet.knownNames.join("; ")})`,
    `Status: ${packet.status}`,
    "",
    "ACCEPTED ANCHORS",
    ...accepted.map(claimLine),
    "",
    "REJECTED FALSE LEADS (blocked from auto-merge)",
    ...rejected.map(claimLine),
    ...packet.falseLeads.map((lead) => `    · ${lead.label}: ${lead.rejectionReason}`),
    "",
    "HOLD CANDIDATES (no merge without official bridge)",
    ...hold.map(claimLine),
    ...packet.candidates.map((candidate) => `    · ${candidate.label}: ${candidate.requirement}`),
    "",
    "NEGATIVE SEARCHES (document the search, conclude nothing)",
    ...negativeSearches.map(claimLine),
    "",
    "INTERVIEW LEADS",
    ...packet.interviewReceipts.map(
      (receipt) =>
        `  - ${receipt.receiptId}: ${receipt.promptSet.length} bounded prompts; all outputs are ${LEAD_NOT_PROOF_LABEL}.`
    ),
    "",
    "NEXT TASKS",
    ...packet.tasks.map((task) => `  - ${task}`),
    "",
    "CONCLUSIONS THIS RECEIPT DOES NOT MAKE",
    "  - No death conclusion: no accepted death record, obituary, or death place exists on this ledger.",
    "  - No alias merge: every alias candidate remains HOLD pending an official bridge record.",
    "  - No married-name resolution.",
  ];

  return lines.join("\n");
}
