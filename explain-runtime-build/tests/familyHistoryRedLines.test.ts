import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Red-line copy test. The commercial surface must never claim ordinance
// automation, temple readiness, automatic merges, or automatic FamilySearch
// edits. The phrases below are permitted ONLY inside this prohibited-actions
// test file — never in product source. (The required boundary disclaimer
// "Not ordinance automation" is a negation, not a claim, so that exact
// phrase is asserted positively below rather than listed here.)

const FORBIDDEN_PHRASES = [
  "temple-ready",
  "temple ready",
  "ordinance-ready",
  "ordinance ready",
  "submit ordinance",
  "reserve ordinance",
  "certainty confirmed",
  "certainty guaranteed",
  "automatic familysearch edit",
  "automatic merge",
  "automatically merge",
  "auto-merge aliases",
];

const moduleRoot = fileURLToPath(new URL("../src/familyhistory", import.meta.url));

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

describe("red-line copy is absent from the Family History surface", () => {
  const files = collectFiles(moduleRoot);

  it("scans the whole familyhistory module (sanity: files exist)", () => {
    expect(files.length).toBeGreaterThan(4);
  });

  for (const phrase of FORBIDDEN_PHRASES) {
    it(`never contains "${phrase}"`, () => {
      for (const file of files) {
        const content = readFileSync(file, "utf8").toLowerCase();
        expect(content.includes(phrase.toLowerCase()), `${phrase} found in ${file}`).toBe(
          false
        );
      }
    });
  }

  it("keeps the boundary disclaimer intact (negation, not a capability claim)", () => {
    const fixtures = readFileSync(join(moduleRoot, "fixtures.ts"), "utf8");
    expect(fixtures).toContain(
      "Not a replacement tree. Not ordinance automation. No certainty without proof."
    );
  });

  it("makes no external network calls (no fetch/XMLHttpRequest/WebSocket in module source)", () => {
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const content = readFileSync(file, "utf8");
      expect(content.includes("fetch("), file).toBe(false);
      expect(content.includes("XMLHttpRequest"), file).toBe(false);
      expect(content.includes("WebSocket"), file).toBe(false);
    }
  });
});
