// ExplainIT governed room registry.
//
// A room definition is a seeded room contract: purpose, authority, admitted
// sources, boundaries, and the governed responses the room is allowed to give.
// This mirrors the RoomContract shape in packages/runtime/src/room-contract —
// purpose/audience/version plus the admission state the room runs against.
// Rooms answer only from their admitted sources; everything else falls back
// deterministically and defers to human review.

export interface AdmittedSource {
  readonly sourceId: string;
  readonly label: string;
  // Descriptive only, per the admission adapter's evidence-quality rule:
  // it annotates the receipt, it never changes room behavior.
  readonly evidenceQuality: string;
  readonly admitted: boolean;
}

export interface GovernedResponse {
  readonly responseId: string;
  // Lowercased terms matched against the normalized question. Matching is
  // pure string containment — no model, no randomness.
  readonly matchTerms: readonly string[];
  readonly answer: string;
  // sourceIds from admittedSources that this answer draws on.
  readonly citedSourceIds: readonly string[];
}

export interface RoomDefinition {
  readonly roomId: string;
  readonly contractVersion: string;
  readonly name: string;
  readonly purpose: string;
  readonly authority: string;
  readonly audience: string;
  readonly admittedSources: readonly AdmittedSource[];
  readonly canDo: readonly string[];
  readonly cannotDo: readonly string[];
  readonly boundaries: readonly string[];
  readonly starterPrompts: readonly string[];
  readonly governedResponses: readonly GovernedResponse[];
  // The deterministic fallback used when no governed response matches.
  readonly fallbackAnswer: string;
  readonly humanReviewNote: string;
  readonly disclaimer: string;
}

export const PLAINTIFF_INTELLIGENCE_ROOM_ID = "plaintiff-intelligence";

const plaintiffIntelligenceRoom: RoomDefinition = {
  roomId: PLAINTIFF_INTELLIGENCE_ROOM_ID,
  contractVersion: "0.1",
  name: "Plaintiff Intelligence",
  purpose:
    "Help you understand what this room already knows about the plaintiff-side matter it was seeded with — the admitted timeline, the admitted documents, and where the matter currently stands.",
  authority:
    "Understanding only. This room explains its admitted sources. It does not advise, decide, predict outcomes, or act on your behalf.",
  audience: "An invited recipient reviewing the seeded plaintiff-side matter.",
  admittedSources: [
    {
      sourceId: "intake-summary",
      label: "Intake interview summary (staff-prepared, redacted)",
      evidenceQuality: "staff summary of a recorded interview; not a verbatim transcript",
      admitted: true
    },
    {
      sourceId: "case-timeline",
      label: "Matter timeline (compiled by case staff, through March)",
      evidenceQuality: "curated chronology; dates verified against filings where available",
      admitted: true
    },
    {
      sourceId: "public-docket",
      label: "Public docket entries (as of last sync)",
      evidenceQuality: "public record; completeness depends on last sync date",
      admitted: true
    },
    {
      sourceId: "discovery-faq",
      label: "Firm explainer: how document discovery works (general)",
      evidenceQuality: "general educational material; not matter-specific",
      admitted: true
    }
  ],
  canDo: [
    "Explain what the admitted sources say, in plain language",
    "Point every answer at the admitted source it came from",
    "Say clearly when a question falls outside its admitted sources",
    "Record a receipt for every exchange so a human can review it"
  ],
  cannotDo: [
    "Give legal advice or predict how the matter will turn out",
    "Answer from anything outside the admitted sources listed here",
    "Take any action — file, send, schedule, or decide",
    "Overrule human review: a person holds final authority over everything said here"
  ],
  boundaries: [
    "This room is not your lawyer and nothing here is legal advice.",
    "Answers come only from the admitted sources; the room refuses to guess beyond them.",
    "Anything unresolved is routed to human review rather than improvised."
  ],
  starterPrompts: [
    "What sources has this room admitted?",
    "Walk me through the timeline of the matter.",
    "How does document discovery work?",
    "What can this room not do?"
  ],
  governedResponses: [
    {
      responseId: "admitted-sources",
      matchTerms: ["source", "admitted", "know about", "what do you know", "evidence"],
      answer:
        "This room has four admitted sources: the staff-prepared intake interview summary, the matter timeline compiled through March, the public docket entries from the last sync, and the firm's general explainer on document discovery. Every answer I give comes from one of those four — nothing else is admitted.",
      citedSourceIds: ["intake-summary", "case-timeline", "public-docket", "discovery-faq"]
    },
    {
      responseId: "matter-timeline",
      matchTerms: ["timeline", "chronology", "when did", "history", "so far"],
      answer:
        "According to the admitted timeline: the intake interview happened first, the complaint appears on the public docket after that, and the most recent admitted entry is the scheduling order. The timeline is compiled through March — anything after that is not in this room, and I won't guess at it.",
      citedSourceIds: ["case-timeline", "public-docket"]
    },
    {
      responseId: "discovery-explainer",
      matchTerms: ["discovery", "documents", "produce", "interrogator"],
      answer:
        "From the firm's general explainer: document discovery is the phase where each side formally requests and exchanges relevant documents. That explainer is general education, not matter-specific — for how discovery applies to this matter, human review is the authority, not this room.",
      citedSourceIds: ["discovery-faq"]
    },
    {
      responseId: "current-status",
      matchTerms: ["status", "stand", "where are we", "docket", "latest"],
      answer:
        "The public docket, as of its last sync, shows the complaint filed and a scheduling order entered. The docket is a public record and may lag; the admitted copy here is only as current as that sync.",
      citedSourceIds: ["public-docket", "case-timeline"]
    },
    {
      responseId: "room-limits",
      matchTerms: ["cannot", "can't", "limits", "not allowed", "advice", "boundar", "what can you do"],
      answer:
        "This room explains its admitted sources and nothing more. It cannot give legal advice, predict outcomes, act on the matter, or answer beyond the four admitted sources. Every exchange is receipted, and a human reviewer holds final authority over all of it.",
      citedSourceIds: ["intake-summary", "case-timeline", "public-docket", "discovery-faq"]
    }
  ],
  fallbackAnswer:
    "That question falls outside this room's admitted sources, so I won't improvise an answer. It has been recorded on the receipt for human review — a person, not this room, decides what happens with it.",
  humanReviewNote: "Routed to human review: outside admitted sources.",
  disclaimer: "Demonstration room with seeded sources. Not legal advice. Human review holds final authority."
};

const ROOMS: readonly RoomDefinition[] = [plaintiffIntelligenceRoom];

export function findRoom(roomId: string): RoomDefinition | null {
  return ROOMS.find((room) => room.roomId === roomId) ?? null;
}

export function listRooms(): readonly RoomDefinition[] {
  return ROOMS;
}
