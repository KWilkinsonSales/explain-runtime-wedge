// Deterministic Donna Jean Ellison fixture — ACTIVE PRIVATE TEST CASE.
//
// Invariants the tests pin and that no future change may break:
//   - no accepted death record, obituary, or death place
//   - no final married-name resolution and no merged aliases
//   - the Bell County, Texas marriage (Donna JUNE Ellison) stays rejected
//   - the earlier obituary candidate stays rejected (DOB mismatch)
//   - the Joan Olsen / Maxwell / Price alias cluster stays HOLD only
//
// All data below is fixture data. No external calls, no live record IDs.

import type {
  CandidateLead,
  FalseLead,
  InterviewReceipt,
  PersonEvidencePacket,
  ReconstructionNote,
  SourceClaim,
} from "./types";

export const PACKET_ID = "fhgi-packet-donna-jean-ellison";

export const LEAD_NOT_PROOF_LABEL = "lead, not proof";

export const BOUNDARY_TEXT =
  "Not a replacement tree. Not ordinance automation. No certainty without proof.";

export const RECONSTRUCTION_WARNING =
  "Reconstruction cannot convert uncertainty into fact.";

export const REQUIRES_OFFICIAL_BRIDGE = "requires official bridge";

const CLAIMS: SourceClaim[] = [
  {
    claimId: "claim-birth-anchor",
    personAnchor: PACKET_ID,
    claimType: "birth",
    claimText:
      "Donna Jean Ellison born 1955-04-01 at St. Joseph's Hospital, Lewiston, Idaho.",
    claimedName: "Donna Jean Ellison",
    claimedDob: "1955-04-01",
    sourcePlatform: "family-records",
    collectionName: "Family knowledge — birth anchor (artifact capture pending)",
    sourceQuality: "derivative",
    evidenceType: "direct",
    matchFields: ["name", "dob", "birthplace"],
    conflicts: [],
    disposition: "accepted",
    confidence: "high",
    nextAction: "Capture birth certificate artifact to upgrade source quality to original.",
  },
  {
    claimId: "claim-parentage-anchor",
    personAnchor: PACKET_ID,
    claimType: "parentage",
    claimText:
      "Parents are Frances Elaine Reavis and Lester Carl Ellison.",
    claimedName: "Donna Jean Ellison",
    sourcePlatform: "family-records",
    collectionName: "Family knowledge — parentage anchor",
    sourceQuality: "derivative",
    evidenceType: "direct",
    matchFields: ["parents"],
    conflicts: [],
    disposition: "accepted",
    confidence: "high",
    nextAction: "Locate a record artifact naming both parents together with Donna Jean.",
  },
  {
    claimId: "claim-nampa-victory-rd",
    personAnchor: PACKET_ID,
    claimType: "residence",
    claimText: "A Donna Ellison associated with 2615 E Victory Rd, Nampa, Idaho.",
    claimedName: "Donna Ellison",
    claimedAddress: "2615 E Victory Rd, Nampa, Idaho",
    sourcePlatform: "public-records-aggregator",
    collectionName: "Address association listing (fixture)",
    sourceQuality: "unverified_aggregate",
    evidenceType: "indirect",
    matchFields: ["surname", "state"],
    conflicts: [],
    disposition: "hold",
    confidence: "low",
    nextAction: "Full source capture required before any disposition change.",
    notes: "Aggregator association only; aggregators are not proof of identity.",
  },
  {
    claimId: "claim-nampa-powerline-rd",
    personAnchor: PACKET_ID,
    claimType: "residence",
    claimText: "A Donna Ellison associated with 2615 E Powerline Rd, Nampa, Idaho.",
    claimedName: "Donna Ellison",
    claimedAddress: "2615 E Powerline Rd, Nampa, Idaho",
    sourcePlatform: "public-records-aggregator",
    collectionName: "Address association listing (fixture)",
    sourceQuality: "unverified_aggregate",
    evidenceType: "indirect",
    matchFields: ["surname", "state"],
    conflicts: [],
    disposition: "hold",
    confidence: "low",
    nextAction: "Full source capture required before any disposition change.",
    notes: "Possibly the same household as the Victory Rd association; not yet sourced.",
  },
  {
    claimId: "claim-obituary-early-candidate",
    personAnchor: PACKET_ID,
    claimType: "obituary",
    claimText: "Earlier obituary candidate proposed for a Donna Ellison.",
    claimedName: "Donna Ellison",
    claimedDob: "(differs from anchor)",
    sourcePlatform: "obituary-index",
    collectionName: "Obituary index candidate (fixture)",
    sourceQuality: "derivative",
    evidenceType: "indirect",
    matchFields: ["name"],
    conflicts: ["DOB mismatch with accepted anchor 1955-04-01"],
    disposition: "rejected",
    confidence: "none",
    nextAction: "None. Rejected on DOB mismatch; blocked from auto-match.",
    notes: "Rejection recorded so this candidate can never silently return.",
  },
  {
    claimId: "claim-bell-county-tx-marriage",
    personAnchor: PACKET_ID,
    claimType: "marriage",
    claimText: "Bell County, Texas marriage record for Donna June Ellison.",
    claimedName: "Donna June Ellison",
    sourcePlatform: "county-index",
    collectionName: "Bell County TX marriage index (fixture)",
    sourceQuality: "derivative",
    evidenceType: "indirect",
    matchFields: ["surname", "given-name-partial"],
    conflicts: ['Middle name is "June", not "Jean" — different person'],
    disposition: "rejected",
    confidence: "none",
    nextAction: "None. Rejected: Donna June Ellison is not Donna Jean Ellison.",
    notes: "Rejection recorded so name-similarity matching can never re-attach this record.",
  },
  {
    claimId: "claim-negative-death-index-search",
    personAnchor: PACKET_ID,
    claimType: "negative_search",
    claimText:
      "Search of available death index collections found no record matching Donna Jean Ellison, DOB 1955-04-01.",
    claimedName: "Donna Jean Ellison",
    claimedDob: "1955-04-01",
    sourcePlatform: "death-index-search",
    collectionName: "Death index negative search (fixture)",
    sourceQuality: "derivative",
    evidenceType: "negative",
    matchFields: [],
    conflicts: [],
    disposition: "source_only",
    confidence: "medium",
    nextAction: "Re-run periodically. Absence of a record is not a conclusion either way.",
    notes: "Documents the search itself; asserts nothing about the person.",
  },
  {
    claimId: "claim-alias-joan-cluster",
    personAnchor: PACKET_ID,
    claimType: "alias_candidate",
    claimText:
      "Name cluster Joan Alice Olsen / Joan A Maxwell / Joan A Price proposed as a possible later identity.",
    claimedName: "Joan Alice Olsen / Joan A Maxwell / Joan A Price",
    sourcePlatform: "public-records-aggregator",
    collectionName: "Name-cluster association (fixture)",
    sourceQuality: "unverified_aggregate",
    evidenceType: "indirect",
    matchFields: ["age-band", "region-overlap"],
    conflicts: ["No official record bridges any Joan identity to Donna Jean Ellison"],
    disposition: "hold",
    confidence: "low",
    nextAction:
      "HOLD candidate only. No merge without an official bridge record (marriage, court, or vital record).",
    notes: "Cluster stays a candidate; alias merge is a red line without a bridge.",
  },
];

const FALSE_LEADS: FalseLead[] = [
  {
    leadId: "false-lead-bell-county-tx",
    claimId: "claim-bell-county-tx-marriage",
    label: "Bell County, Texas marriage — Donna June Ellison",
    rejectionReason:
      'The record names Donna JUNE Ellison. The anchor person is Donna JEAN Ellison. Different middle name, different person.',
    autoMergeBlock:
      "Blocked from future auto-merge: name-similarity matching would re-attach this record; the recorded rejection overrides any automated match score.",
  },
  {
    leadId: "false-lead-early-obituary",
    claimId: "claim-obituary-early-candidate",
    label: "Earlier obituary candidate",
    rejectionReason:
      "The obituary candidate's date of birth does not match the accepted anchor DOB 1955-04-01.",
    autoMergeBlock:
      "Blocked from future auto-merge: an obituary can never be attached to this packet on name match alone; DOB conflict is disqualifying until an official record says otherwise.",
  },
];

const CANDIDATES: CandidateLead[] = [
  {
    candidateId: "candidate-nampa-victory",
    claimId: "claim-nampa-victory-rd",
    label: "2615 E Victory Rd, Nampa, Idaho",
    disposition: "hold",
    requirement: `HOLD pending full source capture — ${REQUIRES_OFFICIAL_BRIDGE}`,
  },
  {
    candidateId: "candidate-nampa-powerline",
    claimId: "claim-nampa-powerline-rd",
    label: "2615 E Powerline Rd, Nampa, Idaho",
    disposition: "hold",
    requirement: `HOLD pending full source capture — ${REQUIRES_OFFICIAL_BRIDGE}`,
  },
  {
    candidateId: "candidate-joan-cluster",
    claimId: "claim-alias-joan-cluster",
    label: "Joan Alice Olsen / Joan A Maxwell / Joan A Price",
    disposition: "hold",
    requirement: `HOLD candidate only — no merge without official bridge — ${REQUIRES_OFFICIAL_BRIDGE}`,
  },
];

const INTERVIEW_RECEIPTS: InterviewReceipt[] = [
  {
    receiptId: "interview-receipt-donna-gaps",
    purpose:
      "Generate research leads for the open evidence gaps in the Donna Jean Ellison packet.",
    subject: "Donna Jean Ellison — whereabouts after last confirmed record",
    targetInterviewee: "Family members who knew Donna or her parents",
    promptSet: [
      {
        promptId: "prompt-last-contact",
        artifactOrGap: "Gap: no accepted record after the birth/parentage anchors.",
        suggestedPrompt:
          "Ask for the most recent time anyone in the family had direct contact with Donna.",
        sayThis:
          "When was the last time you, or anyone you know, actually spoke with or saw Donna? What year would that have been, and where was she living?",
        followUpLead:
          "Any named place or year becomes a bounded record search, logged as its own claim.",
      },
      {
        promptId: "prompt-nampa-canyon-county",
        artifactOrGap: "HOLD: two unsourced Nampa, Idaho address associations.",
        suggestedPrompt:
          "Ask whether Donna was ever known to live in Nampa or Canyon County, Idaho.",
        sayThis:
          "Did Donna ever live in Nampa, or anywhere in Canyon County, Idaho? Do the addresses on Victory Road or Powerline Road mean anything to you?",
        followUpLead:
          "A yes narrows the HOLD rows to a directed source capture; a no is recorded as an interview lead against them.",
      },
      {
        promptId: "prompt-state-moves",
        artifactOrGap: "Gap: no residence timeline.",
        suggestedPrompt:
          "Ask about any known moves between Nevada, Idaho, Utah, and Wyoming.",
        sayThis:
          "Do you remember Donna moving between states — Nevada, Idaho, Utah, or Wyoming? Roughly when, and with whom?",
        followUpLead:
          "Each named state-plus-decade pair becomes a bounded index search task.",
      },
      {
        promptId: "prompt-married-names",
        artifactOrGap: "Gap: no final married-name resolution.",
        suggestedPrompt:
          "Ask for any married names or surnames Donna may have used, without suggesting the Joan cluster names.",
        sayThis:
          "Did Donna marry, and do you remember any last name she went by other than Ellison?",
        followUpLead:
          "A volunteered surname that matches a HOLD candidate strengthens it as a lead — it still requires an official bridge record before any merge.",
      },
      {
        promptId: "prompt-children-spouse",
        artifactOrGap: "Gap: no spouse or children on the ledger.",
        suggestedPrompt:
          "Ask about any rumors or memories of Donna having a spouse or children.",
        sayThis:
          "Was there ever talk of Donna having children, or a husband or partner? Any names, even uncertain ones?",
        followUpLead:
          "Names are logged as rd_only leads; children's records often bridge a married name.",
      },
      {
        promptId: "prompt-family-context",
        artifactOrGap: "Context: Frances Elaine Reavis / Lester Carl Ellison family network.",
        suggestedPrompt:
          "Ask about the wider Reavis and Ellison families to find people who stayed in contact.",
        sayThis:
          "Who in Elaine Reavis's or Lester Ellison's families would have stayed closest to Donna? Who kept the family records or photos?",
        followUpLead:
          "Each named relative is a potential interviewee and a potential artifact holder (letters, photos, journals).",
      },
    ],
    claimsGenerated: [],
    uncertaintyNotes:
      `Every answer from this interview is a ${LEAD_NOT_PROOF_LABEL}. Memories conflict, ` +
      "names drift, and dates compress. Nothing said in an interview changes a disposition by itself.",
    followUpTasks: [
      "Log each concrete answer as an rd_only claim with the interviewee as the source.",
      "Convert place/date answers into bounded record-search tasks.",
    ],
    disposition: "rd_only",
    createdAt: "2026-07-19T00:00:00Z",
  },
];

const RECONSTRUCTION_NOTES: ReconstructionNote[] = [
  {
    noteId: "recon-birth",
    label: "observed_fact",
    text: "Donna Jean Ellison was born 1955-04-01 at St. Joseph's Hospital, Lewiston, Idaho.",
  },
  {
    noteId: "recon-idaho-ties",
    label: "likely",
    text: "Donna retained ties to Idaho into adulthood, given the family anchor and repeated Idaho associations.",
  },
  {
    noteId: "recon-nampa-period",
    label: "possible_narrative_fill",
    text: "Donna may have spent time in the Nampa area; the two address associations are unsourced and remain HOLD.",
  },
  {
    noteId: "recon-current-status",
    label: "unknown",
    text: "Donna's current status, married name, and whereabouts are unknown. No death conclusion exists on this ledger.",
  },
];

export const DONNA_JEAN_PACKET: PersonEvidencePacket = {
  packetId: PACKET_ID,
  primaryName: "Donna Jean Ellison",
  knownNames: ["Donna Jean Ellison", "Donna J. Ellison"],
  dob: "1955-04-01",
  birthplace: "Lewiston, Idaho — St. Joseph's Hospital",
  parents: ["Frances Elaine Reavis", "Lester Carl Ellison"],
  status: "ACTIVE PRIVATE TEST CASE / NO DEATH PLACE CONFIRMED",
  privacyClass: "private-test-case",
  summary:
    "Evidence packet for Donna Jean Ellison. Birth and parentage are anchored; " +
    "everything after that is open. No accepted death record, no accepted obituary, " +
    "no accepted death place, no final married-name resolution, no merged aliases.",
  claims: CLAIMS,
  falseLeads: FALSE_LEADS,
  candidates: CANDIDATES,
  tasks: [
    "Capture birth certificate artifact for the birth anchor claim.",
    "Full source capture for both Nampa address associations before any disposition change.",
    "Seek an official bridge record for or against the Joan Olsen / Maxwell / Price cluster.",
    "Run the bounded family interview prompt set and log answers as rd_only leads.",
    "Re-run the death index negative search on a set cadence.",
  ],
  interviewReceipts: INTERVIEW_RECEIPTS,
  reconstructionNotes: RECONSTRUCTION_NOTES,
};

/** Future artifact classes for the ingestion placeholder panel. Placeholder only in Slice 0. */
export const FUTURE_ARTIFACT_CLASSES: readonly string[] = [
  "Birth certificates",
  "Ancestry screenshots",
  "MyHeritage screenshots",
  "FamilySearch records",
  "Photos",
  "Journals",
  "Letters",
  "OCR/HTR transcripts",
];
