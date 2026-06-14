import { manifests } from "@adl/lenses";
import { replay, stableDigest } from "@adl/runtime";
import { buildAceRuntimeEvents, buildVisualRuntimeEvents } from "@adl/ui";

export type LensProof = {
  readonly lensId: string;
  readonly visualDigest: string;
  readonly voiceDigest: string;
  readonly finalStateEqual: boolean;
  readonly digestsEqual: boolean;
};

export function runAllProofs(): readonly LensProof[] {
  return Object.values(manifests).map((manifest) => {
    const visualEvents = buildVisualRuntimeEvents(manifest);
    const voiceEvents = buildAceRuntimeEvents(manifest);
    const visualReplay = replay(visualEvents);
    const voiceReplay = replay(voiceEvents);

    return {
      lensId: manifest.lensId,
      visualDigest: stableDigest({ events: normalizeSurfaceActors(visualEvents), finalState: visualReplay.finalState }),
      voiceDigest: stableDigest({ events: normalizeSurfaceActors(voiceEvents), finalState: voiceReplay.finalState }),
      finalStateEqual: stableDigest(visualReplay.finalState) === stableDigest(voiceReplay.finalState),
      digestsEqual:
        stableDigest({ events: normalizeSurfaceActors(visualEvents), finalState: visualReplay.finalState }) ===
        stableDigest({ events: normalizeSurfaceActors(voiceEvents), finalState: voiceReplay.finalState }),
    };
  });
}

function normalizeSurfaceActors(events: readonly unknown[]): readonly unknown[] {
  return events.map((event) => {
    if (!event || typeof event !== "object") return event;
    const copy = { ...(event as Record<string, unknown>) };
    if (copy.actor) copy.actor = { actorId: "surface", actorType: "surface" };
    return copy;
  });
}
