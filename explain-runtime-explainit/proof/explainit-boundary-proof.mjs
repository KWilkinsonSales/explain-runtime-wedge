// ExplainIT architectural-boundary proof.
//
// Verifies that ExplainIT is a thin client over the shared, proven runtime
// interface (@adl/companion-shared) — not a forked or duplicated second
// runtime — and that its production build actually serves the governed room
// flow. Exits non-zero on any failure. Run via: npm run proof:boundary

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..");
const distDir = path.join(appRoot, "dist");
const sharedDir = path.join(repoRoot, "packages", "companion-shared", "src");

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
}

function readAllSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readAllSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

// 1. Production build.
console.log("Building production bundle…");
execSync("npx vite build", { cwd: appRoot, stdio: "pipe" });
check("production build succeeds", fs.existsSync(path.join(distDir, "index.html")));

// 2. The shared package actually exists and exports what ExplainIT imports.
const sharedIndex = fs.readFileSync(path.join(sharedDir, "index.ts"), "utf8");
check(
  "@adl/companion-shared exists and exports the shared event/voice interface",
  sharedIndex.includes("./eventDetection") && sharedIndex.includes("./voiceCapability")
);

// 3. ExplainIT's two runtime-consuming modules import from the shared
// package rather than defining their own copy of this logic.
const roomSessionSrc = fs.readFileSync(path.join(appRoot, "src/explainit/roomSession.ts"), "utf8");
const voiceCaptureSrc = fs.readFileSync(path.join(appRoot, "src/explainit/voiceCapture.ts"), "utf8");
check(
  "roomSession.ts imports detectEventType from @adl/companion-shared",
  roomSessionSrc.includes("packages/companion-shared/src/eventDetection") && !roomSessionSrc.includes("function detectEventType")
);
check(
  "voiceCapture.ts imports voice-capability helpers from @adl/companion-shared",
  voiceCaptureSrc.includes("packages/companion-shared/src/voiceCapability") &&
    !voiceCaptureSrc.includes("function classifyMicrophoneError")
);

// 4. No file under src/ redefines the shared functions — guards against a
// silent fork of the runtime as the app evolves.
const FORBIDDEN_REDEFINITIONS = [
  "function detectEventType",
  "function classifyMicrophoneError",
  "function describeMicrophoneError",
  "function isGetUserMediaSupported",
  "function isSpeechRecognitionSupported"
];
const offendingFiles = readAllSourceFiles(path.join(appRoot, "src")).filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return FORBIDDEN_REDEFINITIONS.some((needle) => text.includes(needle));
});
check(
  "no source file reimplements a shared runtime function (no forked runtime)",
  offendingFiles.length === 0,
  offendingFiles.length ? offendingFiles.map((f) => path.relative(appRoot, f)).join(", ") : ""
);

// 5. Serve the production build and confirm the governed room flow resolves.
function collectBundleText() {
  const assetDir = path.join(distDir, "assets");
  const names = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
  return [path.join(distDir, "index.html"), ...names.map((n) => path.join(assetDir, n))]
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
}
const bundleText = collectBundleText();
const REQUIRED_IN_BUNDLE = ["Enter Room", "ExplainIT", "Plaintiff Intelligence", "Speak", "Ask"];
for (const needle of REQUIRED_IN_BUNDLE) {
  check(`production bundle contains "${needle}"`, bundleText.includes(needle));
}

const server = spawn("npx", ["vite", "preview", "--port", "4390", "--strictPort"], { cwd: appRoot, stdio: "pipe" });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("preview server did not start in time")), 15000);
    const onData = (data) => {
      if (data.toString().includes("Local")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
  });

  const entryRes = await fetch("http://localhost:4390/explainit");
  check("GET /explainit returns 200", entryRes.status === 200);

  const roomRes = await fetch("http://localhost:4390/explainit/room/plaintiff-intelligence");
  check("GET /explainit/room/plaintiff-intelligence returns 200", roomRes.status === 200);

  const aliasRes = await fetch("http://localhost:4390/explainit/plaintiff-intelligence");
  check("GET /explainit/plaintiff-intelligence (alias) returns 200", aliasRes.status === 200);
} finally {
  server.kill();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${failed.length === 0 ? "PASS" : "FAIL"}: ExplainIT boundary proof — ${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length === 0 ? 0 : 1);
