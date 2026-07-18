export type CouncilPerspectiveId = "advocate" | "skeptic" | "synthesizer";

export interface CouncilPerspective {
  id: CouncilPerspectiveId;
  name: string;
  stance: string;
}

export interface CouncilResponse {
  perspectiveId: CouncilPerspectiveId;
  name: string;
  stance: string;
  response: string;
}

export interface CouncilDeliberation {
  question: string;
  matchedFixtureId: string;
  responses: CouncilResponse[];
  illustrative: true;
}
