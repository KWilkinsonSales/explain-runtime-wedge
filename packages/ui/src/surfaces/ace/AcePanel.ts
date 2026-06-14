import type { ProofLensManifest } from "@adl/lenses";
import { createAceSession } from "./aceController.js";

export type AcePanelModel = {
  readonly mode: "VOICE_SIM";
  readonly roomLabel: string;
  readonly purpose: string;
  readonly scenes: readonly {
    readonly script: string;
    readonly prompt?: string;
    readonly confirmStep: boolean;
  }[];
};

export function buildAcePanelModel(manifest: ProofLensManifest): AcePanelModel {
  const session = createAceSession(manifest);
  return {
    mode: "VOICE_SIM",
    roomLabel: manifest.label,
    purpose: manifest.purpose,
    scenes: session.scenes.map(({ script, prompt, confirmStep }) => ({ script, prompt, confirmStep })),
  };
}
