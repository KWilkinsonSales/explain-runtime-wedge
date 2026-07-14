// Durin Slice 0 — deterministic meaning retrieval (Command 4).
//
// Retrieval runs over APPROVED ThemeAssertions and safe source metadata,
// through a bounded, deterministic query-mapping table — no embeddings, no
// model, no cloud vectors. Every rule that fires is recorded in the plan's
// `mapping` so the operator can see exactly how their words became a query,
// and every result lists the causal assertions that made it match.
//
// Enforcement (delegated to the spine's lane gate, then re-checked here):
//   - only approved, retrievable, non-restricted assertions drive ordinary
//     retrieval (rejected / superseded / uncertain / proposed never do);
//   - restricted_health_legal is not an ordinary scope and never leaks into
//     private/family results;
//   - family/private material cannot appear in adl_business scope without
//     an explicitly approved crossing;
//   - an empty or unmappable query fails closed with narrowing suggestions
//     instead of guessing.

import {
  ORDINARY_RETRIEVAL_LANES,
  type Actor,
  type PrivacyLane,
  type SourceState,
  type SourceType,
  type ThemeAssertion
} from "./contracts";
import type { DurinSpine } from "./spine";

export const RETRIEVAL_VERSION = "0.1.0";

export type QueryPlan = {
  readonly scopeLanes: readonly PrivacyLane[]; // always a subset of ORDINARY_RETRIEVAL_LANES
  readonly includeTerms: readonly string[];
  readonly excludeTerms: readonly string[];
  readonly sourceTypeFilter: readonly SourceType[];
  readonly requireApprovedProvenance: boolean;
  readonly excludeSaleApproved: boolean;
  readonly unresolvedOnly: boolean;
};

export type ParsedQuery =
  | { readonly ok: true; readonly plan: QueryPlan; readonly mapping: readonly string[] }
  | { readonly ok: false; readonly reason: string; readonly suggestions: readonly string[] };

// The bounded mapping table. Each entry is a deterministic regexp rule with
// a human-readable explanation of what it contributes to the plan.
type MutablePlan = {
  scopeLanes: Set<PrivacyLane>;
  includeTerms: Set<string>;
  excludeTerms: Set<string>;
  sourceTypeFilter: Set<SourceType>;
  requireApprovedProvenance: boolean;
  excludeSaleApproved: boolean;
  unresolvedOnly: boolean;
};

const RULES: readonly { pattern: RegExp; explain: string; apply: (plan: MutablePlan) => void }[] = [
  {
    pattern: /family (photo|memor|picture)/,
    explain: 'scope += family_memory ("family photo/memory")',
    apply: (plan) => void plan.scopeLanes.add("family_memory")
  },
  {
    pattern: /\bphoto|picture\b/,
    explain: 'source type filter += photos ("photo")',
    apply: (plan) => {
      plan.sourceTypeFilter.add("family_photo");
      plan.sourceTypeFilter.add("object_photo");
    }
  },
  {
    pattern: /teach|learn/,
    explain: 'terms += teach, learn ("teaching or learning")',
    apply: (plan) => {
      plan.includeTerms.add("teach");
      plan.includeTerms.add("learn");
    }
  },
  {
    pattern: /\bobject|heirloom|garage/,
    explain: 'scope += object_archive ("object/heirloom")',
    apply: (plan) => void plan.scopeLanes.add("object_archive")
  },
  {
    pattern: /provenance/,
    explain: "require an APPROVED provenance assertion",
    apply: (plan) => {
      plan.requireApprovedProvenance = true;
      plan.includeTerms.add("provenance");
    }
  },
  {
    pattern: /not (items? )?(approved )?for sale|exclud\w* .*sale|, not .*sale/,
    explain: "exclude artifacts with an approved sell intent",
    apply: (plan) => void (plan.excludeSaleApproved = true)
  },
  {
    pattern: /private|founder reflection|journal/,
    explain: 'scope += private_journal ("private/founder reflections")',
    apply: (plan) => {
      plan.scopeLanes.add("private_journal");
      plan.includeTerms.add("reflection");
    }
  },
  {
    pattern: /exclude health|without health|no health|not health/,
    explain: "health exclusion confirmed (restricted_health_legal is ALWAYS excluded from ordinary retrieval)",
    apply: () => undefined
  },
  {
    pattern: /faith|church|study lesson/,
    explain: 'scope += faith_study ("faith/church study")',
    apply: (plan) => void plan.scopeLanes.add("faith_study")
  },
  {
    pattern: /durin|intake[- ]router/,
    explain: 'terms += durin, intake-router; scope += every ordinary lane (idea search spans the operator\'s own lanes)',
    apply: (plan) => {
      plan.includeTerms.add("durin");
      plan.includeTerms.add("intake-router");
      for (const lane of ORDINARY_RETRIEVAL_LANES) plan.scopeLanes.add(lane);
    }
  },
  {
    pattern: /unresolved|unsorted|holding|pending review|still open/,
    explain: "status query: held sources, unresolved questions, uncertain assertions (ordinary lanes only)",
    apply: (plan) => {
      plan.unresolvedOnly = true;
      plan.scopeLanes.add("unsorted_holding");
    }
  },
  {
    pattern: /\badl\b|business/,
    explain: 'scope += adl_business ("business") — family/private appear here only via an approved crossing',
    apply: (plan) => void plan.scopeLanes.add("adl_business")
  }
];

export function parseQuery(queryText: string): ParsedQuery {
  const text = queryText.trim().toLowerCase();
  if (text.length === 0) {
    return { ok: false, reason: "empty query", suggestions: ["name a lane, a theme, or ask for unresolved records"] };
  }
  const plan: MutablePlan = {
    scopeLanes: new Set(),
    includeTerms: new Set(),
    excludeTerms: new Set(),
    sourceTypeFilter: new Set(),
    requireApprovedProvenance: false,
    excludeSaleApproved: false,
    unresolvedOnly: false
  };
  const mapping: string[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      rule.apply(plan);
      mapping.push(rule.explain);
    }
  }

  // Restricted material is never an ordinary scope, whatever the words said.
  plan.scopeLanes.delete("restricted_health_legal" as PrivacyLane);

  if (mapping.length === 0) {
    // Fail closed: no bounded rule matched, so we refuse to guess a scope.
    return {
      ok: false,
      reason: "ambiguous scope: no bounded query rule matched; narrowing required",
      suggestions: [
        "mention a lane (family, private journal, object archive, business, faith)",
        "mention a theme (teaching, provenance, a project name)",
        'ask for "unresolved or unsorted" records'
      ]
    };
  }
  if (plan.scopeLanes.size === 0 && !plan.unresolvedOnly) {
    // Terms without any lane cue: search the operator's own ordinary lanes,
    // explicitly recorded in the mapping (still lane-gated per lane).
    for (const lane of ORDINARY_RETRIEVAL_LANES) plan.scopeLanes.add(lane);
    mapping.push("no lane cue: scanning every ordinary lane (restricted always excluded)");
  }
  return {
    ok: true,
    plan: {
      scopeLanes: [...plan.scopeLanes],
      includeTerms: [...plan.includeTerms],
      excludeTerms: [...plan.excludeTerms],
      sourceTypeFilter: [...plan.sourceTypeFilter],
      requireApprovedProvenance: plan.requireApprovedProvenance,
      excludeSaleApproved: plan.excludeSaleApproved,
      unresolvedOnly: plan.unresolvedOnly
    },
    mapping
  };
}

export type RetrievalMatch = {
  readonly artifactId: string;
  readonly intakeId: string;
  readonly sourceType: SourceType;
  readonly filename: string;
  readonly sourceUri: string;
  readonly lane: PrivacyLane;
  readonly sourceState: SourceState;
  readonly receiptId: string | null;
  // The causal assertions: exactly the approved (or, for status queries,
  // uncertain) assertions that made this result match.
  readonly matchedAssertions: readonly {
    readonly assertionId: string;
    readonly themeType: ThemeAssertion["themeType"];
    readonly value: string;
    readonly reviewState: ThemeAssertion["reviewState"];
    readonly confidence: number;
    readonly evidencePointer: string;
  }[];
  readonly whyMatched: readonly string[];
};

export type RetrievalResponse =
  | {
      readonly ok: true;
      readonly retrievalVersion: string;
      readonly plan: QueryPlan;
      readonly mapping: readonly string[];
      readonly results: readonly RetrievalMatch[];
    }
  | { readonly ok: false; readonly reason: string; readonly suggestions: readonly string[] };

function toMatchedAssertion(assertion: ThemeAssertion) {
  return {
    assertionId: assertion.assertionId,
    themeType: assertion.themeType,
    value: assertion.value,
    reviewState: assertion.reviewState,
    confidence: assertion.confidence,
    evidencePointer: assertion.evidencePointer
  };
}

export function retrieve(spine: DurinSpine, queryText: string, actor: Actor): RetrievalResponse {
  const parsed = parseQuery(queryText);
  if (!parsed.ok) return parsed;
  const { plan, mapping } = parsed;

  const receiptsByIntake = new Map<string, string>();
  for (const receipt of spine.listReceipts()) receiptsByIntake.set(receipt.intakeId, receipt.receiptId);

  const results = new Map<string, RetrievalMatch>();

  const addResult = (
    artifactId: string,
    lane: PrivacyLane,
    matched: ThemeAssertion[],
    why: string[]
  ): void => {
    const artifact = spine.listArtifacts().find((candidate) => candidate.artifactId === artifactId);
    if (!artifact) return;
    const envelope = spine.envelopeFor(artifact.intakeId);
    if (!envelope) return;
    if (plan.sourceTypeFilter.length > 0 && !plan.sourceTypeFilter.includes(envelope.sourceType)) return;
    const existing = results.get(artifactId);
    if (existing) {
      results.set(artifactId, {
        ...existing,
        matchedAssertions: dedupeAssertions([...existing.matchedAssertions, ...matched.map(toMatchedAssertion)]),
        whyMatched: [...new Set([...existing.whyMatched, ...why])]
      });
      return;
    }
    results.set(artifactId, {
      artifactId,
      intakeId: artifact.intakeId,
      sourceType: envelope.sourceType,
      filename: artifact.originalFilename,
      sourceUri: envelope.sourceUri,
      lane,
      sourceState: artifact.state,
      receiptId: receiptsByIntake.get(artifact.intakeId) ?? null,
      matchedAssertions: dedupeAssertions(matched.map(toMatchedAssertion)),
      whyMatched: [...new Set(why)]
    });
  };

  if (plan.unresolvedOnly) {
    // Status query: held sources, dispositions with unresolved questions,
    // and uncertain assertions — ordinary lanes only, restricted never shown.
    for (const artifact of spine.listArtifacts()) {
      const disposition = spine.dispositionFor(artifact.artifactId);
      const lane = disposition?.lane ?? "unsorted_holding";
      if (!ORDINARY_RETRIEVAL_LANES.includes(lane)) continue;
      const why: string[] = [];
      const matched: ThemeAssertion[] = [];
      if (artifact.state === "held") why.push("source is held in unsorted holding");
      if (disposition && disposition.unresolvedQuestions.length > 0) {
        why.push(`disposition has unresolved questions: ${disposition.unresolvedQuestions.join("; ")}`);
      }
      for (const assertion of spine.assertionsFor(artifact.artifactId)) {
        if (assertion.reviewState === "uncertain" && assertion.privacyScope !== "restricted_health_legal") {
          matched.push(assertion);
          why.push(`assertion ${assertion.assertionId} (${assertion.themeType}: "${assertion.value}") is marked uncertain`);
        }
      }
      if (why.length > 0) addResult(artifact.artifactId, lane, matched, why);
    }
  } else {
    for (const lane of plan.scopeLanes) {
      if (!ORDINARY_RETRIEVAL_LANES.includes(lane)) continue; // restricted can never be scanned here
      // The spine's lane gate: approved + retrievable + non-restricted, and
      // cross-lane visibility only via an explicitly approved crossing
      // (denials are audited inside the spine).
      const visible = spine.queryAssertions(lane, actor);
      for (const assertion of visible) {
        const terms = plan.includeTerms.filter(
          (term) =>
            assertion.value.toLowerCase().includes(term) ||
            assertion.themeType.toLowerCase().includes(term.replace(/\s+/g, "_"))
        );
        if (plan.includeTerms.length > 0 && terms.length === 0) continue;
        if (plan.excludeTerms.some((term) => assertion.value.toLowerCase().includes(term))) continue;
        const why =
          terms.length > 0
            ? terms.map(
                (term) =>
                  `approved assertion ${assertion.assertionId} (${assertion.themeType}: "${assertion.value}") contains "${term}"`
              )
            : [`approved assertion ${assertion.assertionId} (${assertion.themeType}: "${assertion.value}") is in scope ${lane}`];
        addResult(assertion.sourceArtifactId, lane, [assertion], why);
      }
      // Source metadata is also retrievable surface: filename and type.
      if (plan.includeTerms.length > 0) {
        for (const artifact of spine.listArtifacts()) {
          const disposition = spine.dispositionFor(artifact.artifactId);
          if (disposition?.lane !== lane) continue;
          const hits = plan.includeTerms.filter((term) => artifact.originalFilename.toLowerCase().includes(term));
          if (hits.length > 0) {
            addResult(
              artifact.artifactId,
              lane,
              [],
              hits.map((term) => `source metadata: filename "${artifact.originalFilename}" contains "${term}"`)
            );
          }
        }
      }
    }
  }

  // Post-filters that need the whole artifact picture.
  let finalResults = [...results.values()];
  if (plan.requireApprovedProvenance) {
    finalResults = finalResults.filter((result) =>
      spine
        .assertionsFor(result.artifactId)
        .some((assertion) => assertion.themeType === "provenance" && assertion.reviewState === "approved")
    );
  }
  if (plan.excludeSaleApproved) {
    finalResults = finalResults.filter(
      (result) =>
        !spine
          .assertionsFor(result.artifactId)
          .some(
            (assertion) =>
              assertion.themeType === "purpose_intended_use" &&
              assertion.reviewState === "approved" &&
              assertion.value.toLowerCase().includes("sell")
          )
    );
  }

  return {
    ok: true,
    retrievalVersion: RETRIEVAL_VERSION,
    plan,
    mapping,
    results: finalResults.sort((a, b) => a.artifactId.localeCompare(b.artifactId))
  };
}

function dedupeAssertions(
  entries: readonly ReturnType<typeof toMatchedAssertion>[]
): readonly ReturnType<typeof toMatchedAssertion>[] {
  const seen = new Map<string, ReturnType<typeof toMatchedAssertion>>();
  for (const entry of entries) seen.set(entry.assertionId, entry);
  return [...seen.values()];
}
