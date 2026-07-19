import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DONNA_JEAN_PACKET } from "../src/familyhistory/fixtures";
import {
  FOCUS_PERSON_ID,
  PRODUCT_LINE,
  TREE_NODES,
  nodeForPerson,
  packetForPerson,
} from "../src/familyhistory/treeFixtures";
import { buildCommandCenter, buildWorkQueue } from "../src/familyhistory/insights";
import { FEATURE_FHGI_OS_SLICE1 } from "../src/familyhistory/featureFlag";
import FamilyHistoryShell from "../src/familyhistory/ui/FamilyHistoryShell";
import PersonWorkspacePanel from "../src/familyhistory/ui/PersonWorkspacePanel";

// Slice 1 — Tree + Person Workspace shell. The shell wraps the Slice 0
// ledger; these tests pin that it adds views without adding authority.

describe("Slice 1 flag", () => {
  it("FEATURE_FHGI_OS_SLICE1 defaults OFF unless explicitly enabled", () => {
    const raw = import.meta.env?.VITE_FEATURE_FHGI_OS_SLICE1;
    const explicitlyEnabled = raw === "true" || raw === "1";
    expect(FEATURE_FHGI_OS_SLICE1).toBe(explicitlyEnabled);
    if (raw === undefined) {
      expect(FEATURE_FHGI_OS_SLICE1).toBe(false);
    }
  });
});

describe("tree fixture integrity", () => {
  it("contains only the three anchored people plus explicit unsourced placeholders", () => {
    expect(TREE_NODES).toHaveLength(7);
    const named = TREE_NODES.filter((n) => n.role !== "grandparent_placeholder");
    expect(named.map((n) => n.displayName).sort()).toEqual([
      "Donna Jean Ellison",
      "Frances Elaine Reavis",
      "Lester Carl Ellison",
    ]);
    for (const placeholder of TREE_NODES.filter(
      (n) => n.role === "grandparent_placeholder"
    )) {
      expect(placeholder.evidenceHealth).toBe("unsourced");
      expect(placeholder.displayName).toContain("not yet captured");
    }
  });

  it("links the focus person to both parents and only Donna carries a packet", () => {
    const donna = nodeForPerson(FOCUS_PERSON_ID);
    expect(donna).toBeDefined();
    expect(donna!.parentIds).toEqual([
      "person-frances-elaine-reavis",
      "person-lester-carl-ellison",
    ]);
    expect(packetForPerson(FOCUS_PERSON_ID)).toBe(DONNA_JEAN_PACKET);
    for (const node of TREE_NODES.filter((n) => n.personId !== FOCUS_PERSON_ID)) {
      expect(packetForPerson(node.personId)).toBeUndefined();
    }
  });

  it("marks Donna's duplicate risk as guarded, never open or merged", () => {
    const donna = nodeForPerson(FOCUS_PERSON_ID)!;
    expect(donna.duplicateRisk).toBe("guarded");
    expect(donna.duplicateRiskNote).toContain("HOLD");
  });
});

describe("command center summary", () => {
  const summary = buildCommandCenter(DONNA_JEAN_PACKET);

  it("counts match the ledger exactly", () => {
    expect(summary.claimCounts.total).toBe(DONNA_JEAN_PACKET.claims.length);
    expect(summary.claimCounts.accepted).toBe(2);
    expect(summary.claimCounts.rejected).toBe(2);
    expect(summary.claimCounts.hold).toBe(3);
    expect(summary.claimCounts.sourceOnly).toBe(1);
  });

  it("reports guarded duplicate risks and unsourced branches from fixtures", () => {
    expect(summary.duplicateRisksGuarded).toBe(3);
    expect(summary.unsourcedBranches).toBe(4);
  });

  it("open mysteries are questions, and next safe actions are the packet tasks", () => {
    for (const mystery of summary.openMysteries) {
      expect(mystery).toContain("?");
    }
    expect(summary.nextSafeActions).toEqual(DONNA_JEAN_PACKET.tasks);
  });
});

describe("work queue", () => {
  const queue = buildWorkQueue(DONNA_JEAN_PACKET);

  it("is deterministic", () => {
    expect(buildWorkQueue(DONNA_JEAN_PACKET)).toEqual(queue);
  });

  it("contains every queue kind, including guards and OCR placeholder", () => {
    const kinds = new Set(queue.map((item) => item.kind));
    expect(kinds).toEqual(
      new Set([
        "source_only_claim",
        "hold_candidate",
        "rejected_guard",
        "merge_candidate",
        "interview_follow_up",
        "artifact_ocr",
      ])
    );
  });

  it("has no executable merge: the only merge item is the refusal state", () => {
    const merges = queue.filter((item) => item.kind === "merge_candidate");
    expect(merges).toHaveLength(1);
    expect(merges[0].label).toContain("No merge candidates qualify");
    expect(merges[0].detail).toContain("human accepts it");
  });
});

describe("shell render", () => {
  const html = renderToStaticMarkup(createElement(FamilyHistoryShell));

  it("wraps the surface with header, four sections of navigation, and product line", () => {
    expect(html).toContain("Family History Intelligence OS");
    expect(html).toContain("No certainty without proof");
    for (const label of ["Command Center", "Tree", "Person Workspace", "Work Queue"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(PRODUCT_LINE);
  });

  it("defaults to the Research Command Center", () => {
    expect(html).toContain("Research Command Center");
    expect(html).toContain("Open mysteries");
  });
});

describe("person workspace render", () => {
  it("embeds the full Slice 0 Evidence Audit Desk for Donna", () => {
    const html = renderToStaticMarkup(
      createElement(PersonWorkspacePanel, { personId: FOCUS_PERSON_ID })
    );
    expect(html).toContain("Evidence Audit Desk (Slice 0 nucleus");
    // The embedded desk carries the real ledger panels, not a summary copy.
    expect(html).toContain("Source / Claim Matrix");
    expect(html).toContain("False-Lead Registry");
    expect(html).toContain("Export Receipt Preview");
    expect(html).toContain("ACTIVE PRIVATE TEST CASE / NO DEATH PLACE CONFIRMED");
    // Workspace drawers around the nucleus.
    for (const drawer of [
      "Timeline",
      "Relationships",
      "Sources",
      "Conflicts",
      "Dedupe candidates",
      "Guided interview prompts",
      "Receipt / export",
    ]) {
      expect(html).toContain(drawer);
    }
  });

  it("keeps unsourced people honest: empty workspace, no guessed facts", () => {
    const html = renderToStaticMarkup(
      createElement(PersonWorkspacePanel, { personId: "person-reavis-grandfather" })
    );
    expect(html).toContain("UNSOURCED BRANCH");
    expect(html).toContain("No evidence packet exists for this person yet");
    expect(html).not.toContain("Source / Claim Matrix");
  });
});
