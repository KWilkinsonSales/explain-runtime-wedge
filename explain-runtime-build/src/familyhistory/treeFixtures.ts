// Slice 1 tree fixture — the family frame around the Donna Jean nucleus.
//
// Honesty rule: the tree contains only the anchored people from the Slice 0
// packet (Donna and her two parents). Everything beyond them is an explicit
// UNSOURCED placeholder — no invented names, no invented dates. The overlays
// derive from ledger state; they never manufacture certainty.

import { DONNA_JEAN_PACKET, PACKET_ID } from "./fixtures";

export type EvidenceHealth = "anchored" | "partial" | "unsourced";

/** Duplicate-risk state for a tree node. "guarded" means risks exist but the
 * ledger has recorded dispositions that block them from silently attaching. */
export type DuplicateRisk = "none" | "guarded" | "open";

export interface TreePersonNode {
  personId: string;
  displayName: string;
  /** Position in the pedigree relative to the focus person. */
  role: "focus" | "mother" | "father" | "grandparent_placeholder";
  lifespanNote: string;
  evidenceHealth: EvidenceHealth;
  duplicateRisk: DuplicateRisk;
  duplicateRiskNote: string;
  researchOpportunity: string;
  /** Only the focus person has a full evidence packet in Slice 1. */
  packetId?: string;
  parentIds: string[];
}

export const FOCUS_PERSON_ID = "person-donna-jean-ellison";

export const TREE_NODES: TreePersonNode[] = [
  {
    personId: FOCUS_PERSON_ID,
    displayName: "Donna Jean Ellison",
    role: "focus",
    lifespanNote: "b. 1955-04-01, Lewiston, Idaho — no death conclusion on ledger",
    evidenceHealth: "partial",
    duplicateRisk: "guarded",
    duplicateRiskNote:
      "2 rejected false leads (Donna June TX marriage; earlier obituary) and 1 alias cluster on HOLD. Recorded dispositions block silent re-attachment.",
    researchOpportunity:
      "Whereabouts after birth anchor: Nampa HOLD addresses, married-name gap, bounded family interviews.",
    packetId: PACKET_ID,
    parentIds: ["person-frances-elaine-reavis", "person-lester-carl-ellison"],
  },
  {
    personId: "person-frances-elaine-reavis",
    displayName: "Frances Elaine Reavis",
    role: "mother",
    lifespanNote: "Named on Donna's parentage anchor; own vitals not yet captured",
    evidenceHealth: "partial",
    duplicateRisk: "none",
    duplicateRiskNote: "No duplicate candidates recorded.",
    researchOpportunity:
      "Capture her own birth/marriage records; her family network is an interview lead source.",
    parentIds: ["person-reavis-grandfather", "person-reavis-grandmother"],
  },
  {
    personId: "person-lester-carl-ellison",
    displayName: "Lester Carl Ellison",
    role: "father",
    lifespanNote: "Named on Donna's parentage anchor; own vitals not yet captured",
    evidenceHealth: "partial",
    duplicateRisk: "none",
    duplicateRiskNote: "No duplicate candidates recorded.",
    researchOpportunity:
      "Capture his own birth/marriage records; Ellison line may bridge Donna's later records.",
    parentIds: ["person-ellison-grandfather", "person-ellison-grandmother"],
  },
  {
    personId: "person-reavis-grandfather",
    displayName: "Reavis line — father of Frances (not yet captured)",
    role: "grandparent_placeholder",
    lifespanNote: "Unsourced branch — no name or dates on the ledger",
    evidenceHealth: "unsourced",
    duplicateRisk: "none",
    duplicateRiskNote: "Nothing captured, so nothing to duplicate.",
    researchOpportunity: "Start from Frances Elaine Reavis's own records once captured.",
    parentIds: [],
  },
  {
    personId: "person-reavis-grandmother",
    displayName: "Reavis line — mother of Frances (not yet captured)",
    role: "grandparent_placeholder",
    lifespanNote: "Unsourced branch — no name or dates on the ledger",
    evidenceHealth: "unsourced",
    duplicateRisk: "none",
    duplicateRiskNote: "Nothing captured, so nothing to duplicate.",
    researchOpportunity: "Start from Frances Elaine Reavis's own records once captured.",
    parentIds: [],
  },
  {
    personId: "person-ellison-grandfather",
    displayName: "Ellison line — father of Lester (not yet captured)",
    role: "grandparent_placeholder",
    lifespanNote: "Unsourced branch — no name or dates on the ledger",
    evidenceHealth: "unsourced",
    duplicateRisk: "none",
    duplicateRiskNote: "Nothing captured, so nothing to duplicate.",
    researchOpportunity: "Start from Lester Carl Ellison's own records once captured.",
    parentIds: [],
  },
  {
    personId: "person-ellison-grandmother",
    displayName: "Ellison line — mother of Lester (not yet captured)",
    role: "grandparent_placeholder",
    lifespanNote: "Unsourced branch — no name or dates on the ledger",
    evidenceHealth: "unsourced",
    duplicateRisk: "none",
    duplicateRiskNote: "Nothing captured, so nothing to duplicate.",
    researchOpportunity: "Start from Lester Carl Ellison's own records once captured.",
    parentIds: [],
  },
];

/** Open mysteries for the command center — questions, never conclusions. */
export const OPEN_MYSTERIES: readonly string[] = [
  "Where did Donna live after the birth anchor? (Nampa addresses on HOLD)",
  "Did Donna marry, and under what surname? (no final married-name resolution)",
  "Is the Joan Olsen / Maxwell / Price cluster the same person? (HOLD — needs official bridge)",
  "Is Donna living or deceased? (negative death-index search; no conclusion either way)",
];

/** Changed/deleted fact log — every entry is a governed ledger event. */
export interface FactChangeEntry {
  changeId: string;
  changedAt: string;
  kind: "claim_rejected" | "claim_held" | "claim_accepted" | "fact_removed";
  description: string;
}

export const FACT_CHANGE_LOG: readonly FactChangeEntry[] = [
  {
    changeId: "change-accept-birth",
    changedAt: "2026-07-19",
    kind: "claim_accepted",
    description: "Birth anchor accepted: 1955-04-01, St. Joseph's Hospital, Lewiston, Idaho.",
  },
  {
    changeId: "change-reject-obituary",
    changedAt: "2026-07-19",
    kind: "claim_rejected",
    description: "Earlier obituary candidate rejected on DOB mismatch; blocked from re-attachment.",
  },
  {
    changeId: "change-reject-bell-county",
    changedAt: "2026-07-19",
    kind: "claim_rejected",
    description: "Bell County TX marriage rejected: Donna June Ellison is a different person.",
  },
  {
    changeId: "change-hold-joan-cluster",
    changedAt: "2026-07-19",
    kind: "claim_held",
    description: "Joan Olsen / Maxwell / Price alias cluster placed on HOLD pending official bridge.",
  },
];

export const PRODUCT_LINE = "Beauty invites attention. The ledger earns belief.";

export function nodeForPerson(personId: string): TreePersonNode | undefined {
  return TREE_NODES.find((node) => node.personId === personId);
}

export function packetForPerson(personId: string) {
  const node = nodeForPerson(personId);
  return node?.packetId === DONNA_JEAN_PACKET.packetId ? DONNA_JEAN_PACKET : undefined;
}
