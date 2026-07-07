import { describe, expect, it } from "vitest";
import { INTENTS, findIntent } from "../src/prototype/intents";
import { COMPANION_PROTOTYPE_ENABLED } from "../src/prototype/featureFlag";

describe("companion prototype intents", () => {
  it("exposes exactly the five governed intent commands in order", () => {
    expect(INTENTS.map((intent) => intent.word)).toEqual(["Nosta", "Sogo", "Tanca", "Anor", "Durin"]);
  });

  it("pairs each intent word with its label", () => {
    const labels = Object.fromEntries(INTENTS.map((intent) => [intent.word, intent.label]));
    expect(labels).toEqual({
      Nosta: "Observe",
      Sogo: "Guide",
      Tanca: "Truth",
      Anor: "Illuminate",
      Durin: "Govern"
    });
  });

  it("every intent has non-empty speak and steer copy", () => {
    for (const intent of INTENTS) {
      expect(intent.speak.length).toBeGreaterThan(0);
      expect(intent.steer.length).toBeGreaterThan(0);
    }
  });

  it("findIntent resolves a known id and returns null for none/unknown", () => {
    expect(findIntent("tanca")?.word).toBe("Tanca");
    expect(findIntent(null)).toBeNull();
  });
});

describe("companion prototype feature flag", () => {
  it("is a boolean the router can gate on", () => {
    expect(typeof COMPANION_PROTOTYPE_ENABLED).toBe("boolean");
  });
});
