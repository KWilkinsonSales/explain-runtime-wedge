// Durin Slice 0 — replaceable ThemeProposalProvider (Command 4, bounded).
//
// Providers are PROPOSAL-ONLY by construction: the only spine call
// `applyProposals` ever makes is `proposeAssertion`, so provider output
// enters the same append-only review queue as any manual tag — reviewState
// `proposed`, `approvedForRetrieval` false — and can never choose a lane,
// admit, route, cross, delete, send, or share. Manual tagging (the /durin
// review surface) remains the first-class no-model fallback; the shipped
// provider here is a deterministic keyword table, not a model. A future
// model-backed provider plugs into the same interface with
// method: "model_proposal" and is subject to the exact same gate.
//
// Required provenance is recorded on every proposal: provider name/version
// and method in the generator, and the config (rule-table/prompt) hash plus
// the matched evidence in the evidence pointer.

import type { Actor, PrivacyLane, SourceType, ThemeAssertion, ThemeType } from "./contracts";
import { contentHashOf } from "./sha256";
import type { DurinSpine } from "./spine";

export type ProposalDraft = {
  readonly themeType: ThemeType;
  readonly value: string;
  readonly confidence: number;
  // The exact source-text span the proposal claims as evidence. Drafts
  // whose matchedText does not appear in the derived text are rejected as
  // unsupported claims.
  readonly matchedText: string;
};

export interface ThemeProposalProvider {
  readonly name: string;
  readonly version: string;
  readonly method: "deterministic_rule" | "model_proposal";
  // Hash of the provider's full configuration (rule table or prompt), so a
  // receipt can prove which configuration produced a proposal.
  readonly configHash: string;
  propose(derivedText: string, sourceType: SourceType): readonly ProposalDraft[];
}

// The no-model default: a small, visible keyword→theme rule table.
const KEYWORD_RULES: readonly { keyword: string; themeType: ThemeType; value: string; confidence: number }[] = [
  { keyword: "teach", themeType: "activity", value: "teaching and learning", confidence: 0.7 },
  { keyword: "learn", themeType: "activity", value: "teaching and learning", confidence: 0.7 },
  { keyword: "bake", themeType: "activity", value: "baking together", confidence: 0.6 },
  { keyword: "durin", themeType: "project", value: "Durin intake-router", confidence: 0.8 },
  { keyword: "intake-router", themeType: "project", value: "Durin intake-router", confidence: 0.8 },
  { keyword: "intake router", themeType: "project", value: "Durin intake-router", confidence: 0.8 },
  { keyword: "grandmother", themeType: "provenance", value: "family provenance", confidence: 0.7 },
  { keyword: "grandfather", themeType: "provenance", value: "family provenance", confidence: 0.7 },
  { keyword: "heirloom", themeType: "provenance", value: "family provenance", confidence: 0.7 },
  { keyword: "medication", themeType: "privacy", value: "possible health material — review scope", confidence: 0.6 },
  { keyword: "tradition", themeType: "story_memory", value: "family tradition in the making", confidence: 0.6 }
];

export function createKeywordProvider(): ThemeProposalProvider {
  const configHash = contentHashOf(JSON.stringify(KEYWORD_RULES));
  return {
    name: "durin-keyword-provider",
    version: "0.1.0",
    method: "deterministic_rule",
    configHash,
    propose(derivedText) {
      const lower = derivedText.toLowerCase();
      const drafts: ProposalDraft[] = [];
      const seen = new Set<string>();
      for (const rule of KEYWORD_RULES) {
        const index = lower.indexOf(rule.keyword);
        if (index === -1) continue;
        const key = `${rule.themeType}:${rule.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        drafts.push({
          themeType: rule.themeType,
          value: rule.value,
          confidence: rule.confidence,
          matchedText: derivedText.slice(index, index + rule.keyword.length)
        });
      }
      return drafts;
    }
  };
}

// The explicit no-model/manual fallback: proposes nothing, ever. With this
// provider selected, tagging happens only through the manual review surface.
export const MANUAL_FALLBACK_PROVIDER: ThemeProposalProvider = {
  name: "manual-only",
  version: "0.1.0",
  method: "deterministic_rule",
  configHash: contentHashOf("manual-only: no automatic proposals"),
  propose: () => []
};

export type ApplyProposalsResult = {
  readonly accepted: readonly ThemeAssertion[];
  readonly rejectedDrafts: readonly { readonly draft: ProposalDraft; readonly reason: string }[];
};

// Runs a provider over one derived representation's text and files every
// surviving draft as a PROPOSED assertion. Gate rules:
//   - unsupported claims (matchedText not present in the derived text, or
//     empty) are rejected and reported, never filed;
//   - the privacy scope is the artifact's current disposition lane (or
//     unsorted_holding) — the provider has no lane input and any lane it
//     might smuggle into text changes nothing;
//   - confidence is clamped to [0, 1];
//   - instructions embedded in source text are inert: the provider's output
//     is data that still needs human review (prompt injection cannot
//     approve, route, cross, or delete anything).
export function applyProposals(
  spine: DurinSpine,
  artifactId: string,
  derivedRepresentationId: string,
  derivedText: string,
  provider: ThemeProposalProvider,
  _requestedBy: Actor
): ApplyProposalsResult {
  const lane: PrivacyLane = spine.dispositionFor(artifactId)?.lane ?? "unsorted_holding";
  const sourceType = spine.envelopeFor(spine.getArtifact(artifactId).intakeId)?.sourceType ?? "text_note_export";
  const accepted: ThemeAssertion[] = [];
  const rejectedDrafts: { draft: ProposalDraft; reason: string }[] = [];
  for (const draft of provider.propose(derivedText, sourceType)) {
    const matched = draft.matchedText.trim();
    if (matched.length === 0 || !derivedText.toLowerCase().includes(matched.toLowerCase())) {
      rejectedDrafts.push({ draft, reason: "unsupported claim: evidence text not found in the derived representation" });
      continue;
    }
    const offset = derivedText.toLowerCase().indexOf(matched.toLowerCase());
    const assertion = spine.proposeAssertion({
      sourceArtifactId: artifactId,
      derivedRepresentationId,
      themeType: draft.themeType,
      value: draft.value,
      confidence: Math.min(1, Math.max(0, draft.confidence)),
      evidencePointer: `derived:${derivedRepresentationId}@${offset} "${matched}" [provider=${provider.name}@${provider.version} method=${provider.method} config=${provider.configHash}]`,
      generator: { name: provider.name, version: provider.version, method: provider.method },
      privacyScope: lane
    });
    accepted.push(assertion);
  }
  return { accepted, rejectedDrafts };
}
