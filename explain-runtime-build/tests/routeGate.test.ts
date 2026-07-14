import { describe, expect, it } from "vitest";
import { resolveSurface } from "../src/routeGate";

describe("front-door route gate", () => {
  it("routes /teacher and subpaths to Teacher Preparation when enabled", () => {
    expect(resolveSurface("/teacher", true)).toBe("teacher");
    expect(resolveSurface("/teacher/", true)).toBe("teacher");
    expect(resolveSurface("/teacher/anything", true)).toBe("teacher");
  });

  it("routes exactly the root to the product selector", () => {
    expect(resolveSurface("/", true)).toBe("selector");
    expect(resolveSurface("", true)).toBe("selector");
  });

  it("keeps Companion on every other path, unchanged", () => {
    expect(resolveSurface("/companion", true)).toBe("companion");
    expect(resolveSurface("/companion/prototype", true)).toBe("companion");
    expect(resolveSurface("/anything-else", true)).toBe("companion");
    // Similar-looking prefixes must not leak into Teacher Preparation.
    expect(resolveSurface("/teachers", true)).toBe("companion");
  });

  it("falls back to Companion for /teacher when the flag is off", () => {
    expect(resolveSurface("/teacher", false)).toBe("companion");
  });

  it("routes /durin and subpaths to Durin Intake only when its flag is on", () => {
    expect(resolveSurface("/durin", true, true)).toBe("durin");
    expect(resolveSurface("/durin/receipts", true, true)).toBe("durin");
    // Similar-looking prefixes must not leak into Durin.
    expect(resolveSurface("/durination", true, true)).toBe("companion");
    // Flag off (and the pre-Durin call shape) keeps the old behavior exactly.
    expect(resolveSurface("/durin", true, false)).toBe("companion");
    expect(resolveSurface("/durin", true)).toBe("companion");
  });
});
