// Drives the Durin Slice 0 intake loop end to end in real Chromium against
// the vite dev server, at phone width (390x844), screenshotting each stage.
// Verifies: no-delete language, ORIGINAL vs DERIVED distinction, fail-closed
// lane default, manual tagging detail, review actions, receipt + reopen, no
// horizontal scroll, and zero non-localhost network requests.
//
// Run: node proof/durin/browser-walkthrough.mjs   (vite dev on :5173;
// playwright-core resolvable via NODE_PATH, as with the teacherprep proof)
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

const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await phone.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
});

const externalRequests = [];
page.on("request", (req) => {
  const url = new URL(req.url());
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") externalRequests.push(req.url());
});

async function noHorizontalScroll(label) {
  const widths = await page.evaluate(() => ({
    scroll: document.scrollingElement.scrollWidth,
    inner: window.innerWidth
  }));
  await assert(widths.scroll <= widths.inner, `no horizontal scroll on ${label}`);
}

// 0. Product selector shows the Durin card
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await assert(await page.getByText("Durin Intake").isVisible(), "selector shows Durin Intake card");

// 1. Home
await page.goto(`${BASE}/durin`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await assert(await page.getByRole("heading", { name: "Durin Intake — Slice 0" }).isVisible(), "Durin loads at /durin");
await assert(await page.getByText("Nothing here is ever deleted.").isVisible(), "no-delete language on every screen");
await noHorizontalScroll("home");
await page.screenshot({ path: OUT + "01-home-phone.png", fullPage: true });

// 2. Import an exported note (text adapter)
await page.getByRole("button", { name: "Import a source" }).click();
await assert(await page.getByText("nothing connects to Apple Photos or Apple Notes").isVisible(), "no-Apple-connection language");
await page.getByLabel("Exported note text").fill("Synthetic note: the Durin intake-router needs one governed entry point.\nKeep the receipt.");
await page.screenshot({ path: OUT + "02-import-phone.png", fullPage: true });
await page.getByRole("button", { name: "Preview source" }).click();

// 3. Preview + lane (fail-closed default)
await assert(await page.getByText("ORIGINAL").first().isVisible(), "preview labeled ORIGINAL");
const holdRadio = page.getByRole("radio", { name: /Hold in unsorted holding/ });
await assert(await holdRadio.isChecked(), "lane choice fails closed to holding by default");
await page.screenshot({ path: OUT + "03-lane-phone.png", fullPage: true });
await page.getByRole("radio", { name: "Private journal" }).check();
await page.getByRole("button", { name: "Confirm and admit" }).click();

// 4. Derivation inspection
await assert(await page.getByRole("heading", { name: "Inspect derivation" }).isVisible(), "derivation screen opens");
await assert(await page.getByText("DERIVED").first().isVisible(), "derived record labeled DERIVED");
await assert(
  await page.getByText("durin-manual-adapter@0.1.0 (deterministic_rule)").isVisible(),
  "generator + version + method shown for the deterministic derivation"
);
await page.getByLabel("Manual derivation text").fill("Manual description: a synthetic reflection on the Durin intake-router.");
await page.getByRole("button", { name: "Attach description" }).click();
await assert(
  await page.getByText("durin-manual-entry@0.1.0 (human_manual)").isVisible(),
  "human-manual derivation carries its own provenance"
);
await noHorizontalScroll("derivation");
await page.screenshot({ path: OUT + "04-derivation-phone.png", fullPage: true });
await page.getByRole("button", { name: "Continue to themes" }).click();

// 5. Manual theme tagging (first-class)
await page.getByLabel("Theme type").selectOption("project");
await page.getByLabel("Theme value").fill("Durin intake-router");
await page.getByLabel("Evidence pointer").fill("manual:note line 1");
await page.getByLabel("Privacy scope").selectOption("private_journal");
await page.getByRole("button", { name: "Propose theme" }).click();
await assert(
  await page.getByText(/confidence: .*evidence: .*provenance:/s).first().isVisible(),
  "assertion shows confidence, evidence pointer, and provenance"
);
await assert(await page.getByText(/review state: .*privacy scope:/s).first().isVisible(), "assertion shows review state and privacy scope");
await page.screenshot({ path: OUT + "05-themes-phone.png", fullPage: true });
await page.getByRole("button", { name: "Continue to review" }).click();

// 6. Review: approve the proposal
await page.getByRole("button", { name: "Approve", exact: true }).click();
await assert(await page.getByText("review state: approved", { exact: false }).first().isVisible(), "approval recorded");
await page.screenshot({ path: OUT + "06-review-phone.png", fullPage: true });
await page.getByRole("button", { name: "Continue to disposition" }).click();

// 7. Disposition: reviewed → admitted → routed
await page.getByRole("button", { name: "Mark reviewed" }).click();
await page.getByRole("button", { name: "Admit", exact: true }).click();
await page.getByLabel("Destination lane").selectOption("private_journal");
await page.getByLabel("Routing reason").fill("private founder reflection");
await page.getByRole("button", { name: "Route to lane" }).click();
await page.screenshot({ path: OUT + "07-disposition-phone.png", fullPage: true });

// 8. Receipt + deterministic reopen
await page.getByRole("button", { name: "Open receipt" }).click();
await assert(await page.getByRole("heading", { name: "Intake receipt" }).isVisible(), "receipt opens");
await assert(await page.getByText("Reopen digest").isVisible(), "receipt shows reopen digest");
await assert(await page.getByText("filing states are not deletion").isVisible(), "receipt states no-delete boundary");
await page.getByRole("button", { name: "Reopen receipt (verify)" }).click();
await assert(
  await page.getByText("Reopen verified: records reconstruct deterministically").isVisible(),
  "reopen verifies deterministically in the browser"
);
await noHorizontalScroll("receipt");
await page.screenshot({ path: OUT + "08-receipt-phone.png", fullPage: true });

// 9. Home shows the routed source persisted in localStorage
await page.getByRole("button", { name: "Back to sources" }).click();
await assert(await page.getByText("state: routed", { exact: false }).first().isVisible(), "home lists the routed source");
await page.screenshot({ path: OUT + "09-home-after-phone.png", fullPage: true });

// 10. Meaning retrieval (Command 4): deterministic, explained, lane-gated
await page.getByRole("button", { name: "Retrieve by meaning" }).click();
await page.getByLabel("Retrieval query").fill("Find all sources associated with the Durin intake-router idea.");
await page.getByRole("button", { name: "Search", exact: true }).click();
await assert(await page.getByText("How your query was read").isVisible(), "query mapping shown to the operator");
await assert(await page.getByText(/Why it matched/).first().isVisible(), "result carries a why-matched explanation");
await assert(await page.getByText(/approved assertion .*contains "durin"/i).first().isVisible(), "explanation names the causal approved assertion");
await assert(await page.getByText(/review: approved/).first().isVisible(), "result shows review state and confidence");
await assert((await page.getByRole("button", { name: /Open receipt/ }).count()) > 0, "result links to its receipt");
await noHorizontalScroll("search results");
await page.screenshot({ path: OUT + "10-search-phone.png", fullPage: true });

// 11. Ambiguous query fails closed with narrowing help
await page.getByLabel("Retrieval query").fill("stuff");
await page.getByRole("button", { name: "Search", exact: true }).click();
await assert(await page.getByText("Failed closed:").isVisible(), "ambiguous query fails closed with suggestions");
await page.screenshot({ path: OUT + "11-search-failclosed-phone.png", fullPage: true });

await assert(externalRequests.length === 0, `zero non-localhost requests (saw ${externalRequests.length})`);

await browser.close();
if (failures.length > 0) {
  console.log("\nWALKTHROUGH FAILURES:", failures.length);
  process.exit(1);
}
console.log("\nWALKTHROUGH COMPLETE: all assertions passed");
