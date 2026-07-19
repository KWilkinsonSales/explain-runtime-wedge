import { describe, expect, it } from "vitest";
import { DONNA_JEAN_PACKET } from "../src/familyhistory/fixtures";
import { buildExportReceipt } from "../src/familyhistory/receipt";

// Export receipt: deterministic, complete, and incapable of upgrading the
// ledger — no alias merge, no death conclusion.

describe("export receipt preview", () => {
  const receipt = buildExportReceipt(DONNA_JEAN_PACKET);

  it("is deterministic for the same packet", () => {
    expect(buildExportReceipt(DONNA_JEAN_PACKET)).toBe(receipt);
  });

  it("includes accepted, rejected, hold, negative-search, and next-task sections", () => {
    expect(receipt).toContain("ACCEPTED ANCHORS");
    expect(receipt).toContain("REJECTED FALSE LEADS");
    expect(receipt).toContain("HOLD CANDIDATES");
    expect(receipt).toContain("NEGATIVE SEARCHES");
    expect(receipt).toContain("NEXT TASKS");
    for (const task of DONNA_JEAN_PACKET.tasks) {
      expect(receipt).toContain(task);
    }
  });

  it("marks interview output as lead, not proof", () => {
    expect(receipt).toContain("lead, not proof");
  });

  it("does not merge aliases: Joan names appear only under HOLD, never as the person", () => {
    const personLine = receipt
      .split("\n")
      .find((line) => line.startsWith("Person:"));
    expect(personLine).toBeDefined();
    expect(personLine).not.toContain("Joan");
    const holdSection = receipt.split("HOLD CANDIDATES")[1]?.split("NEGATIVE SEARCHES")[0];
    expect(holdSection).toContain("Joan Alice Olsen");
    expect(holdSection).toContain("official bridge");
  });

  it("does not confirm death", () => {
    expect(receipt).toContain("No death conclusion");
    expect(receipt).toContain(
      "NO DEATH PLACE CONFIRMED"
    );
    // No accepted line may assert a death.
    const acceptedSection = receipt.split("ACCEPTED ANCHORS")[1]?.split("REJECTED")[0] ?? "";
    expect(acceptedSection.toLowerCase()).not.toContain("death");
    expect(acceptedSection.toLowerCase()).not.toContain("died");
  });
});
