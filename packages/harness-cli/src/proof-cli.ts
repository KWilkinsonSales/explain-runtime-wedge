#!/usr/bin/env node
import { runAllProofs } from "./proof.js";

const proofs = runAllProofs();
console.log(JSON.stringify(proofs, null, 2));

if (proofs.some((proof) => !proof.finalStateEqual || !proof.digestsEqual)) {
  process.exitCode = 1;
}
