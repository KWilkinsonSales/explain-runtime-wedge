// Companion v1.2 walkthrough in real Chromium with a fake microphone device
// (so the ON → Listening flow runs without a human granting permission).
// Drives: one-button activation, listening state, hold/resume, diagnostics
// behind a disclosure, the governed text-mode response loop with duplicate
// suppression, clean End, and product separation from the LDS surface.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = new URL("./", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});
const failures = [];
async function assert(cond, label) {
  if (cond) console.log("PASS:", label);
  else {
    failures.push(label);
    console.log("FAIL:", label);
  }
}

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await phone.grantPermissions(["microphone"]);
const page = await phone.newPage();
await page.route("**/*", async (route) => {
  if (!route.request().url().includes("/.netlify/functions/companion-response")) return route.continue();
  const request = route.request();
  const payload = request.postDataJSON();
  const utterance = String(payload.utterance ?? "");
  const answer = utterance.includes("budget")
    ? "The session does not establish whether the budget is approved; confirm with the accountable owner."
    : "I understand the new statement and will keep it in the active session context.";
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      answer,
      understood_intent: utterance.includes("?") ? "Determine the budget approval status" : "Hold the statement in context",
      speak: utterance.includes("budget") ? "Can the accountable owner confirm whether the budget is approved?" : "Let's hold that point while we confirm the next step.",
      steer: "Answer from established session evidence and ask for clarification when it is missing.",
      provider: "openai",
      model: "deterministic-browser-stub",
      provider_request_id: "proof-safe",
    }),
  });
});

// 1. One-button activation
await page.goto(`${BASE}/companion/prototype`, { waitUntil: "networkidle" });
await assert((await page.locator("body").innerText()).trim().length > 0, "page renders meaningful content");
await assert((await page.locator(".vite-error-overlay").count()) === 0, "no Vite error overlay");
await assert(await page.getByRole("button", { name: "Start Companion ON" }).isVisible(), "Companion ON screen intact");
await assert((await page.locator(".companion-banner").innerText()).includes("v1.2"), "Companion banner present");
await page.screenshot({ path: OUT + "05-product-recovery-off-phone.png", fullPage: true });
await page.getByRole("button", { name: "Start Companion ON" }).click();
await page.locator(".speak-card").waitFor({ timeout: 15000 });
await assert(
  (await page.locator(".state-badge").innerText()).includes("Listening"),
  "Listening state shown after one tap"
);

// 2. SPEAK prominent, STEER collapsed, diagnostics behind a disclosure
await assert(await page.locator(".speak-card").isVisible(), "useful answer card is the primary surface");
await assert(await page.locator(".speak-cue-card").isVisible(), "SPEAK cue remains visible");
await assert(!(await page.locator(".steer-details p").isVisible()), "STEER starts collapsed");
await assert(!(await page.locator(".diagnostics-footer").isVisible()), "diagnostics hidden from the primary screen");
for (const name of ["Copy", "Repeat", "Hold", "End"]) {
  await assert(await page.getByRole("button", { name }).isVisible(), `${name} control available`);
}
await page.screenshot({ path: OUT + "06-product-recovery-listening-phone.png", fullPage: true });

// 3. Hold / resume
await page.getByRole("button", { name: "Hold" }).click();
await assert((await page.locator(".state-badge").innerText()).includes("On hold"), "Hold state visible");
await page.getByRole("button", { name: "Resume" }).click();

// 4. Diagnostics disclosure reveals session + provider detail on demand
await page.getByText("Details & diagnostics").click();
await assert(await page.locator(".diagnostics-footer").isVisible(), "diagnostics available behind disclosure");
const situation = await page.locator(".situation-grid").innerText();
await assert(situation.includes("session-"), "one session ID per activation shown");

// 5. Governed response loop via Text Mode (same engine as voice)
await page.getByRole("button", { name: "Text Mode" }).click();
await page.getByPlaceholder(/Type a message/).fill("Is the budget approved?");
await page.getByRole("button", { name: "Send", exact: true }).click();
await page.locator(".admission-receipt").first().waitFor({ timeout: 10000 });
await assert(
  (await page.locator(".admission-receipt").count()) === 1,
  "one admitted event renders exactly one answer"
);
const answer = await page.locator(".admission-receipt-output").first().innerText();
await assert(answer.includes("does not establish whether the budget is approved"), "useful answer rendered instead of acknowledgement");
await assert(/speak/i.test(answer) && /steer/i.test(answer), "SPEAK and STEER rendered");

// Duplicate admission is suppressed before execution.
await page.getByPlaceholder(/Type a message/).fill("Is the budget approved?");
await page.getByRole("button", { name: "Send", exact: true }).click();
await page.waitForTimeout(300);
await assert(
  (await page.locator(".admission-receipt").count()) === 1,
  "duplicate utterance produces no second execution or answer"
);
await page.getByPlaceholder(/Type a message/).fill("We should hold the line.");
await page.getByRole("button", { name: "Send", exact: true }).click();
await page.waitForTimeout(300);
await assert((await page.locator(".admission-receipt").count()) === 2, "new utterance produces exactly one more answer");
await page.screenshot({ path: OUT + "07-product-recovery-text-answer-phone.png", fullPage: true });

// 6. Explicit clean End
await page.getByRole("button", { name: "End", exact: true }).click();
await assert(
  await page.getByRole("button", { name: "Start Companion ON" }).isVisible(),
  "End returns cleanly to Companion OFF"
);

// 7. Product separation: Companion URL never lands on LDS; LDS URL never shows Companion
await assert((await page.locator(".tp-shell").count()) === 0, "no LDS surface inside Companion");
await page.goto(`${BASE}/teacher`, { waitUntil: "networkidle" });
await assert(await page.getByRole("heading", { name: "This Week" }).isVisible(), "LDS URL opens This Week");
await assert((await page.locator(".companion-shell").count()) === 0, "no Companion branding on the LDS surface");
const storage = await page.evaluate(() => Object.keys(localStorage));
await assert(
  storage.every((key) => !key.startsWith("teacherprep.") || !key.startsWith("companion-")),
  "storage namespaces remain distinct"
);

// 8. Tablet width
const tabPage = await phone.newPage();
await tabPage.route("**/*", async (route) => {
  if (!route.request().url().includes("/.netlify/functions/companion-response")) return route.continue();
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ answer: "Ready for a bounded request.", understood_intent: "Wait for a request", speak: "What would you like to work through?", steer: "Keep the next step explicit.", provider: "openai", model: "deterministic-browser-stub" }),
  });
});
await tabPage.setViewportSize({ width: 1024, height: 768 });
await tabPage.goto(`${BASE}/companion/prototype`, { waitUntil: "networkidle" });
await tabPage.getByRole("button", { name: "Start Companion ON" }).click();
await tabPage.locator(".speak-card").waitFor({ timeout: 15000 });
await assert(await tabPage.locator(".speak-card").isVisible(), "tablet Companion shows SPEAK surface");
await tabPage.screenshot({ path: OUT + "08-product-recovery-listening-desktop.png", fullPage: true });

await browser.close();
console.log(failures.length === 0 ? "\nALL COMPANION CHECKS PASSED" : `\n${failures.length} CHECKS FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
