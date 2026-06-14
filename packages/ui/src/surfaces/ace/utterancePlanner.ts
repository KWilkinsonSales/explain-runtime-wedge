import type { CardSpec, ProofLensManifest } from "@adl/lenses";

export type SpokenScene = {
  readonly cardId: string;
  readonly script: string;
  readonly prompt?: string;
  readonly expectedInputId?: string;
  readonly confirmStep: boolean;
};

const openings: Record<string, string> = {
  "current-situation": "Here is the situation this room is prepared to explain.",
  known: "Here is what we know with confidence.",
  unknown: "Here is what remains uncertain.",
  thesis: "Here is the investment thesis in its tightest form.",
  "why-now": "Here is why the timing matters now.",
  evidence: "Here are the proof points, separated from inference.",
  risk: "Here are the disconfirmers I would keep visible.",
  objective: "Here is the objective this pilot or QBR is trying to serve.",
  outcomes: "Here is the difference between intended and observed outcomes.",
  "customer-signal": "Here is the customer signal that matters.",
  decision: "Here is the human decision that remains.",
  "signal-summary": "Here is the outreach signal.",
  interpretation: "Here is why the signal matters.",
  hypothesis: "Here is the opportunity or risk hypothesis.",
  "recommended-action": "Here is the bounded next move.",
  "next-understanding": "Here is what should be understood next."
};

export function planUtterance(card: CardSpec): SpokenScene {
  const opening = openings[card.type] ?? "Here is the next part of the explanation.";
  return {
    cardId: card.id,
    script: `${opening} ${card.body}`,
    prompt: card.requiresInput ? `What should I admit for ${card.inputId ?? "this step"}?` : undefined,
    expectedInputId: card.inputId,
    confirmStep: Boolean(card.requiresInput),
  };
}

export function planRoomUtterances(manifest: ProofLensManifest): readonly SpokenScene[] {
  return manifest.cards.map(planUtterance);
}
