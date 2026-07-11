import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DISCLAIMER } from "../src/teacherprep/fixture";

// Permanent prohibitions regression: no evaluation surface may exist. This
// scans every teacherprep source file so a future change reintroducing
// evaluation vocabulary fails loudly.

const TEACHERPREP_DIR = fileURLToPath(new URL("../src/teacherprep", import.meta.url));

const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /quiz/i, reason: "no quizzes or knowledge checks" },
  { pattern: /\bscor(e|ing)\b/i, reason: "no scoring" },
  { pattern: /\brank(ing)?\b/i, reason: "no ranking" },
  { pattern: /leaderboard/i, reason: "no comparative metrics" },
  { pattern: /certif/i, reason: "no certification" },
  { pattern: /\bgrade\b/i, reason: "no grading" },
  { pattern: /readiness/i, reason: "no readiness ratings" },
  { pattern: /completion/i, reason: "no completion percentages" },
  { pattern: /\bprogress\b/i, reason: "no progress indicators" },
  { pattern: /analytics/i, reason: "no analytics" },
  { pattern: /telemetry/i, reason: "no telemetry" },
  { pattern: /assess/i, reason: "no assessment" },
  { pattern: /\bevaluat/i, reason: "no evaluation" }
];

describe("no evaluation surface exists", () => {
  const files = readdirSync(TEACHERPREP_DIR).filter((file) => /\.(ts|tsx|css)$/.test(file));

  it("scans a non-empty module", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} contains no evaluation vocabulary`, () => {
      const text = readFileSync(join(TEACHERPREP_DIR, file), "utf8");
      for (const { pattern, reason } of BANNED_PATTERNS) {
        const match = text.match(pattern);
        expect(match, `${file}: "${match?.[0]}" violates: ${reason}`).toBeNull();
      }
    });
  }

  it("the quiet independent-tool disclaimer is exactly the required line", () => {
    expect(DISCLAIMER).toBe(
      "Independent study tool · Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints · Official sources prioritized"
    );
  });
});
