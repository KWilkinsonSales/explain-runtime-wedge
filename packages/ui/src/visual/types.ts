import type { ProofLensManifest, CardSpec } from "@adl/lenses";

export type VisualScene = {
  readonly cardId: string;
  readonly title: string;
  readonly body: string;
  readonly prompt?: string;
};

export type VisualRoom = {
  readonly lensId: ProofLensManifest["lensId"];
  readonly label: string;
  readonly purpose: string;
  readonly scenes: readonly VisualScene[];
};

export function cardToVisualScene(card: CardSpec): VisualScene {
  return {
    cardId: card.id,
    title: card.title,
    body: card.body,
    prompt: card.requiresInput ? `Provide: ${card.inputId ?? "input"}` : undefined,
  };
}
