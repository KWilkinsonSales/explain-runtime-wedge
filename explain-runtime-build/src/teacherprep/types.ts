// LDS Teacher Preparation + Presentation Mode — shared type contract.
//
// Two data worlds, never mixed:
//   1. Shared / governed classroom data (PrepDoc, ClassSnapshot) — persisted
//      under the shared store key and eligible for export/print.
//   2. Device-local personal material (PrivateMaterial) — persisted under a
//      separate key, never serialized into shared payloads, never uploaded.

export type BlockKind =
  | "opening"
  | "scripture"
  | "discussion"
  | "explanation"
  | "application"
  | "testimony-bridge";

export interface OfficialSource {
  label: string;
  url: string;
}

export interface ContextualSource {
  label: string;
  url: string;
  // Contextual material must stay visibly subordinate to official sources.
  origin: string;
}

export interface SuggestedBlock {
  kind: BlockKind;
  title: string;
  body: string;
  scriptureRefs: string[];
  // Optional backup used by the Quiet-Class control during Teach.
  quietClassBackup?: string;
}

export interface WeeklyLesson {
  id: string;
  illustrative: boolean;
  title: string;
  weekLabel: string;
  coreTruth: string;
  connectionToChrist: string;
  classContext: string;
  officialSources: OfficialSource[];
  scriptureAnchors: string[];
  suggestedBlocks: SuggestedBlock[];
  learnMore: ContextualSource[];
}

export interface LessonBlock {
  id: string;
  kind: BlockKind;
  title: string;
  body: string;
  scriptureRefs: string[];
  quietClassBackup?: string;
  // Per-item, reversible classroom promotion.
  promoted: boolean;
  // True when this block's text was deliberately promoted from private
  // material after explicit confirmation. Kept visible so it stays reversible.
  fromPrivate: boolean;
  // Set when this block was deliberately promoted from Explore Approved
  // Sources; carries the source's standing so its label stays visible.
  sourceStanding?: "official" | "associated" | "external";
}

export interface PrepDoc {
  lessonId: string;
  // "What does your class need this week?" — the one required sentence.
  intent: string;
  blocks: LessonBlock[];
}

export type TeachCardKind = "title" | "scripture" | "question" | "prompt" | "application";

export interface TeachCard {
  id: string;
  kind: TeachCardKind;
  heading: string;
  body: string;
  reference?: string;
  quietClassBackup?: string;
}

export interface ClassSnapshot {
  id: string;
  createdAt: string;
  lessonId: string;
  lessonTitle: string;
  intent: string;
  cards: TeachCard[];
}

// Device-local only. Optional; the app functions fully without it.
export interface PrivateNote {
  id: string;
  label: string;
  text: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: string;
  context: "prepare" | "after-teach";
}

export interface PrivateMaterial {
  lessonId: string;
  notes: PrivateNote[];
  // Journal / reflections. Device-local like everything else here; absent
  // in older saved state, so consumers must treat it as optional.
  journal?: JournalEntry[];
}
