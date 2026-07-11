import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Stack-appropriate accessibility checks: this workspace has no DOM test
// environment, so these pin the CSS contract the components rely on.

const css = readFileSync(
  fileURLToPath(new URL("../src/teacherprep/teacherprep.css", import.meta.url)),
  "utf8"
);

describe("accessibility contract in teacherprep.css", () => {
  it("body text floor is 18px (1.125rem), applied to the shell", () => {
    expect(css).toContain("--tp-body-size: 1.125rem");
    expect(css).toContain("font-size: var(--tp-body-size)");
  });

  it("Teach card primary text floor is 24px (1.5rem) and scalable", () => {
    expect(css).toMatch(/\.tp-teach-body\s*{[^}]*font-size:\s*clamp\(1\.5rem/);
  });

  it("Teach controls meet the 48px target", () => {
    expect(css).toMatch(/\.tp-teach-control\s*{[^}]*min-height:\s*48px/);
    expect(css).toMatch(/\.tp-teach-control\s*{[^}]*min-width:\s*48px/);
    expect(css).toMatch(/\.tp-teach-jump select\s*{[^}]*min-height:\s*48px/);
  });

  it("primary actions and nav meet the 44px minimum", () => {
    expect(css).toMatch(/\.tp-primary,\s*\n\.tp-secondary\s*{[^}]*min-height:\s*48px/);
    expect(css).toMatch(/\.tp-nav button\s*{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.tp-promote\s*{[^}]*min-height:\s*44px/);
  });

  it("visible focus states exist", () => {
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*3px solid/);
  });

  it("has a tablet layout breakpoint", () => {
    expect(css).toMatch(/@media \(min-width: 900px\)/);
  });
});
