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
});
