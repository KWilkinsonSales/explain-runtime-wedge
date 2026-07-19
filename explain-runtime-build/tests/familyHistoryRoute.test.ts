import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveSurface } from "../src/routeGate";
import { FEATURE_FHGI_OS_SLICE0 } from "../src/familyhistory/featureFlag";
import FamilyHistoryApp from "../src/familyhistory/ui/FamilyHistoryApp";

// Route + flag behavior for /family-history, plus a static render of the
// Evidence Audit Desk (no DOM test environment in this workspace, so the
// render check uses react-dom/server, which is deterministic).

describe("FEATURE_FHGI_OS_SLICE0 flag", () => {
  it("defaults OFF unless the environment explicitly enables it", () => {
    const raw = import.meta.env?.VITE_FEATURE_FHGI_OS_SLICE0;
    const explicitlyEnabled = raw === "true" || raw === "1";
    expect(FEATURE_FHGI_OS_SLICE0).toBe(explicitlyEnabled);
    if (raw === undefined) {
      expect(FEATURE_FHGI_OS_SLICE0).toBe(false);
    }
  });
});

describe("/family-history route gating", () => {
  it("renders the Family History surface when the flag is enabled", () => {
    expect(resolveSurface("/family-history", true, true, true, true)).toBe("familyHistory");
    expect(resolveSurface("/family-history/", true, true, true, true)).toBe("familyHistory");
    expect(resolveSurface("/family-history/receipts", true, true, true, true)).toBe(
      "familyHistory"
    );
  });

  it("is hidden (falls back to Companion) when the flag is disabled", () => {
    expect(resolveSurface("/family-history", true, true, true, false)).toBe("companion");
    // The pre-slice call shape keeps the old behavior exactly.
    expect(resolveSurface("/family-history", true, true, true)).toBe("companion");
  });

  it("similar-looking prefixes never leak into the surface", () => {
    expect(resolveSurface("/family-historys", true, true, true, true)).toBe("companion");
    expect(resolveSurface("/family", true, true, true, true)).toBe("companion");
  });
});

describe("Evidence Audit Desk static render", () => {
  const html = renderToStaticMarkup(createElement(FamilyHistoryApp));

  it("renders the product header with the boundary text", () => {
    expect(html).toContain("Family History Intelligence OS");
    expect(html).toContain("Evidence-first genealogy intelligence");
    expect(html).toContain("No certainty without proof");
  });

  it("renders all nine panels", () => {
    for (const heading of [
      "Person Evidence Packet",
      "Source / Claim Matrix",
      "False-Lead Registry",
      "Candidate Board",
      "ExplainIT Interview Module",
      "Artifact Ingestion",
      "Reconstruction Label Legend",
      "Export Receipt Preview",
    ]) {
      expect(html).toContain(heading);
    }
  });

  it("shows the packet status and hold requirements", () => {
    expect(html).toContain("ACTIVE PRIVATE TEST CASE / NO DEATH PLACE CONFIRMED");
    expect(html).toContain("requires official bridge");
    expect(html).toContain("lead, not proof");
    expect(html).toContain("Reconstruction cannot convert uncertainty into fact.");
  });
});
