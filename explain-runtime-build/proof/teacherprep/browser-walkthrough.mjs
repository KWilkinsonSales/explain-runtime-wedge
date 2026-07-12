// Drives the sixty-second path end to end in real Chromium against the vite
// dev server and screenshots each stage at phone width, plus tablet checks.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const failures = [];

async function assert(cond, label) {
  if (cond) console.log("PASS:", label);
  else {
    failures.push(label);
    console.log("FAIL:", label);
  }
}

// ---------- Phone flow (iPhone-ish 390x844) ----------
const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await phone.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
});

// Track network: nothing but localhost dev-server requests may occur.
const externalRequests = [];
page.on("request", (req) => {
  const url = new URL(req.url());
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") externalRequests.push(req.url());
});

// 1. This Week
await page.goto(`${BASE}/teacher`, { waitUntil: "networkidle" });
await assert(await page.getByRole("heading", { name: "This Week" }).isVisible(), "This Week loads at /teacher");
await assert(
  await page.getByText("Illustrative — official current lesson could not be verified.").isVisible(),
  "labeled fixture fallback shown when the official current lesson is not verified"
);
await assert(
  await page.getByText("Independent study tool · Not affiliated").isVisible(),
  "disclaimer visible"
);
await page.screenshot({ path: OUT + "01-this-week-phone.png", fullPage: true });

// 2. Start Preparation
await page.getByRole("button", { name: "Start Preparation" }).click();
await assert(await page.getByRole("heading", { name: "Prepare" }).isVisible(), "Prepare opens");
await assert(
  await page.getByText("Private · stays on this device · not uploaded or shared").first().isVisible(),
  "private microcopy visible"
);

// 3. Lesson intent
await page.getByLabel("What does your class need this week?").fill("My class needs hope that hearts can change.");

// 4. Review button disabled until something is promoted
const reviewButton = page.getByRole("button", { name: "Review → Ready for Class" });
await assert(await reviewButton.isDisabled(), "Review disabled before any promotion");

// 5. Promote the scripture anchor block (per item)
await page.getByRole("button", { name: "Use in class" }).nth(1).click();
await assert(await page.getByText("Added to class content.").isVisible(), "promotion gives immediate feedback");
await assert(await page.getByRole("button", { name: "Undo" }).isVisible(), "Undo offered");

// Private note + confirmation flow
await page.getByLabel("Add a note (optional)").fill("Personal impression: stay tender during the discussion.");
await page.getByRole("button", { name: "Save note on this device" }).click();
await page.getByRole("button", { name: "Share with class…" }).click();
await assert(
  await page.getByText("Share this private note with the class?").isVisible(),
  "private promotion asks for explicit confirmation"
);
await page.getByRole("button", { name: "Keep private" }).click();
await page.screenshot({ path: OUT + "02-prepare-phone.png", fullPage: true });

// localStorage separation
const stores = await page.evaluate(() => ({
  shared: localStorage.getItem("teacherprep.shared.v1"),
  priv: localStorage.getItem("teacherprep.private.v1")
}));
await assert(!stores.shared.includes("Personal impression"), "private text absent from shared store");
await assert(stores.priv.includes("Personal impression"), "private text present in private store only");

// 5b. Explore Approved Sources: official first, external needs confirmation
await page.getByText("Explore Approved Sources").click();
await assert(
  await page.getByRole("button", { name: "Official" }).getAttribute("aria-pressed") === "true",
  "official source class is on by default"
);
await page.getByRole("button", { name: "Labeled external context" }).click();
await page.screenshot({ path: OUT + "10-explore-sources-phone.png", fullPage: false });
await page.getByRole("button", { name: "Promote to Class…" }).last().click();
await assert(
  await page.getByText(/Add this labeled external context item/).isVisible(),
  "external promotion asks for explicit confirmation"
);
await page.getByRole("button", { name: "Yes, add it" }).click();
await assert(
  await page.getByText(/· labeled external context/).first().isVisible(),
  "promoted external block is visibly labeled with its standing"
);

// 6. Review → Ready for Class
await reviewButton.click();
await assert(await page.getByRole("heading", { name: "Review" }).isVisible(), "Review screen shows chosen content");
await page.screenshot({ path: OUT + "03-review-phone.png", fullPage: true });
await page.getByRole("button", { name: "Ready for Class" }).click();

// 7. Teach — opens on the title card; the promoted item is one Next away.
await page.getByRole("button", { name: "Next" }).click();
await assert(
  await page.getByText("Have ye received his image in your countenances?").first().isVisible(),
  "Teach shows the promoted scripture card"
);
const teachText = await page.locator(".tp-teach").innerText();
await assert(!teachText.includes("Personal impression"), "private note never appears in Teach");
await page.screenshot({ path: OUT + "04-teach-phone.png", fullPage: true });

// Neutral screen
await page.getByRole("button", { name: "Neutral Screen" }).click();
const neutralText = await page.locator(".tp-teach").innerText();
await assert(!neutralText.includes("countenances"), "Neutral Screen removes lesson content immediately");
await page.screenshot({ path: OUT + "05-neutral-phone.png" });
await page.getByRole("button", { name: "Resume lesson" }).click();

// End Lesson lands on the optional device-local reflection screen.
await page.getByRole("button", { name: "End Lesson" }).click();
await assert(await page.getByRole("heading", { name: "After class" }).isVisible(), "reflection screen offered after Teach");
await page.getByLabel("Reflections after class").fill("Private reflection: the quiet student spoke today.");
await page.waitForTimeout(1000);
const journalStores = await page.evaluate(() => ({
  shared: localStorage.getItem("teacherprep.shared.v1") ?? "",
  priv: localStorage.getItem("teacherprep.private.v1") ?? ""
}));
await assert(!journalStores.shared.includes("quiet student spoke"), "journal absent from shared store");
await assert(journalStores.priv.includes("quiet student spoke"), "journal auto-saved into device-local store");
await page.screenshot({ path: OUT + "11-reflect-phone.png", fullPage: true });
await page.getByRole("button", { name: "Done" }).click();

// Snapshot stability: edit Prepare, confirm Teach unchanged until replaced
await page.getByRole("button", { name: "Continue Preparation" }).click();
const anchorBox = page.getByLabel("Scripture anchor text");
await anchorBox.fill("EDITED AFTER SNAPSHOT — must not appear in Teach yet.");
await page.getByRole("button", { name: "Teach" }).click();
await page.getByRole("button", { name: "Next" }).click();
const teachAfterEdit = await page.locator(".tp-teach").innerText();
await assert(!teachAfterEdit.includes("EDITED AFTER SNAPSHOT"), "editing Prepare does not silently change Teach");
await assert(teachAfterEdit.includes("countenances"), "Teach still shows the original snapshot");

// Deliberate replacement updates Teach
await page.getByRole("button", { name: "End Lesson" }).click();
await page.getByRole("button", { name: "Done" }).click();
await page.getByRole("button", { name: "Continue Preparation" }).click();
await page.getByRole("button", { name: "Review → Ready for Class" }).click();
await page.getByRole("button", { name: "Replace class snapshot" }).click();
await page.getByRole("button", { name: "Next" }).click();
const teachReplaced = await page.locator(".tp-teach").innerText();
await assert(teachReplaced.includes("EDITED AFTER SNAPSHOT"), "replacing the snapshot deliberately updates Teach");

await assert(externalRequests.length === 0, `no external network requests (saw: ${externalRequests.join(", ") || "none"})`);

// Root is the product selector; Companion lives at /companion/prototype.
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await assert(
  await page.getByRole("link", { name: /LDS Teacher Preparation/ }).isVisible(),
  "root selector offers a labeled Teacher Preparation entry"
);
await page.screenshot({ path: OUT + "08-root-selector-phone.png" });
await page.getByRole("link", { name: /LDS Teacher Preparation/ }).click();
await assert(
  await page.getByRole("heading", { name: "This Week" }).isVisible(),
  "selector entry opens This Week"
);
await page.goto(`${BASE}/companion/prototype`, { waitUntil: "networkidle" });
const companionVisible = await page.locator(".companion-shell").count();
await assert(companionVisible > 0, "Companion still renders at /companion/prototype");

// ---------- Tablet width ----------
// Same context as the phone flow so storage (prep + snapshot) carries over.
const tabPage = await phone.newPage();
await tabPage.setViewportSize({ width: 1024, height: 768 });
await tabPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
await tabPage.screenshot({ path: OUT + "09-root-selector-tablet.png" });
await tabPage.goto(`${BASE}/teacher`, { waitUntil: "networkidle" });
await tabPage.screenshot({ path: OUT + "06-this-week-tablet.png", fullPage: true });
await tabPage.getByRole("button", { name: "Continue Preparation" }).click();
await tabPage.getByRole("button", { name: "Teach" }).click();
await tabPage.screenshot({ path: OUT + "07-teach-tablet.png" });
await assert(
  await tabPage.getByRole("button", { name: "Neutral Screen" }).isVisible(),
  "tablet Teach controls visible"
);

await browser.close();
console.log(failures.length === 0 ? "\nALL VISUAL CHECKS PASSED" : `\n${failures.length} CHECKS FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
