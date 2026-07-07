export type IntentId = "nosta" | "sogo" | "tanca" | "anor" | "durin";

export interface IntentDefinition {
  id: IntentId;
  word: string;
  label: string;
  speak: string;
  steer: string;
}

export const INTENTS: IntentDefinition[] = [
  {
    id: "nosta",
    word: "Nosta",
    label: "Observe",
    speak: "I'm watching the room. Nothing is being decided yet.",
    steer: "Hold. Keep collecting signal before recommending a move."
  },
  {
    id: "sogo",
    word: "Sogo",
    label: "Guide",
    speak: "Here is a next step worth considering, based on what has been said so far.",
    steer: "Offer one concrete next step. Do not decide it for them."
  },
  {
    id: "tanca",
    word: "Tanca",
    label: "Truth",
    speak: "Let me separate what's confirmed from what's still assumed.",
    steer: "Surface the confirmed facts and flag the open assumptions."
  },
  {
    id: "anor",
    word: "Anor",
    label: "Illuminate",
    speak: "Here's the part of this that's easy to miss.",
    steer: "Bring the hidden or overlooked detail into view."
  },
  {
    id: "durin",
    word: "Durin",
    label: "Govern",
    speak: "This is where a boundary applies. I'll hold the line here.",
    steer: "Enforce the constraint. Do not proceed past the boundary."
  }
];

export function findIntent(id: IntentId | null): IntentDefinition | null {
  if (!id) return null;
  return INTENTS.find((intent) => intent.id === id) ?? null;
}
