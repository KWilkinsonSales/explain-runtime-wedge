import { describe, expect, it } from "vitest";
import { deliberate } from "../src/council/engine";
import { PERSPECTIVES } from "../src/council/fixtures";

describe("council deliberation engine", () => {
  it("is deterministic: the same question always returns the same deliberation", () => {
    const first = deliberate("Should we ship this now?");
    const second = deliberate("Should we ship this now?");
    expect(second).toEqual(first);
  });

  it("matches the ship fixture on a shipping question and returns all three perspectives", () => {
    const result = deliberate("Should we ship this now?");
    expect(result.matchedFixtureId).toBe("fixture-ship-now");
    expect(result.responses).toHaveLength(PERSPECTIVES.length);
    expect(result.responses.map((response) => response.perspectiveId)).toEqual([
      "advocate",
      "skeptic",
      "synthesizer"
    ]);
  });

  it("matches the architecture fixture on a rearchitect question", () => {
    const result = deliberate("Should we rearchitect this?");
    expect(result.matchedFixtureId).toBe("fixture-architecture");
  });

  it("matches the scope fixture on a scope-expansion question", () => {
    const result = deliberate("Should we expand scope here?");
    expect(result.matchedFixtureId).toBe("fixture-scope");
  });

  it("falls back to the bounded default for an unmatched question, never inventing a response", () => {
    const result = deliberate("What is the weather on Mars?");
    expect(result.matchedFixtureId).toBe("fixture-default");
    expect(result.illustrative).toBe(true);
  });

  it("is case-insensitive and tolerant of surrounding whitespace", () => {
    const result = deliberate("  SHIP it today  ");
    expect(result.matchedFixtureId).toBe("fixture-ship-now");
  });

  it("preserves the caller's exact question text in the result", () => {
    const result = deliberate("Should we ship this now?");
    expect(result.question).toBe("Should we ship this now?");
  });

  it("treats an empty or whitespace-only question as unmatched, not a crash", () => {
    expect(deliberate("").matchedFixtureId).toBe("fixture-default");
    expect(deliberate("   ").matchedFixtureId).toBe("fixture-default");
  });
});
