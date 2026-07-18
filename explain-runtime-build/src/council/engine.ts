import { COUNCIL_FIXTURES, DEFAULT_DELIBERATION, PERSPECTIVES } from "./fixtures";
import type { CouncilDeliberation } from "./types";

// Deterministic, keyword-matched deliberation. No network calls, no
// randomness, no live model: given the same question, this always returns
// the same deliberation, drawn only from COUNCIL_FIXTURES.
export function deliberate(question: string): CouncilDeliberation {
  const normalized = question.trim().toLowerCase();

  if (normalized.length === 0) {
    return { ...DEFAULT_DELIBERATION, question };
  }

  const matched = COUNCIL_FIXTURES.find((fixture) =>
    fixture.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (!matched) {
    return { ...DEFAULT_DELIBERATION, question };
  }

  return {
    question,
    matchedFixtureId: matched.id,
    illustrative: true,
    responses: PERSPECTIVES.map((perspective) => ({
      perspectiveId: perspective.id,
      name: perspective.name,
      stance: perspective.stance,
      response: matched.responses[perspective.id]
    }))
  };
}
