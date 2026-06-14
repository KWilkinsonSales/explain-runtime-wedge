import type { ProofLensManifest } from "./types.js";

export const manifests: Record<ProofLensManifest["lensId"], ProofLensManifest> = {
  canonical: {
    lensId: "canonical",
    version: "0.1",
    label: "Canonical Room",
    purpose: "Explain one bounded situation and close with a receipt.",
    audience: "Reference runtime evaluator",
    cards: [
      { id: "situation", type: "current-situation", title: "Current Situation", body: "State what is being explained.", requiresInput: true, inputId: "situation" },
      { id: "known", type: "known", title: "Known", body: "Name what is admitted as known." },
      { id: "unknown", type: "unknown", title: "Unknown", body: "Name what remains uncertain." },
      { id: "next", type: "next-understanding", title: "Next Understanding", body: "Identify what must be understood next." }
    ],
    threshold: { id: "canonical-threshold", requiredCardIds: ["situation", "known", "unknown", "next"], requiredInputIds: ["situation"] },
    receiptPolicy: { receiptType: "CanonicalUnderstandingReceipt", includeCardIds: ["situation", "known", "unknown", "next"] }
  },
  investor: {
    lensId: "investor",
    version: "0.1",
    label: "Explain an Investor Thesis",
    purpose: "Explain an investment thesis with explicit evidence and disconfirmers.",
    audience: "Investor or investment committee",
    cards: [
      { id: "thesis", type: "thesis", title: "Thesis", body: "State the thesis in one sentence.", requiresInput: true, inputId: "situation" },
      { id: "why-now", type: "why-now", title: "Why Now", body: "Explain the timing forces." },
      { id: "proof", type: "evidence", title: "Proof Points", body: "Separate evidence from inference." },
      { id: "disconfirmers", type: "risk", title: "Disconfirmers", body: "Name what would weaken the thesis." }
    ],
    threshold: { id: "investor-threshold", requiredCardIds: ["thesis", "why-now", "proof", "disconfirmers"], requiredInputIds: ["situation"] },
    receiptPolicy: { receiptType: "ThesisReceipt", includeCardIds: ["thesis", "why-now", "proof", "disconfirmers"] }
  },
  qbr: {
    lensId: "qbr",
    version: "0.1",
    label: "Explain a Pilot / QBR",
    purpose: "Explain outcomes, learnings, risks, and required decisions.",
    audience: "Customer and internal leadership",
    cards: [
      { id: "objective", type: "objective", title: "Objective", body: "State the customer objective.", requiresInput: true, inputId: "situation" },
      { id: "outcomes", type: "outcomes", title: "Goals vs Outcomes", body: "Compare intended and observed outcomes." },
      { id: "signal", type: "customer-signal", title: "Customer Signal", body: "Surface observed customer signal." },
      { id: "decision", type: "decision", title: "Decision Required", body: "Name the next human decision." }
    ],
    threshold: { id: "qbr-threshold", requiredCardIds: ["objective", "outcomes", "signal", "decision"], requiredInputIds: ["situation"] },
    receiptPolicy: { receiptType: "QBRReceipt", includeCardIds: ["objective", "outcomes", "signal", "decision"] }
  },
  outreach: {
    lensId: "outreach",
    version: "0.1",
    label: "Explain an Outreach Signal",
    purpose: "Explain a signal, its meaning, and the bounded next move.",
    audience: "Founder or outreach operator",
    cards: [
      { id: "signal", type: "signal-summary", title: "Signal Summary", body: "State what happened or changed.", requiresInput: true, inputId: "situation" },
      { id: "meaning", type: "interpretation", title: "Why It Matters", body: "Explain the signal meaning." },
      { id: "hypothesis", type: "hypothesis", title: "Hypothesis", body: "State the opportunity or risk hypothesis." },
      { id: "action", type: "recommended-action", title: "Recommended Action", body: "Offer a bounded next move." }
    ],
    threshold: { id: "outreach-threshold", requiredCardIds: ["signal", "meaning", "hypothesis", "action"], requiredInputIds: ["situation"] },
    receiptPolicy: { receiptType: "SignalReceipt", includeCardIds: ["signal", "meaning", "hypothesis", "action"] }
  }
};

export function getManifest(id: ProofLensManifest["lensId"]): ProofLensManifest {
  return manifests[id];
}
