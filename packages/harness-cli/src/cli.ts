#!/usr/bin/env node
import { getManifest, type ProofLensManifest } from "@adl/lenses";
import { runScenario } from "./scenario.js";

const id = (process.argv[2] ?? "canonical") as ProofLensManifest["lensId"];
const manifest = getManifest(id);
const trace = runScenario(manifest);

console.log(JSON.stringify({
  lensId: trace.manifest.lensId,
  label: trace.manifest.label,
  cards: trace.manifest.cards.map((card) => card.title),
  finalState: trace.finalState,
  invariantSummary: trace.invariantSummary
}, null, 2));
