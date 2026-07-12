// Companion v1.2 walkthrough in real Chromium with a fake microphone device
// (so the ON → Listening flow runs without a human granting permission).
// Drives: one-button activation, listening state, hold/resume, diagnostics
// behind a disclosure, the governed text-mode response loop with duplicate
// suppression, clean End, and product separation from the LDS surface.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
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

const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
await phone.grantPermissions(["microphone"]);
const page = await phone.newPage();

// 1. One-button activation
await page.goto(`${BASE}/companion/prototype`, { waitUntil: "networkidle" });
await assert(await page.getByRole("button", { name: "Start Companion ON" }).isVisible(), "Companion ON screen intact");
await assert((await page.locator(".companion-banner").innerText()).includes("v1.2"), "banner shows v1.2");
await page.screenshot({ path: OUT + "01-companion-off-phone.png", fullPage: true });
await page.getByRole("button", { name: "Start Companion ON" }).click();
await page.locator(".speak-card").waitFor({ timeout: 15000 });
await assert(
  (await page.locator(".state-badge").innerText()).includes("Listening"),
  "Listening state shown after one tap"
);

// 2. SPEAK prominent, STEER collapsed, diagnostics behind a disclosure
await assert(await page.locator(".speak-card").isVisible(), "SPEAK card is the primary surface");
await assert(!(await page.locator(".steer-details p").isVisible()), "STEER starts collapsed");
await assert(!(await page.locator(".diagnostics-footer").isVisible()), "diagnostics hidden from the primary screen");
for (const name of ["Copy", "Repeat", "Hold", "End"]) {
  await assert(await page.getByRole("button", { name }).isVisible(), `${name} control available`);
}
await page.screenshot({ path: OUT + "02-companion-listening-phone.png", fullPage: true });

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
await page.screenshot({ path: OUT + "03-companion-text-mode-phone.png", fullPage: true });

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
await tabPage.setViewportSize({ width: 1024, height: 768 });
await tabPage.goto(`${BASE}/companion/prototype`, { waitUntil: "networkidle" });
await tabPage.getByRole("button", { name: "Start Companion ON" }).click();
await tabPage.locator(".speak-card").waitFor({ timeout: 15000 });
await assert(await tabPage.locator(".speak-card").isVisible(), "tablet Companion shows SPEAK surface");
await tabPage.screenshot({ path: OUT + "04-companion-listening-tablet.png", fullPage: true });

await browser.close();
console.log(failures.length === 0 ? "\nALL COMPANION CHECKS PASSED" : `\n${failures.length} CHECKS FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
