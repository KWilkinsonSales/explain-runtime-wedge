import type { ProofLensManifest } from "@adl/lenses";
import { cardToVisualScene, type VisualRoom } from "./types.js";

export function renderVisualRoom(manifest: ProofLensManifest): VisualRoom {
  return {
    lensId: manifest.lensId,
    label: manifest.label,
    purpose: manifest.purpose,
    scenes: manifest.cards.map(cardToVisualScene),
  };
}
