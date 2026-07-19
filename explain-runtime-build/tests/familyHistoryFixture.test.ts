import { describe, expect, it } from "vitest";
import { DONNA_JEAN_PACKET } from "../src/familyhistory/fixtures";

// Fixture integrity: the Donna Jean packet's pinned invariants. If any of
// these fail, the ledger has started telling a story the evidence does not
// support — that is a product regression, not a data tweak.

describe("Donna Jean fixture integrity", () => {
  it("anchors DOB 1955-04-01, Lewiston birthplace, and both parents", () => {
    expect(DONNA_JEAN_PACKET.dob).toBe("1955-04-01");
    expect(DONNA_JEAN_PACKET.birthplace).toContain("Lewiston, Idaho");
    expect(DONNA_JEAN_PACKET.parents).toEqual([
      "Frances Elaine Reavis",
      "Lester Carl Ellison",
    ]);
    expect(DONNA_JEAN_PACKET.knownNames).toContain("Donna Jean Ellison");
    expect(DONNA_JEAN_PACKET.knownNames).toContain("Donna J. Ellison");
  });

  it("keeps the active-private-test-case status with no confirmed death place", () => {
    expect(DONNA_JEAN_PACKET.status).toBe(
      "ACTIVE PRIVATE TEST CASE / NO DEATH PLACE CONFIRMED"
    );
    expect(DONNA_JEAN_PACKET.privacyClass).toBe("private-test-case");
  });

  it("has no accepted death record, obituary, or death place", () => {
    const accepted = DONNA_JEAN_PACKET.claims.filter((c) => c.disposition === "accepted");
    for (const claim of accepted) {
      expect(claim.claimType).not.toBe("obituary");
      expect(claim.claimText.toLowerCase()).not.toContain("death");
      expect(claim.claimText.toLowerCase()).not.toContain("died");
    }
  });

  it("rejects the Bell County / Donna June marriage lead", () => {
    const bellCounty = DONNA_JEAN_PACKET.claims.find(
      (c) => c.claimId === "claim-bell-county-tx-marriage"
    );
    expect(bellCounty).toBeDefined();
    expect(bellCounty!.disposition).toBe("rejected");
    expect(bellCounty!.claimedName).toBe("Donna June Ellison");
    expect(
      DONNA_JEAN_PACKET.falseLeads.some((lead) => lead.claimId === bellCounty!.claimId)
    ).toBe(true);
  });

  it("rejects the earlier obituary candidate on DOB mismatch", () => {
    const obituary = DONNA_JEAN_PACKET.claims.find(
      (c) => c.claimId === "claim-obituary-early-candidate"
    );
    expect(obituary).toBeDefined();
    expect(obituary!.disposition).toBe("rejected");
    expect(obituary!.conflicts.join(" ")).toContain("DOB mismatch");
  });

  it("keeps the Joan Olsen / Maxwell / Price cluster HOLD only, never merged", () => {
    const joan = DONNA_JEAN_PACKET.claims.find(
      (c) => c.claimId === "claim-alias-joan-cluster"
    );
    expect(joan).toBeDefined();
    expect(joan!.disposition).toBe("hold");
    // The cluster names must never appear among the packet's own known names.
    for (const name of ["Joan Alice Olsen", "Joan A Maxwell", "Joan A Price"]) {
      expect(DONNA_JEAN_PACKET.knownNames.join(" ")).not.toContain(name);
    }
    const joanCandidate = DONNA_JEAN_PACKET.candidates.find(
      (c) => c.claimId === joan!.claimId
    );
    expect(joanCandidate).toBeDefined();
    expect(joanCandidate!.requirement).toContain("requires official bridge");
  });

  it("holds both Nampa addresses pending full source capture", () => {
    for (const claimId of ["claim-nampa-victory-rd", "claim-nampa-powerline-rd"]) {
      const claim = DONNA_JEAN_PACKET.claims.find((c) => c.claimId === claimId);
      expect(claim).toBeDefined();
      expect(claim!.disposition).toBe("hold");
    }
    const nampaCandidates = DONNA_JEAN_PACKET.candidates.filter((c) =>
      c.label.includes("Nampa")
    );
    expect(nampaCandidates).toHaveLength(2);
    for (const candidate of nampaCandidates) {
      expect(candidate.requirement).toContain("requires official bridge");
    }
  });

  it("includes a negative-search row that concludes nothing", () => {
    const negative = DONNA_JEAN_PACKET.claims.find(
      (c) => c.claimType === "negative_search"
    );
    expect(negative).toBeDefined();
    expect(negative!.evidenceType).toBe("negative");
    expect(negative!.disposition).toBe("source_only");
  });
});
