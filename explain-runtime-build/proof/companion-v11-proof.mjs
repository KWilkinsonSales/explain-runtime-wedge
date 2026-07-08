// Companion v1.1 proof gate.
//
// Verifies, against a fresh production build:
//   1. No ExplainIT strings or routes in the production bundle.
//   2. "/" and "/companion" return 200 and serve the app shell (SPA fallback).
//   3. The Companion ON mic flow is present (getUserMedia + Start Companion ON).
//   4. The live transcription rail is wired (Deepgram endpoint + token fetch).
//   5. The manual text fallback (Text Mode) is still present.
//
// Exits non-zero on any failure. Run via: npm run proof:v11

import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appRoot, "dist");

const FORBIDDEN = [
  "ExplainIT",
  "ExplainIt",
  "Explain It",
  "explainit",
  "/explainit",
  "governed explanation",
  "Founder Envoy",
  "Plaintiff Intelligence",
  "roomRegistry",
];

const REQUIRED = [
  "Start Companion ON",
  "getUserMedia",
  "deepgram-token",
  "api.deepgram.com",
  "Text Mode",
];

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
}

// 1. Fresh production build.
console.log("Building production bundle…");
execSync("npx vite build", { cwd: appRoot, stdio: "pipe" });
check("production build succeeds", fs.existsSync(path.join(distDir, "index.html")));

// 2. Collect bundle text (html + js + css).
function collectFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return /\.(html|js|css|webmanifest|txt)$/.test(entry.name) ? [full] : [];
  });
}
const bundleFiles = collectFiles(distDir);
const bundleText = bundleFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

// 3. ExplainIT contamination check.
const contamination = FORBIDDEN.filter((marker) => bundleText.includes(marker));
check(
  "no ExplainIT strings/routes in production bundle",
  contamination.length === 0,
  contamination.length ? `found: ${contamination.join(", ")}` : `${bundleFiles.length} files scanned`,
);

// 4. Required Companion markers.
const missing = REQUIRED.filter((marker) => !bundleText.includes(marker));
check(
  "Companion ON mic flow, Deepgram rail, and Text Mode fallback present in bundle",
  missing.length === 0,
  missing.length ? `missing: ${missing.join(", ")}` : "",
);

// 5. SPA redirect present so every route serves the shell on Netlify.
const redirects = fs.readFileSync(path.join(distDir, "_redirects"), "utf8");
check(
  "SPA catch-all redirect deployed",
  /^\/\*\s+\/index\.html\s+200/m.test(redirects),
  redirects.split("\n").filter((line) => line && !line.startsWith("#")).join(" | "),
);
check("no /explainit redirect remains", !redirects.includes("/explainit"));

// 6. Serve dist with the same SPA fallback Netlify applies; check routes.
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  const filePath = path.join(distDir, urlPath);
  const resolved =
    fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(distDir, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(resolved)] ?? "application/octet-stream" });
  res.end(fs.readFileSync(resolved));
});

await new Promise((resolve) => server.listen(4173, resolve));
for (const route of ["/", "/companion", "/companion/prototype"]) {
  const response = await fetch(`http://localhost:4173${route}`);
  const body = await response.text();
  check(
    `${route} returns 200 and serves the Companion shell`,
    response.status === 200 && body.includes('<div id="root">') && body.includes("<title>Companion</title>"),
    `status ${response.status}`,
  );
}
server.close();

const failed = results.filter((result) => !result.passed);
console.log(`\n${failed.length === 0 ? "PASS" : "FAIL"}: Companion v1.1 proof — ${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length === 0 ? 0 : 1);
