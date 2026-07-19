import { describe, expect, it } from "vitest";
import { DONNA_JEAN_PACKET } from "../src/familyhistory/fixtures";
import { ALL_DISPOSITIONS } from "../src/familyhistory/types";

// Disposition integrity: every ledger row carries exactly one valid
// disposition and is never missing the fields the audit depends on.

describe("claim disposition integrity", () => {
  it("every claim has exactly one disposition, drawn from the enum", () => {
    for (const claim of DONNA_JEAN_PACKET.claims) {
      // The type system already forbids multiple dispositions per claim; this
      // pins the runtime value to a single member of the enum.
      expect(typeof claim.disposition).toBe("string");
      expect(ALL_DISPOSITIONS).toContain(claim.disposition);
      expect(ALL_DISPOSITIONS.filter((d) => d === claim.disposition)).toHaveLength(1);
    }
  });

  it("no claim is missing confidence, source platform, claim type, or disposition", () => {
    for (const claim of DONNA_JEAN_PACKET.claims) {
      expect(claim.confidence, claim.claimId).toBeTruthy();
      expect(claim.sourcePlatform, claim.claimId).toBeTruthy();
      expect(claim.claimType, claim.claimId).toBeTruthy();
      expect(claim.disposition, claim.claimId).toBeTruthy();
    }
  });

  it("claim IDs are unique and every claim anchors to the packet", () => {
    const ids = DONNA_JEAN_PACKET.claims.map((c) => c.claimId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const claim of DONNA_JEAN_PACKET.claims) {
      expect(claim.personAnchor).toBe(DONNA_JEAN_PACKET.packetId);
    }
  });

  it("false leads and candidates each point at a real ledger row", () => {
    const ids = new Set(DONNA_JEAN_PACKET.claims.map((c) => c.claimId));
    for (const lead of DONNA_JEAN_PACKET.falseLeads) {
      expect(ids.has(lead.claimId), lead.leadId).toBe(true);
    }
    for (const candidate of DONNA_JEAN_PACKET.candidates) {
      expect(ids.has(candidate.claimId), candidate.candidateId).toBe(true);
    }
  });
});
