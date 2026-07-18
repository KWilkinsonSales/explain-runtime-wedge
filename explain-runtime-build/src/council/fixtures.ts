import type { CouncilDeliberation, CouncilPerspective } from "./types";

// Deterministic illustrative fixtures. There is no live model and no network
// call anywhere under src/council: every deliberation below is a fixed
// lookup keyed by keyword, not a generated response. Same idiom as
// teacherprep/fixture.ts and durin/themeProposal.ts's keyword provider.
export const ILLUSTRATIVE_LABEL =
  "Illustrative — deterministic fixture responses, not a live model or a production decision";

export const PERSPECTIVES: CouncilPerspective[] = [
  { id: "advocate", name: "Advocate", stance: "Argues for the strongest version of the proposal." },
  { id: "skeptic", name: "Skeptic", stance: "Surfaces the risks and open questions." },
  { id: "synthesizer", name: "Synthesizer", stance: "Reconciles the two into a bounded next step." }
];

interface CouncilFixture {
  id: string;
  keywords: string[];
  responses: Record<CouncilPerspective["id"], string>;
}

export const COUNCIL_FIXTURES: CouncilFixture[] = [
  {
    id: "fixture-ship-now",
    keywords: ["ship", "launch", "release"],
    responses: {
      advocate:
        "Shipping now proves the surface end-to-end and unblocks real feedback sooner than another planning pass would.",
      skeptic:
        "Nothing has run against live traffic yet; shipping now risks presenting fixture output as a finished decision.",
      synthesizer:
        "Ship the additive surface behind a flag, label every response illustrative, and gate any wider claim on a real proof run."
    }
  },
  {
    id: "fixture-architecture",
    keywords: ["architecture", "rearchitect", "redesign", "rebuild"],
    responses: {
      advocate: "A cleaner architecture would remove the accumulating flag-per-surface pattern.",
      skeptic:
        "A rearchitect now would touch every existing surface and risks regressing Companion, Teacher, and Durin for no proven need.",
      synthesizer:
        "Keep the existing per-surface flag pattern for this addition; revisit architecture only when a second concrete need appears."
    }
  },
  {
    id: "fixture-scope",
    keywords: ["scope", "expand", "bigger", "more features"],
    responses: {
      advocate: "A broader surface would demonstrate more of what Council could eventually do.",
      skeptic: "Expanding scope now means more untested surface area and more chances to regress an existing route.",
      synthesizer: "Keep this pass to the smallest additive surface; expand only behind a new, explicitly scoped command."
    }
  }
];

export const DEFAULT_DELIBERATION: CouncilDeliberation = {
  question: "",
  matchedFixtureId: "fixture-default",
  illustrative: true,
  responses: [
    {
      perspectiveId: "advocate",
      name: "Advocate",
      stance: PERSPECTIVES[0].stance,
      response: "No fixture matched this question yet; try asking about shipping, architecture, or scope."
    },
    {
      perspectiveId: "skeptic",
      name: "Skeptic",
      stance: PERSPECTIVES[1].stance,
      response: "An unmatched question gets no invented response here on purpose — this surface never calls a live model."
    },
    {
      perspectiveId: "synthesizer",
      name: "Synthesizer",
      stance: PERSPECTIVES[2].stance,
      response: "Try one of the starter prompts, or treat this as the bounded default for anything outside the fixture set."
    }
  ]
};
