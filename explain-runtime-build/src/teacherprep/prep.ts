import type { LessonBlock, PrepDoc, PrivateNote, WeeklyLesson } from "./types";
import { SOURCE_STANDING_LABEL, type ApprovedSource } from "./sources";

// Prepare-state logic. Pure functions over PrepDoc so every rule here is
// provable in node tests: per-item reversible promotion, the explicit
// confirmation gate for private material, and the block ceiling.

// One opening plus at most five lesson blocks.
export const MAX_NON_OPENING_BLOCKS = 5;

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Date.now().toString(36)}`;
}

export function createPrepDoc(lesson: WeeklyLesson): PrepDoc {
  return {
    lessonId: lesson.id,
    intent: "",
    blocks: lesson.suggestedBlocks.map((suggested) => ({
      id: nextId("block"),
      kind: suggested.kind,
      title: suggested.title,
      body: suggested.body,
      scriptureRefs: [...suggested.scriptureRefs],
      quietClassBackup: suggested.quietClassBackup,
      promoted: false,
      fromPrivate: false
    }))
  };
}

export function setIntent(doc: PrepDoc, intent: string): PrepDoc {
  return { ...doc, intent };
}

export function editBlockBody(doc: PrepDoc, blockId: string, body: string): PrepDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => (block.id === blockId ? { ...block, body } : block))
  };
}

export function removeBlock(doc: PrepDoc, blockId: string): PrepDoc {
  return { ...doc, blocks: doc.blocks.filter((block) => block.id !== blockId) };
}

// Routine prepared blocks: one tap, immediate, reversible per item.
export function setBlockPromoted(doc: PrepDoc, blockId: string, promoted: boolean): PrepDoc {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => (block.id === blockId ? { ...block, promoted } : block))
  };
}

export function promotedBlocks(doc: PrepDoc): LessonBlock[] {
  return doc.blocks.filter((block) => block.promoted);
}

export function countNonOpeningBlocks(doc: PrepDoc): number {
  return doc.blocks.filter((block) => block.kind !== "opening").length;
}

export class PrivatePromotionNotConfirmedError extends Error {
  constructor() {
    super("Promoting private material requires explicit confirmation.");
    this.name = "PrivatePromotionNotConfirmedError";
  }
}

// Private material crosses into classroom data only through this function,
// and only with confirmed: true. The result is an ordinary visible block
// flagged fromPrivate, so the crossing stays reversible (remove the block
// or demote it) and never silent.
export function promotePrivateNote(
  doc: PrepDoc,
  note: PrivateNote,
  options: { confirmed: boolean }
): PrepDoc {
  if (options.confirmed !== true) throw new PrivatePromotionNotConfirmedError();
  const block: LessonBlock = {
    id: nextId("block"),
    kind: "discussion",
    title: note.label || "Shared from my notes",
    body: note.text,
    scriptureRefs: [],
    promoted: true,
    fromPrivate: true
  };
  return { ...doc, blocks: [...doc.blocks, block] };
}

export class SourcePromotionNotConfirmedError extends Error {
  constructor() {
    super("Promoting associated or external material requires explicit confirmation.");
    this.name = "SourcePromotionNotConfirmedError";
  }
}

// Explore Approved Sources → class content only through this deliberate
// call. Official items promote on a deliberate tap; associated/external
// items additionally require confirmed: true so nothing outside the
// official sources ever slips into Teach silently. The resulting block is
// visible, editable, labeled with its standing, and reversible like any
// other block.
export function promoteSourceToClass(
  doc: PrepDoc,
  source: ApprovedSource,
  options: { confirmed?: boolean } = {}
): PrepDoc {
  if (source.standing !== "official" && options.confirmed !== true) {
    throw new SourcePromotionNotConfirmedError();
  }
  const block: LessonBlock = {
    id: nextId("block"),
    kind: source.standing === "official" ? "scripture" : "explanation",
    title: `${source.title} · ${SOURCE_STANDING_LABEL[source.standing]}`,
    body: source.relevanceNote,
    scriptureRefs: [],
    promoted: true,
    fromPrivate: false,
    sourceStanding: source.standing
  };
  return { ...doc, blocks: [...doc.blocks, block] };
}
